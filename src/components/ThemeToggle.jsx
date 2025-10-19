import { Sun, Moon } from 'lucide-react';
import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';

export default function ThemeToggle() {
  const { settings, setSettings } = useContext(AppContext);
  const theme = settings.theme;
  const next = () => {
    const order = ['auto', 'light', 'dark'];
    const i = order.indexOf(theme);
    const nextTheme = order[(i + 1) % order.length];
    setSettings({ ...settings, theme: nextTheme });
  };
  const icon = theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />;
  return (
    <button className="btn btn-ghost btn-sm" onClick={next} title={`Theme: ${theme}`}>
      {icon}
      <span className="ml-1 capitalize hidden sm:inline">{theme}</span>
    </button>
  );
}
