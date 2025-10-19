"use client";

import { useContext, useMemo, useRef, useState } from "react";
import { AppContext } from "@/contexts/AppContext";
import { calculateBill, getMonthBoundaries } from "@/lib/calculations";
import { CircleDollarSign, Zap, BarChart, TrendingUp, Plus } from "lucide-react";
import WelcomeModal from "@/components/WelcomeModal";

export default function Dashboard() {
  const { readings, setReadings, settings, setSettings } = useContext(AppContext);
  const [newReading, setNewReading] = useState<string>("");

  const today = new Date();
  const { start, daysSoFar, daysInMonth } = getMonthBoundaries(today);
  const readingsThisMonth = readings.filter((r) => new Date(r.date) >= start);
  const firstReadingValue = readingsThisMonth[0]?.value ?? readings[0]?.value ?? 0;
  const lastReading = readings[readings.length - 1];
  const currentUsage = Math.max((lastReading?.value ?? 0) - firstReadingValue, 0);

  const actual = calculateBill(currentUsage, settings.tariffs);
  const avgDaily = currentUsage > 0 && daysSoFar > 0 ? (currentUsage / daysSoFar) : 0;
  const predictedUsage = avgDaily * daysInMonth;
  const predicted = calculateBill(predictedUsage, settings.tariffs);

  const goalProgress = settings.goal > 0 ? (parseFloat(actual.bill) / settings.goal) * 100 : 0;
  const progressColor = goalProgress >= 100 ? "progress-error" : goalProgress > 75 ? "progress-warning" : "progress-success";

  const [showWelcome, setShowWelcome] = useState(() => {
    // Show only if no readings and first time settings haven't been changed
    return !window.localStorage.getItem("tricinty-onboarded");
  });

  const addReading = () => {
    const last = lastReading?.value ?? 0;
    const val = Number(newReading);
    if (!newReading || Number.isNaN(val) || val <= last) {
      alert("Please enter a number greater than your last reading.");
      return;
    }
    setReadings([...readings, { id: Date.now(), date: new Date().toISOString(), value: val }]);
    setNewReading("");
    (document.getElementById("add_reading_modal") as HTMLDialogElement | null)?.close();
  };

  return (
    <div className="space-y-4">
      <WelcomeModal
        isOpen={showWelcome}
        onClose={() => {
          setShowWelcome(false);
          window.localStorage.setItem("tricinty-onboarded", "1");
        }}
        onSelectCountry={(country) => setSettings({ ...settings, country })}
      />

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<CircleDollarSign className="h-7 w-7 text-primary" />} title="Predicted Bill" value={`${predicted.bill} ${predicted.currency}`} />
        <StatCard icon={<Zap className="h-7 w-7 text-primary" />} title="Current Usage" value={`${currentUsage.toFixed(0)} kWh`} />
        <StatCard icon={<BarChart className="h-7 w-7 text-primary" />} title="Avg. Daily" value={`${avgDaily.toFixed(2)} kWh`} />
        <StatCard icon={<TrendingUp className="h-7 w-7 text-primary" />} title="Actual Bill" value={`${actual.bill} ${actual.currency}`} />
      </div>

      {settings.goal > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Monthly Goal: {settings.goal} {actual.currency}</h2>
            <progress className={`progress ${progressColor} w-full`} value={goalProgress} max={100} />
            <p className="text-xs text-right">{goalProgress.toFixed(0)}% used</p>
          </div>
        </div>
      )}

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
                      <td>{prev ? `+${used} kWh` : "-"}</td>
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
        <button className="btn btn-primary btn-circle btn-lg shadow-lg" onClick={() => (document.getElementById("add_reading_modal") as HTMLDialogElement | null)?.showModal()}>
          <Plus size={28} />
        </button>
      </div>

      {/* Add Reading Modal */}
      <dialog id="add_reading_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add New Meter Reading</h3>
          <p className="py-2">Last reading: {lastReading?.value ?? 0} kWh</p>
          <input
            type="number"
            placeholder="Enter new reading"
            className="input input-bordered w-full"
            value={newReading}
            onChange={(e) => setNewReading(e.target.value)}
          />
          <div className="modal-action">
            <button className="btn" onClick={() => (document.getElementById("add_reading_modal") as HTMLDialogElement | null)?.close()}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={addReading}>
              Save
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body items-center text-center p-4">
        {icon}
        <h2 className="card-title text-sm">{title}</h2>
        <p className="font-bold text-lg">{value}</p>
      </div>
    </div>
  );
}
