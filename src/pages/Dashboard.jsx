import { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import {
  calculateBillByMode,
  computeTrendDailyKwh,
  kwhToNextTier,
  dailyTargetForBudget,
  forecastBand
} from '../lib/calculations.js';
import { CircleDollarSign, Zap, TrendingUp, Plus, Activity, ScanLine } from 'lucide-react';
import MeterScanner from '../components/MeterScanner.jsx';

export default function Dashboard() {
  const { readings, setReadings, settings } = useContext(AppContext);
  const [newReading, setNewReading] = useState('');
  const [scanOpen, setScanOpen] = useState(false);

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

  const lastReadingVal = readings[readings.length - 1]?.value ?? 0;

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Zap className="h-7 w-7 text-info" />} title="Current Usage" value={`${currentUsage.toFixed(0)} kWh`} />
        <StatCard icon={<Activity className="h-7 w-7 text-accent" />} title="Daily Trend" value={`${trendDaily.toFixed(2)} kWh/day`}>
          <p className="text-xs opacity-70">Avg so far: {rawAvgDaily.toFixed(2)} kWh/day</p>
        </StatCard>
        <StatCard icon={<TrendingUp className="h-7 w-7 text-success" />} title="Actual Bill" value={`${actual.bill} ${actual.currency}`} />
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4">
            <div className="text-xs opacity-70">Insights</div>
            <ul className="text-sm space-y-1">
              <li>Days left this month: {daysLeft}</li>
              {Number(settings.goal) > 0 && (
                <li>Target ~{dailyTarget} kWh/day to stay under {settings.goal} {actual.currency}.</li>
              )}
              {Number.isFinite(toNextTier) && <li>{toNextTier.toFixed(0)} kWh to next price tier.</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Scan + Add Reading actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn btn-accent" onClick={() => setScanOpen(true)}>
          <ScanLine size={18} /> <span className="ml-1">Scan Meter (Camera)</span>
        </button>
        <button className="btn btn-primary" onClick={() => document.getElementById('add_reading_modal')?.showModal()}>
          <Plus size={18} /> <span className="ml-1">Add Reading</span>
        </button>
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

      {/* Scan Meter Modal */}
      <dialog id="scan_meter_modal" className={`modal ${scanOpen ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Scan Meter</h3>
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
            <button className="btn" onClick={() => setScanOpen(false)}>Close</button>
          </div>
        </div>
      </dialog>

      {/* Add Reading Modal */}
      <dialog id="add_reading_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add New Meter Reading</h3>
          <p className="py-2">Last reading: {lastReadingVal} kWh</p>
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
