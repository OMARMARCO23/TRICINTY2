import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import AiCoach from './pages/AiCoach';
import Settings from './pages/Settings';


export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/coach" element={<AiCoach />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
