import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import {
  calculateBillByMode,
  computeTrendDailyKwh,
  kwhToNextTier,
  dailyTargetForBudget,
  detectSpike
} from '../lib/calculations.js';
import { Loader, Send, Sparkles, FileText } from 'lucide-react';
import BillScanner from '../components/BillScanner.jsx';
import { tFactory } from '../i18n/index.js';
import { API_BASE } from '../config.js';

export default function AiCoach() {
  const { readings, settings, chatHistory, setChatHistory } = useContext(AppContext);
  const t = tFactory(settings.language);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const quickPrompts = [
    t('coach.prompt1'),
    t('coach.prompt2'),
    t('coach.prompt3'),
    t('coach.prompt4')
  ];

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', parts: [{ text: input.trim() }] };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setInput('');
    setLoading(true);

    const {
      currentUsage,
      rawAvgDaily,
      trendDaily,
      predictedUsage,
      daysInMonth,
      daysSoFar,
      daysLeft
    } = computeTrendDailyKwh(readings);

    const predicted = calculateBillByMode(predictedUsage, settings.tariffs, settings.tariffMode);
    const toNextTier = kwhToNextTier(currentUsage, settings.tariffs);
    const { dailyTarget } = dailyTargetForBudget(
      Number(settings.goal) || 0,
      settings.tariffs,
      daysInMonth,
      currentUsage,
      daysSoFar
    );

    const spike = detectSpike(readings);
    const lastRate = Number((spike.lastRate || 0).toFixed(2));
    const baselineRate = Number((spike.baselineRate || 0).toFixed(2));
    const changePct = Number((spike.changePct || 0).toFixed(1));

    const usageData = {
      avgDailyUsage: trendDaily.toFixed(2),
      avgDailyTrend: trendDaily.toFixed(2),
      avgDailySoFar: rawAvgDaily.toFixed(2),
      currentUsage: currentUsage.toFixed(2),
      predictedBill: `${predicted.bill} ${predicted.currency}`,
      goal: `${settings.goal} ${settings.tariffs.currency}`,
      currency: settings.tariffs.currency,
      daysLeft,
      kwhToNextTier: Number.isFinite(toNextTier) ? Number(toNextTier.toFixed(0)) : 'Infinity',
      dailyTarget,
      lastRate,
      baselineRate,
      changePct
    };

    try {
      const res = await fetch(`${API_BASE}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: newHistory, usageData, language: settings.language })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'AI error');

      const aiMsg = { role: 'model', parts: [{ text: data.message }] };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      const fallback = { role: 'model', parts: [{ text: err?.message || "AI is unavailable. Please try again shortly." }] };
      setChatHistory((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Bill scan action */}
      <div className="p-2 flex items-center gap-2">
        <button className="btn btn-outline btn-sm" onClick={() => setBillOpen(true)}>
          <FileText size={16} /> <span className="ml-1">{t('coach.scanBill')}</span>
        </button>
      </div>

      {/* Quick prompts */}
      <div className="p-2 flex flex-wrap gap-2">
        {quickPrompts.map((q, i) => (
          <button
            key={i}
            className="btn btn-xs btn-outline"
            onClick={() => { setInput(q); setTimeout(() => send(new Event('submit')), 0); }}
            disabled={loading}
          >
            <Sparkles size={14} /> <span className="ml-1">{q}</span>
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="flex-grow p-2 space-y-3 overflow-y-auto">
        {chatHistory.map((m, i) => (
          <div key={i} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
            <div className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-primary' : ''}`}>
              {m.parts?.[0]?.text || ''}
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

      {/* Input bar */}
      <form onSubmit={send} className="p-2 bg-base-100 flex gap-2">
        <input
          className="input input-bordered w-full"
          placeholder={t('coach.inputPH')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <Loader className="animate-spin" /> : <Send />}
        </button>
      </form>

      {/* Bill Scanner Modal */}
      <dialog id="scan_bill_modal" className={`modal ${billOpen ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t('coach.scanBill')}</h3>
          <BillScanner
            onParsed={(parsed, rawText) => {
              if (parsed?.totalAmount || parsed?.totalKwh) {
                const summary = `Bill scan: ${parsed.provider || '—'}, ${parsed.periodStart || '—'} → ${parsed.periodEnd || '—'}, kWh ${parsed.totalKwh ?? '—'}, amount ${parsed.totalAmount ?? '—'} ${parsed.currency || ''}.`;
                setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: summary }] }]);
              }
            }}
            onClose={() => setBillOpen(false)}
          />
          <div className="modal-action">
            <button className="btn" onClick={() => setBillOpen(false)}>Close</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
