import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Bot, Settings } from 'lucide-react';
import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import { tFactory } from '../i18n/index.js';

const items = (t) => [
  { to: '/dashboard', label: t('nav.dashboard'), Icon: LayoutDashboard },
  { to: '/history', label: t('nav.history'), Icon: History },
  { to: '/coach', label: t('nav.coach'), Icon: Bot },
  { to: '/settings', label: t('nav.settings'), Icon: Settings }
];

export default function BottomNav() {
  const { settings } = useContext(AppContext);
  const t = tFactory(settings.language);

  return (
    <div className="btm-nav z-50">
      {items(t).map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon className="h-5 w-5" />
          <span className="btm-nav-label">{label}</span>
        </NavLink>
      ))}
    </div>
  );
}
