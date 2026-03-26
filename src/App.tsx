import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { syncReminderNotifications } from './lib/reminderNotifications';
import TabBar from './components/TabBar';
import Home from './pages/Home';
import Toolbox from './pages/Toolbox';
import Anniversary from './pages/Anniversary';
import AddEvent from './pages/AddEvent';
import EventDetail from './pages/EventDetail';
import Profile from './pages/Profile';
import HabitTracker from './pages/HabitTracker';
import Countdown from './pages/Countdown';
import TodoList from './pages/TodoList';
import WaterTracker from './pages/WaterTracker';
import WeightTracker from './pages/WeightTracker';
import Pomodoro from './pages/Pomodoro';
import BmiCalc from './pages/BmiCalc';
import TaxCalc from './pages/TaxCalc';
import RandomPick from './pages/RandomPick';
import Ruler from './pages/Ruler';
import QrCode from './pages/QrCode';
import StockAssistant from './pages/StockAssistant';
import SkinCareAssistant from './pages/SkinCareAssistant';
import ReminderTool from './pages/ReminderTool';

const HIDE_TAB_PATHS = ['/anniversary/add', '/anniversary/edit', '/event', '/tool'];

const TAB_PATHS = ['/', '/toolbox', '/anniversary', '/profile'];

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const showTab = !HIDE_TAB_PATHS.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    syncReminderNotifications().catch((error) => {
      console.warn('[reminder] initial sync failed', error);
    });

    const stateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;

      syncReminderNotifications().catch((error) => {
        console.warn('[reminder] resume sync failed', error);
      });
    });

    return () => {
      stateListener.then(h => h.remove());
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
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

    return () => {
      backListener.then(h => h.remove());
    };
  }, [location.pathname, navigate]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/toolbox" element={<Toolbox />} />
        <Route path="/anniversary" element={<Anniversary />} />
        <Route path="/anniversary/add" element={<AddEvent />} />
        <Route path="/anniversary/edit/:id" element={<AddEvent />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tool/habit" element={<HabitTracker />} />
        <Route path="/tool/countdown" element={<Countdown />} />
        <Route path="/tool/todo" element={<TodoList />} />
        <Route path="/tool/water" element={<WaterTracker />} />
        <Route path="/tool/weight" element={<WeightTracker />} />
        <Route path="/tool/pomodoro" element={<Pomodoro />} />
        <Route path="/tool/bmi" element={<BmiCalc />} />
        <Route path="/tool/tax" element={<TaxCalc />} />
        <Route path="/tool/random" element={<RandomPick />} />
        <Route path="/tool/ruler" element={<Ruler />} />
        <Route path="/tool/qrcode" element={<QrCode />} />
        <Route path="/tool/stock" element={<StockAssistant />} />
        <Route path="/tool/skin" element={<SkinCareAssistant />} />
        <Route path="/tool/reminder" element={<ReminderTool />} />
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
