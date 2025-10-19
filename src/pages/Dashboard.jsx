import { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import {
  calculateBillByMode,
  computeTrendDailyKwh,
  kwhToNextTier,
  dailyTargetForBudget,
  forecastBand
} from '../lib/calculations.js';
import { CircleDollarSign, Zap, TrendingUp, Plus, Activity } from 'lucide-react';

export default function Dashboard() {
  const { readings, setReadings, settings } = useContext(AppContext);
  const [newReading, setNewReading] = useState('');

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<CircleDollarSign className="h-7 w-7 text-primary" />}
          title="If you keep this pace"
          value={`${predicted.bill} ${predicted.currency}`}
        >
          <p className="text-xs opacity-70">
            Range: {band.low}–{band.high} {predicted.currency}
          </p>
        </StatCard>

        <StatCard icon={<Zap className="h-7 w-7 text-primary" />} title="Current Usage" value={`${currentUsage.toFixed(0)} kWh`} />

        <StatCard icon={<Activity className="h-7 w-7 text-primary" />} title="Daily Trend" value={`${trendDaily.toFixed(2)} kWh/day`}>
          <p className="text-xs opacity-70">Avg so far: {rawAvgDaily.toFixed(2)} kWh/day</p>
        </StatCard>

        <StatCard icon={<TrendingUp className="h-7 w-7 text-primary" />} title="Actual Bill" value={`${actual.bill} ${actual.currency}`} />
      </div>

      {settings.goal > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Monthly Goal: {settings.goal} {actual.currency}</h2>
            <progress className={`progress ${progressColor} w-full`} value={goalProgress} max="100"></progress>
            <p className="text-xs text-right">{goalProgress.toFixed(0)}% used</p>
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Insights</h2>
          <ul className="text-sm space-y-1">
            <li>Days left this month: {daysLeft}</li>
            {Number(settings.goal) > 0 && (
              <li>To stay under {settings.goal} {actual.currency}, aim for about {dailyTarget} kWh/day for the rest of the month.</li>
            )}
            {Number.isFinite(toNextTier) && <li>You are {toNextTier.toFixed(0)} kWh from the next price tier.</li>}
          </ul>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Recent Activity</h2>
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
