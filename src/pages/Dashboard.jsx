import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import {
  calculateBillByMode,
  computeTrendDailyKwh,
  kwhToNextTier,
  dailyTargetForBudget,
  forecastBand,
  detectSpike,
  dailyIncrements
} from '../lib/calculations.js';
import { CircleDollarSign, Zap, TrendingUp, Plus, Activity, RefreshCcw, AlertTriangle, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Dashboard() {
  const { readings, setReadings, settings } = useContext(AppContext);
  const [newReading, setNewReading] = useState('');
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState('');

  // Trend + prediction based on counter readings
  const {
    currentUsage,
    rawAvgDaily,
    trendDaily,
    predictedUsage,
    daysInMonth,
    daysSoFar,
    daysLeft
  } = computeTrendDailyKwh(readings);

  const actual = calculateBillByMode(currentUsage, settings.tariffs, settings.tariffMode);
  const predicted = calculateBillByMode(predictedUsage, settings.tariffs, settings.tariffMode);
  const band = forecastBand(predictedUsage, settings.tariffs, settings.tariffMode, 0.10);
  const toNextTier = kwhToNextTier(currentUsage, settings.tariffs);

  // Spike detection and trend change
  const spike = detectSpike(readings);
  const inc = dailyIncrements(readings);
  const lastRate = spike.lastRate || 0;
  const baselineRate = spike.baselineRate || 0;
  const changePct = spike.changePct || 0;
  const trendUp = changePct >= 5; // small threshold for arrow styling

  const { dailyTarget } = dailyTargetForBudget(
    Number(settings.goal) || 0,
    settings.tariffs,
    daysInMonth,
    currentUsage,
    daysSoFar
  );

  const goalProgress = settings.goal > 0 ? (parseFloat(actual.bill) / settings.goal) * 100 : 0;
  const progressColor = goalProgress >= 100 ? 'progress-error' : goalProgress > 75 ? 'progress-warning' : 'progress-success';

  const addReading = () => {
    const val = Number(newReading);
    const prev = readings[readings.length - 1]?.value ?? 0;
    if (!newReading || Number.isNaN(val) || val <= prev) {
      alert('Please enter a number greater than your last reading.');
      return;
    }
    setReadings([...readings, { id: Date.now(), date: new Date().toISOString(), value: val }]);
    setNewReading('');
    document.getElementById('add_reading_modal')?.close();
  };

  async function fetchInsight() {
    setInsightLoading(true);
    setInsightError('');
    setInsight('');
    try {
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
        lastRate: Number(lastRate.toFixed(2)),
        baselineRate: Number(baselineRate.toFixed(2)),
        changePct: Number(changePct.toFixed(1))
      };
      const chatHistory = [
        {
          role: 'user',
          parts: [{ text: 'Give me a short, practical insight about my energy use trend this month. Be concrete.' }]
        }
      ];
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory, usageData, language: settings.language })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'AI error');
      setInsight(data.message);
    } catch (e) {
      setInsightError(e?.message || 'AI is unavailable right now.');
    } finally {
      setInsightLoading(false);
    }
  }

  // Auto-insight on spike
  useEffect(() => {
    if (spike.isSpike) {
      fetchInsight().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spike.isSpike, readings.length, settings.language]);

  return (
    <div className="space-y-4">
      {/* Hero Prediction */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-primary to-secondary text-primary-content shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="opacity-90 text-sm">If you keep this pace</div>
            <div className="text-3xl font-extrabold mt-1">{predicted.bill} {predicted.currency}</div>
            <div className="text-xs mt-1 opacity-90">Range: {band.low}–{band.high} {predicted.currency}</div>
          </div>
          <CircleDollarSign size={40} className="opacity-90" />
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-4">
        <ColorCard color="bg-base-100" icon={<Zap className="h-6 w-6 text-info" />} title="Current Usage" value={`${currentUsage.toFixed(0)} kWh`} />
        <ColorCard color="bg-base-100" icon={<Activity className="h-6 w-6 text-accent" />} title="Daily Trend" value={`${trendDaily.toFixed(2)} kWh/day`} subtitle={`Avg so far ${rawAvgDaily.toFixed(2)} kWh/day`} />
        <ColorCard color="bg-base-100" icon={<TrendingUp className="h-6 w-6 text-success" />} title="Actual Bill" value={`${actual.bill} ${actual.currency}`} />
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-70">Trend vs recent</div>
                <div className={`text-lg font-bold flex items-center gap-1 ${trendUp ? 'text-error' : 'text-success'}`}>
                  {trendUp ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  {Math.abs(changePct).toFixed(0)}%
                </div>
              </div>
              <div className="text-right text-xs opacity-70">
                <div>Last: {lastRate.toFixed(2)} kWh/day</div>
                <div>Base: {baselineRate.toFixed(2)} kWh/day</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Progress */}
      {settings.goal > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Monthly Goal: {settings.goal} {actual.currency}</h2>
            <progress className={`progress ${progressColor} w-full`} value={goalProgress} max="100"></progress>
            <p className="text-xs text-right">{goalProgress.toFixed(0)}% used • Days left: {daysLeft}</p>
            <p className="text-xs opacity-70">Target about {dailyTarget} kWh/day to stay under budget.</p>
          </div>
        </div>
      )}

      {/* AI Insight */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title flex items-center gap-2">
              <Sparkles className="text-primary" /> AI Insight
            </h2>
            <button className="btn btn-sm" onClick={fetchInsight} disabled={insightLoading}>
              <RefreshCcw size={16} className={insightLoading ? 'animate-spin' : ''} /> {insightLoading ? 'Thinking...' : 'Refresh'}
            </button>
          </div>

          {spike.isSpike && (
            <div className="alert alert-warning text-warning-content my-2">
              <AlertTriangle />
              <span>We detected a consumption increase of {changePct.toFixed(0)}% compared to recent days.</span>
            </div>
          )}

          {insightError && <div className="text-error text-sm">{insightError}</div>}
          {!insight && !insightLoading && <p className="text-sm opacity-70">Get a quick, personalized tip based on your current trend.</p>}
          {insight && <p className="text-sm">{insight}</p>}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Recent Activity</h2>
          <SmallIncrements inc={inc} />
          <div className="overflow-x-auto mt-2">
            <table className="table table-xs">
              <tbody>
                {readings.slice(-5).reverse().map((r, idx, arr) => {
                  const prev = arr[idx + 1];
                  const used = prev ? r.value - prev.value : 0;
                  return (
                    <tr key={r.id}>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                      <td>{r.value} kWh</td>
                      <td>{prev ? `+${used} kWh` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-4">
        <button className="btn btn-primary btn-circle btn-lg shadow-lg" onClick={() => document.getElementById('add_reading_modal')?.showModal()}>
          <Plus size={28} />
        </button>
      </div>

      {/* Add Reading Modal */}
      <dialog id="add_reading_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add New Meter Reading</h3>
          <p className="py-2">Enter a value greater than your last reading.</p>
          <input
            type="number"
            placeholder="Enter new reading"
            className="input input-bordered w-full"
            value={newReading}
            onChange={(e) => setNewReading(e.target.value)}
          />
          <div className="modal-action">
            <button className="btn" onClick={() => document.getElementById('add_reading_modal')?.close()}>Cancel</button>
            <button className="btn btn-primary" onClick={addReading}>Save</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function ColorCard({ color = "bg-base-100", icon, title, value, subtitle }) {
  return (
    <div className={`card ${color} shadow-xl`}>
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs opacity-70">{title}</div>
            <div className="text-lg font-bold">{value}</div>
            {subtitle && <div className="text-xs opacity-70 mt-1">{subtitle}</div>}
          </div>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SmallIncrements({ inc }) {
  if (!inc || inc.length === 0) return null;
  const last5 = inc.slice(-5);
  return (
    <div className="flex flex-wrap gap-2">
      {last5.map((d, i) => (
        <div key={i} className="badge badge-outline">
          {new Date(d.date).toLocaleDateString()}: +{d.deltaKwh.toFixed(0)} kWh ({d.rate.toFixed(2)} kWh/day)
        </div>
      ))}
    </div>
  );
}
