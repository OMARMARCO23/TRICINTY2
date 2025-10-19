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

    const lastUser = (chatHistory || []).filter(m => m.role === "user").slice(-1)[0]?.parts?.[0]?.text || "";

    const prompt = `
You are "Tricinty", an expert AI energy coach in a smart energy app.
User language: ${language}. Respond ONLY in ${language}. Keep answers concise (2-4 sentences).

User data:
- Avg daily usage: ${usageData?.avgDailyUsage} kWh
- Current month usage: ${usageData?.currentUsage} kWh
- Predicted bill: ${usageData?.predictedBill}
- Monthly goal: ${usageData?.goal}

Conversation so far: ${JSON.stringify(chatHistory || [])}
User's latest message: "${lastUser}"

Guidelines:
- If usage is high vs goal, mention it and suggest likely causes (HVAC, water heater, fridge, standby).
- Provide practical, low-cost tips tailored to the data and context.
- If progress is good, acknowledge it and encourage consistency.
- No markdown. Plain sentences only.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({ message: text });
  } catch (err) {
    console.error("AI route error:", err);
    return res.status(500).json({ message: "Sorry, I'm having trouble thinking right now. Please try again." });
  }
}
