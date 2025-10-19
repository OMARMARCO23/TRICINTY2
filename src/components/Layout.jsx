import BottomNav from './BottomNav.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-base-200">
      <header className="navbar bg-base-100 shadow-sm sticky top-0 z-40">
        <div className="flex-1 px-2 font-semibold">TRICINTY ⚡</div>
        <div className="flex-none px-2">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-grow p-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
