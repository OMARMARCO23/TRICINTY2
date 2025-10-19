import { GoogleGenerativeAI } from "@google/generative-ai";

async function readBody(req) {
  if (req.body && Object.keys(req.body).length) return req.body;
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
  });
}

export default async function handler(req, res) {
  // CORS preflight (safe even if same-origin on Vercel)
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
      console.error("AI error: Missing GEMINI_API_KEY");
      return res.status(500).json({ code: "MISSING_API_KEY", message: "Server is missing Gemini API key. Set GEMINI_API_KEY in Vercel." });
    }

    const { chatHistory, usageData, language } = await readBody(req);
    if (!chatHistory || !usageData) {
      return res.status(400).json({ code: "BAD_REQUEST", message: "Missing chatHistory or usageData" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() || "";

    if (!text) {
      console.error("AI error: Empty response");
      return res.status(502).json({ code: "EMPTY_RESPONSE", message: "AI returned an empty response. Try again shortly." });
    }

    return res.status(200).json({ message: text });
  } catch (err) {
    console.error("AI route error:", err);
    const msg = err?.message || "Unknown AI error";
    return res.status(500).json({ code: "AI_ERROR", message: `AI error: ${msg}` });
  }
}
