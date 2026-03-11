import { useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, CalendarHeart, User } from 'lucide-react';
import './TabBar.css';

const tabs = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/toolbox', icon: LayoutGrid, label: '工具箱' },
  { path: '/anniversary', icon: CalendarHeart, label: '纪念日' },
  { path: '/profile', icon: User, label: '我的' },
];

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="tab-bar">
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            className={`tab-bar-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <Icon size={22} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
