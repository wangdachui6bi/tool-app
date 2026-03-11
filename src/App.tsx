import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import TabBar from './components/TabBar';
import Home from './pages/Home';
import Anniversary from './pages/Anniversary';
import AddEvent from './pages/AddEvent';
import EventDetail from './pages/EventDetail';
import Profile from './pages/Profile';

const HIDE_TAB_PATHS = ['/anniversary/add', '/anniversary/edit', '/event'];

const TAB_PATHS = ['/', '/anniversary', '/profile'];

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const showTab = !HIDE_TAB_PATHS.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener('backButton', ({ canGoBack }) => {
      const isTabPage = TAB_PATHS.includes(location.pathname);

      if (isTabPage) {
        if (location.pathname === '/') {
          CapApp.minimizeApp();
        } else {
          navigate('/');
        }
      } else if (canGoBack) {
        navigate(-1);
      } else {
        navigate('/');
      }
    });

    return () => { listener.then(h => h.remove()); };
  }, [location.pathname, navigate]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/anniversary" element={<Anniversary />} />
        <Route path="/anniversary/add" element={<AddEvent />} />
        <Route path="/anniversary/edit/:id" element={<AddEvent />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      {showTab && <TabBar />}
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}
