import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/stats', icon: '📊', label: '統計' },
  { path: '/', icon: '🏠', label: 'ホーム' },
  { path: '/settings', icon: '⚙️', label: '設定' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // 散歩中・結果画面・Admin画面では非表示
  if (location.pathname.startsWith('/walk') || location.pathname === '/login' || location.pathname === '/admin') return null;

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.path}
          className={`nav-item ${location.pathname === tab.path ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="nav-icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
