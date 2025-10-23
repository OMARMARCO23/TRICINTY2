import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import { TARIFF_PRESETS } from '../lib/calculations.js';
import { tFactory } from '../i18n/index.js';

export default function SettingsPage() {
  const { settings, setSettings } = useContext(AppContext);
  const t = tFactory(settings.language);

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
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <div className="form-control">
        <label className="label"><span className="label-text">{t('settings.theme')}</span></label>
        <select name="theme" className="select select-bordered" value={settings.theme} onChange={onField}>
          <option value="auto">{t('settings.themeAuto')}</option>
          <option value="light">{t('settings.themeLight')}</option>
          <option value="dark">{t('settings.themeDark')}</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">{t('settings.language')}</span></label>
        <select name="language" className="select select-bordered" value={settings.language} onChange={onField}>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">{t('settings.country')}</span></label>
        <select name="country" className="select select-bordered" value={settings.country} onChange={onCountry}>
          <option value="MA">Morocco</option>
          <option value="FR">France</option>
          <option value="US">USA</option>
          <option value="Other">Other (Manual)</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">
            {t('settings.tariffMode')}
          </span>
        </label>
        <select name="tariffMode" className="select select-bordered" value={settings.tariffMode} onChange={onField}>
          <option value="progressive">{t('settings.tariffModeProg')}</option>
          <option value="whole-tier">{t('settings.tariffModeWhole')}</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">{t('settings.goal', { currency: settings.tariffs.currency })}</span></label>
        <input type="number" name="goal" className="input input-bordered" value={settings.goal} onChange={onField} />
      </div>

      {/* Legal & Info */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">{t('settings.legalTitle')}</h2>

          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" />
            <div className="collapse-title text-md font-medium">{t('settings.about')}</div>
            <div className="collapse-content">
              <p>{t('settings.aboutText')}</p>
            </div>
          </div>

          <div className="collapse collapse-arrow bg-base-200 mt-2">
            <input type="checkbox" />
            <div className="collapse-title text-md font-medium">{t('settings.privacy')}</div>
            <div className="collapse-content">
              <p>{t('settings.privacyText')}</p>
            </div>
          </div>

          <div className="collapse collapse-arrow bg-base-200 mt-2">
            <input type="checkbox" />
            <div className="collapse-title text-md font-medium">{t('settings.disclaimer')}</div>
            <div className="collapse-content">
              <p>{t('settings.disclaimerText')}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
