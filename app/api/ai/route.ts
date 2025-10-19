import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs"; // ensure Node runtime

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "Gemini API key is not set on the server." }, { status: 500 });
    }

    const body = await req.json();
    const { chatHistory, usageData, language } = body as {
      chatHistory: Array<{ role: "user" | "model"; parts: { text: string }[] }>;
      usageData: { avgDailyUsage: string; currentUsage: string; predictedBill: string; goal: string };
      language: "en" | "fr" | "ar";
    };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const lastUser = chatHistory.filter((m) => m.role === "user").slice(-1)[0]?.parts?.[0]?.text ?? "";

    const prompt = `
You are "Tricinty", an expert AI energy coach in a smart energy app.
User language: ${language}. Respond ONLY in ${language}. Keep answers concise (2-4 sentences).

User data:
- Avg daily usage: ${usageData.avgDailyUsage} kWh
- Current month usage: ${usageData.currentUsage} kWh
- Predicted bill: ${usageData.predictedBill}
- Monthly goal: ${usageData.goal}

Conversation so far: ${JSON.stringify(chatHistory)}
User's latest message: "${lastUser}"

Guidelines:
- If usage is high vs goal, mention it and suggest likely causes (heating/cooling, water heating, fridge, standby).
- Provide practical, low-cost tips tailored to the data and context.
- If progress is good, acknowledge it and encourage consistency.
- No markdown. Plain sentences only.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ message: text });
  } catch (err: any) {
    console.error("AI route error:", err);
    return NextResponse.json({ message: "Sorry, I'm having trouble thinking right now. Please try again." }, { status: 500 });
  }
}
