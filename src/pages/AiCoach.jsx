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
import { CircleDollarSign, Zap, TrendingUp, Plus, Activity, RefreshCcw, AlertTriangle, Sparkles, ScanLine } from 'lucide-react';
import MeterScanner from '../components/MeterScanner.jsx';
import { tFactory } from '../i18n/index.js';
import { API_BASE } from '../config.js';

export default function Dashboard() {
  const { readings, setReadings, settings } = useContext(AppContext);
  const t = tFactory(settings.language);

  const [newReading, setNewReading] = useState('');
  const [scanOpen, setScanOpen] = useState(false);

  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState('');

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

  const { dailyTarget } = dailyTargetForBudget(
    Number(settings.goal) || 0,
    settings.tariffs,
    daysInMonth,
    currentUsage,
    daysSoFar
  );

  const goalProgress = settings.goal > 0 ? (parseFloat(actual.bill) / settings.goal) * 100 : 0;
  const progressColor = goalProgress >= 100 ? 'progress-error' : goalProgress > 75 ? 'progress-warning' : 'progress-success';

  // Spike detection
  const spike = detectSpike(readings);
  const inc = dailyIncrements(readings);
  const lastRate = Number((spike.lastRate || 0).toFixed(2));
  const baselineRate = Number((spike.baselineRate || 0).toFixed(2));
  const changePct = Number((spike.changePct || 0).toFixed(1));

  const lastReadingVal = readings[readings.length - 1]?.value ?? 0;

  const addReading = () => {
    const val = Number(newReading);
    const prev = lastReadingVal;
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
        lastRate,
        baselineRate,
        changePct
      };
      const chatHistory = [
        { role: 'user', parts: [{ text: 'Give me a short, practical insight about my energy use trend this month. Be concrete.' }] }
      ];
      const res = await fetch(`${API_BASE}/api/ai`, {
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
            <div className="opacity-90 text-sm">{t('dashboard.predictedTitle')}</div>
            <div className="text-3xl font-extrabold mt-1">{predicted.bill} {predicted.currency}</div>
            <div className="text-xs mt-1 opacity-90">{t('dashboard.range')}: {band.low}–{band.high} {predicted.currency}</div>
          </div>
          <CircleDollarSign size={40} className="opacity-90" />
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Zap className="h-7 w-7 text-info" />} title={t('dashboard.currentUsage')} value={`${currentUsage.toFixed(0)} kWh`} />
        <StatCard icon={<Activity className="h-7 w-7 text-accent" />} title={t('dashboard.dailyTrend')} value={`${trendDaily.toFixed(2)} kWh/day`}>
          <p className="text-xs opacity-70">{t('dashboard.avgSoFar')}: {rawAvgDaily.toFixed(2)} kWh/day</p>
        </StatCard>
        <StatCard icon={<TrendingUp className="h-7 w-7 text-success" />} title={t('dashboard.actualBill')} value={`${actual.bill} ${actual.currency}`} />
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4">
            <div className="text-xs opacity-70">{t('dashboard.insights')}</div>
            <ul className="text-sm space-y-1">
              <li>{t('dashboard.daysLeft')}: {daysLeft}</li>
              {Number(settings.goal) > 0 && (
                <li>{t('dashboard.targetHint', { dailyTarget, goal: settings.goal, currency: actual.currency })}</li>
              )}
              {Number.isFinite(toNextTier) && <li>{t('dashboard.toNextTier', { kwh: toNextTier.toFixed(0) })}</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title flex items-center gap-2">
              <Sparkles className="text-primary" /> {t('aiInsight.title')}
            </h2>
            <button className="btn btn-sm" onClick={fetchInsight} disabled={insightLoading}>
              <RefreshCcw size={16} className={insightLoading ? 'animate-spin' : ''} /> {insightLoading ? t('aiInsight.thinking') : t('aiInsight.refresh')}
            </button>
          </div>

          {spike.isSpike && (
            <div className="alert alert-warning text-warning-content my-2">
              <AlertTriangle />
              <span>{t('aiInsight.spike', { percent: Math.abs(changePct).toFixed(0) })}</span>
            </div>
          )}

          {insightError && <div className="text-error text-sm">{insightError}</div>}
          {!insight && !insightLoading && <p className="text-sm opacity-70">{t('aiInsight.getTip')}</p>}
          {insight && <p className="text-sm">{insight}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn btn-accent" onClick={() => setScanOpen(true)}>
          <ScanLine size={18} /> <span className="ml-1">{t('dashboard.scanMeter')}</span>
        </button>
        <button className="btn btn-primary" onClick={() => document.getElementById('add_reading_modal')?.showModal()}>
          <Plus size={18} /> <span className="ml-1">{t('dashboard.addReading')}</span>
        </button>
      </div>

      {/* Recent Activity */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{t('dashboard.recentActivity')}</h2>
          <div className="overflow-x-auto">
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

      {/* Scan Meter Modal */}
      <dialog id="scan_meter_modal" className={`modal ${scanOpen ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t('dashboard.scanModalTitle')}</h3>
          <MeterScanner
            lastReading={lastReadingVal}
            onResult={(num) => {
              const value = Number(num);
              if (Number.isNaN(value) || value <= lastReadingVal) {
                alert('Result is not greater than your last reading. Please edit or try again.');
              } else {
                setReadings([...readings, { id: Date.now(), date: new Date().toISOString(), value }]);
              }
            }}
            onClose={() => setScanOpen(false)}
          />
          <div className="modal-action">
            <button className="btn" onClick={() => setScanOpen(false)}>{t('dashboard.cancel')}</button>
          </div>
        </div>
      </dialog>

      {/* Add Reading Modal */}
      <dialog id="add_reading_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t('dashboard.addModalTitle')}</h3>
          <p className="py-2">{t('dashboard.lastReading')}: {lastReadingVal} kWh</p>
          <input
            type="number"
            placeholder={t('dashboard.addReading')}
            className="input input-bordered w-full"
            value={newReading}
            onChange={(e) => setNewReading(e.target.value)}
          />
          <div className="modal-action">
            <button className="btn" onClick={() => document.getElementById('add_reading_modal')?.close()}>{t('dashboard.cancel')}</button>
            <button className="btn btn-primary" onClick={addReading}>{t('dashboard.save')}</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function StatCard({ icon, title, value, children }) {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body items-center text-center p-4">
        {icon}
        <h2 className="card-title text-sm">{title}</h2>
        <p className="font-bold text-lg">{value}</p>
        {children}
      </div>
    </div>
  );
}
