import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import { calculateBill, getMonthBoundaries } from '../lib/calculations.js';
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

    const { start, daysSoFar, daysInMonth } = getMonthBoundaries();
    const readingsThisMonth = readings.filter(r => new Date(r.date) >= start);
    const firstValue = readingsThisMonth[0]?.value ?? readings[0]?.value ?? 0;
    const last = readings[readings.length - 1]?.value ?? firstValue;
    const currentUsage = Math.max(last - firstValue, 0);

    const avgDaily = currentUsage > 0 && daysSoFar > 0 ? currentUsage / daysSoFar : 0;
    const predictedUsage = avgDaily * daysInMonth;
    const predicted = calculateBill(predictedUsage, settings.tariffs);

    const usageData = {
      avgDailyUsage: avgDaily.toFixed(2),
      currentUsage: currentUsage.toFixed(2),
      predictedBill: `${predicted.bill} ${predicted.currency}`,
      goal: `${settings.goal} ${settings.tariffs.currency}`
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
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      const fallback = { role: 'model', parts: [{ text: err?.message || "Sorry, I couldn't connect. Try again later." }] };
      setChatHistory(prev => [...prev, fallback]);
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
