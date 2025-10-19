import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import {
  calculateBill,
  computeTrendDailyKwh,
  kwhToNextTier,
  dailyTargetForBudget
} from '../lib/calculations.js';
import { Loader, Send } from 'lucide-react';

export default function AiCoach() {
  const { readings, settings, chatHistory, setChatHistory } = useContext(AppContext);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', parts: [{ text: input }] };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setInput('');
    setLoading(true);

    // Trend-based usage data
    const { currentUsage, rawAvgDaily, trendDaily, predictedUsage, daysInMonth, daysSoFar, daysLeft } =
      computeTrendDailyKwh(readings);

    const predicted = calculateBill(predictedUsage, settings.tariffs);
    const toNextTier = kwhToNextTier(currentUsage, settings.tariffs);
    const { dailyTarget } = dailyTargetForBudget(
      Number(settings.goal) || 0,
      settings.tariffs,
      daysInMonth,
      currentUsage,
      daysSoFar
    );

    const usageData = {
      avgDailyUsage: trendDaily.toFixed(2), // keep legacy key for compatibility
      avgDailyTrend: trendDaily.toFixed(2),
      avgDailySoFar: rawAvgDaily.toFixed(2),
      currentUsage: currentUsage.toFixed(2),
      predictedBill: `${predicted.bill} ${predicted.currency}`,
      goal: `${settings.goal} ${settings.tariffs.currency}`,
      currency: settings.tariffs.currency,
      daysLeft,
      kwhToNextTier: Number.isFinite(toNextTier) ? Number(toNextTier.toFixed(0)) : 'Infinity',
      dailyTarget
    };

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: newHistory, usageData, language: settings.language })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'AI error');
      const aiMsg = { role: 'model', parts: [{ text: data.message }] };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      const fallback = { role: 'model', parts: [{ text: err?.message || "Sorry, I couldn't connect. Try again later." }] };
      setChatHistory((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-grow p-2 space-y-3 overflow-y-auto">
        {chatHistory.map((m, i) => (
          <div key={i} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
            <div className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-primary' : ''}`}>
              {m.parts[0].text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat chat-start">
            <div className="chat-bubble"><span className="loading loading-dots loading-md" /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="p-2 bg-base-100 flex gap-2">
        <input
          className="input input-bordered w-full"
          placeholder="Ask how to reduce your bill..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <Loader className="animate-spin" /> : <Send />}
        </button>
      </form>
    </div>
  );
}
