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
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.json({ message: "Only POST requests are allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      return res.json({ message: "Gemini API key is not set on the server." });
    }

    const { chatHistory, usageData, language } = await readBody(req);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are "Tricinty", an expert AI energy coach for a smart energy app.
User language: ${language}. Answer ONLY in ${language}. Keep replies concise (2-4 sentences), plain text.

Current month status:
- Avg daily usage: ${usageData?.avgDailyUsage} kWh
- Usage so far: ${usageData?.currentUsage} kWh
- Days left: ${usageData?.daysLeft}
- Predicted bill if pace continues: ${usageData?.predictedBill}
- Monthly goal: ${usageData?.goal}
- Daily target to stay under goal: ${usageData?.dailyTarget ?? 'N/A'} kWh
- kWh left before next price tier: ${usageData?.kwhToNextTier}
- Currency: ${usageData?.currency}

Conversation so far: ${JSON.stringify(chatHistory || [])}

Guidelines:
- If days left are few and user is close to the next tier, warn and suggest specific actions to avoid crossing.
- Use the daily target to give actionable numeric guidance for the rest of the month.
- If asked "why high?", propose 2-3 likely causes (HVAC/heating, water heater, fridge door/seal, standby devices).
- Offer simple low-cost tips (thermostat 1-2°, off-peak times, LEDs, drying racks, shorter showers).
- No markdown, plain sentences only.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({ message: text });
  } catch (err) {
    console.error("AI route error:", err);
    return res.status(500).json({ message: "Sorry, I'm having trouble thinking right now. Please try again." });
  }
}
