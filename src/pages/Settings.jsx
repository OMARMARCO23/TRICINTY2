import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import { TARIFF_PRESETS } from '../lib/calculations.js';

export default function SettingsPage() {
  const { settings, setSettings } = useContext(AppContext);

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
        <label className="label"><span className="label-text">Theme</span></label>
        <select name="theme" className="select select-bordered" value={settings.theme} onChange={onField}>
          <option value="auto">Auto (follow system)</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
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
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Tariff Mode</span></label>
        <select name="tariffMode" className="select select-bordered" value={settings.tariffMode} onChange={onField}>
          <option value="progressive">Progressive blocks</option>
          <option value="whole-tier">Whole-tier (all kWh at the reached tier)</option>
        </select>
        <p className="text-xs opacity-70 mt-1">
          Some providers charge all monthly kWh at the reached tier. Choose the mode that matches your utility.
        </p>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Monthly Spending Goal ({settings.tariffs.currency})</span></label>
        <input type="number" name="goal" className="input input-bordered" value={settings.goal} onChange={onField} />
      </div>

      {/* Legal & Info */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Legal & Info</h2>

          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" />
            <div className="collapse-title text-md font-medium">About</div>
            <div className="collapse-content">
              <p>TRICINTY is an app to help you track and reduce your electricity consumption.</p>
              <p className="mt-2">For a full-screen, app-like experience, install TRICINTY to your device's home screen using your browser's "Add to Home Screen" option.</p>
            </div>
          </div>

          <div className="collapse collapse-arrow bg-base-200 mt-2">
            <input type="checkbox" />
            <div className="collapse-title text-md font-medium">Privacy Policy</div>
            <div className="collapse-content">
              <p>Your data is stored locally on your device and is not shared with any third parties. We do not collect any personal information.</p>
            </div>
          </div>

          <div className="collapse collapse-arrow bg-base-200 mt-2">
            <input type="checkbox" />
            <div className="collapse-title text-md font-medium">Disclaimer</div>
            <div className="collapse-content">
              <p>The bill predictions and consumption data are estimates for informational purposes only. Actual results may vary. We are not responsible for any discrepancies.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
