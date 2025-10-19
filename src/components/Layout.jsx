import BottomNav from './BottomNav.jsx';

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-base-200">
      <main className="flex-grow p-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
