import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import { TARIFF_PRESETS } from '../lib/calculations.js';

export default function SettingsPage() {
  const { settings, setSettings } = useContext(AppContext);

  const onTheme = (e) => setSettings({ ...settings, theme: e.target.checked ? 'dark' : 'light' });
  const onField = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: name === 'goal' ? Number(value) : value });
  };
  const onCountry = (e) => {
    const country = e.target.value;
    setSettings({
      ...settings,
      country,
      tariffs: TARIFF_PRESETS[country] || settings.tariffs
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Dark Mode</span>
          <input type="checkbox" className="toggle toggle-primary" checked={settings.theme === 'dark'} onChange={onTheme} />
        </label>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Language</span></label>
        <select name="language" className="select select-bordered" value={settings.language} onChange={onField}>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Country (Tariffs)</span></label>
        <select name="country" className="select select-bordered" value={settings.country} onChange={onCountry}>
          <option value="MA">Morocco</option>
          <option value="FR">France</option>
          <option value="US">USA</option>
          <option value="Other">Other (Manual)</option>
        </select>
        {settings.country === 'Other' && <p className="text-sm opacity-70 mt-2">Manual tariff editor can be added here.</p>}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Monthly Spending Goal ({settings.tariffs.currency})</span></label>
        <input type="number" name="goal" className="input input-bordered" value={settings.goal} onChange={onField} />
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Privacy</h2>
          <p>All your data (meter readings and settings) are stored locally on your device. Nothing is uploaded.</p>
        </div>
      </div>
    </div>
  );
}
