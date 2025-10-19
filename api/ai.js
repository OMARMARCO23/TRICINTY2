// Serverless AI endpoint using Google Generative Language API v1 via fetch (no client SDK)

async function readBody(req) {
  if (req.body && Object.keys(req.body).length) return req.body;
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
  });
}

async function callModel(model, prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    }),
  });
  const json = await resp.json();
  if (!resp.ok) {
    const err = json?.error?.message || `${resp.status} ${resp.statusText}`;
    throw new Error(err);
  }
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const txt = parts.map(p => p.text).join("").trim();
  if (!txt) throw new Error("Empty response from model");
  return txt;
}

export default async function handler(req, res) {
  // Optional CORS for future multi-origin use
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "Only POST requests are allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ code: "MISSING_API_KEY", message: "Set GEMINI_API_KEY in Vercel project settings." });
    }

    const { chatHistory, usageData, language } = await readBody(req);
    if (!chatHistory || !usageData) {
      return res.status(400).json({ code: "BAD_REQUEST", message: "Missing chatHistory or usageData" });
    }

    const prompt = `
You are "Tricinty", an expert AI energy coach for a smart energy app.
User language: ${language}. Answer ONLY in ${language}. Keep replies concise (2-4 sentences), plain text.

Current month status:
- Daily trend (recent): ${usageData?.avgDailyTrend || usageData?.avgDailyUsage} kWh/day
- Avg daily so far (raw): ${usageData?.avgDailySoFar || 'N/A'} kWh/day
- Usage so far: ${usageData?.currentUsage} kWh
- Days left: ${usageData?.daysLeft}
- Predicted bill if pace continues: ${usageData?.predictedBill}
- Monthly goal: ${usageData?.goal}
- Daily target to stay under goal: ${usageData?.dailyTarget ?? 'N/A'} kWh
- kWh left before next price tier: ${usageData?.kwhToNextTier}
- Currency: ${usageData?.currency}

Conversation so far: ${JSON.stringify(chatHistory || [])}

Guidelines:
- Use the daily trend for projections and give numeric, actionable tips.
- If close to a higher tier or over daily target, warn and suggest specific actions to avoid crossing (HVAC, water heater, fridge seal, standby devices).
- If asked "why high?", suggest 2-3 likely causes based on season and common appliances.
- Encourage low-cost actions (thermostat 1-2°, off-peak usage, LEDs, shorter showers, air-dry laundry).
- No markdown, plain sentences only.
`;

    // Try in order. v1 supports these. We fall back if a model is not enabled for the key/region.
    const models = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro"
    ];

    let answer = "";
    let lastErr = null;
    for (const m of models) {
      try {
        answer = await callModel(m, prompt, apiKey);
        break;
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    if (!answer) {
      return res.status(502).json({ code: "MODEL_ERROR", message: `AI error: ${lastErr?.message || "Unknown"}` });
    }

    return res.status(200).json({ message: answer });
  } catch (err) {
    return res.status(500).json({ code: "AI_ERROR", message: `AI error: ${err?.message || "Unknown"}` });
  }
}
