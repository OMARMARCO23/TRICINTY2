import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Trash2 } from 'lucide-react';

export default function HistoryPage() {
  const { readings, setReadings } = useContext(AppContext);

  const chartData = readings.map(r => ({
    date: new Date(r.date).toLocaleDateString('en-CA'),
    kWh: r.value
  }));

  const exportCSV = () => {
    let csv = "Date,Reading (kWh)\n";
    readings.forEach(r => { csv += `${r.date},${r.value}\n`; });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tricinty_readings.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAllReadings = () => {
    if (window.confirm("Delete ALL readings? This cannot be undone.")) {
      setReadings([]);
    }
  };

  const deleteOne = (id) => {
    if (window.confirm("Delete this reading?")) {
      setReadings(readings.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Consumption History</h1>

      {readings.length > 1 ? (
        <div className="card bg-base-100 shadow-xl p-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="kWh" stroke="#2563eb" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <p>Add at least two readings to see trends.</p>}

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">All Readings</h2>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-secondary" onClick={exportCSV}>Export CSV</button>
              <button className="btn btn-sm btn-error" onClick={deleteAllReadings}>Delete All</button>
            </div>
          </div>
          <div className="overflow-x-auto h-64">
            <table className="table table-pin-rows">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reading (kWh)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...readings].reverse().map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.date).toLocaleString()}</td>
                    <td>{r.value}</td>
                    <td>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteOne(r.id)} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs opacity-60 mt-2">Tip: You can delete an incorrect entry here and re-enter the correct value.</p>
        </div>
      </div>
    </div>
  );
}
