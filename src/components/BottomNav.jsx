import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Bot, Settings } from 'lucide-react';

const items = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/history', label: 'History', Icon: History },
  { to: '/coach', label: 'AI Coach', Icon: Bot },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav() {
  return (
    <div className="btm-nav z-50">
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon className="h-5 w-5" />
          <span className="btm-nav-label">{label}</span>
        </NavLink>
      ))}
    </div>
  );
}
