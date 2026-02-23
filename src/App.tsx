import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getActiveDog } from './store/localStorage';
import BottomNav from './components/BottomNav';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import WalkPage from './pages/WalkPage';
import WalkResultPage from './pages/WalkResultPage';
import SettingsPage from './pages/SettingsPage';
import StatsPage from './pages/StatsPage';
import ReminderPage from './pages/ReminderPage';
import MapTestPage from './pages/MapTestPage';

function RequireSetup({ children }: { children: React.ReactNode }) {
  const dog = getActiveDog();
  if (!dog) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireSetup><HomePage /></RequireSetup>} />
        <Route path="/walk" element={<RequireSetup><WalkPage /></RequireSetup>} />
        <Route path="/reminder" element={<RequireSetup><ReminderPage /></RequireSetup>} />
        <Route path="/walk-result/:sessionId" element={<RequireSetup><WalkResultPage /></RequireSetup>} />
        <Route path="/settings" element={<RequireSetup><SettingsPage /></RequireSetup>} />
        <Route path="/stats" element={<RequireSetup><StatsPage /></RequireSetup>} />
        <Route path="/map-test" element={<MapTestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </HashRouter>
  );
}
