import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarHeart, ChevronRight, PartyPopper,
  CheckSquare, CalendarClock, ListTodo,
  Droplets, Timer, Receipt, Dices,
} from 'lucide-react';
import dayjs from 'dayjs';
import { getAllEvents } from '../stores/eventStore';
import { getCountdowns } from '../stores/countdownStore';
import { sortByCountdown, getEventTypeIcon, getYearLabel } from '../utils/dateHelpers';
import './Home.css';

interface UpcomingItem {
  id: string;
  name: string;
  icon: string;
  daysRemaining: number;
  isToday: boolean;
  dateLabel: string;
  lunarLabel?: string;
  yearLabel?: string;
  source: 'anniversary' | 'countdown';
}

const QUICK_TOOLS = [
  { id: 'anniversary', name: '纪念日', icon: CalendarHeart, color: '#6366F1', path: '/anniversary' },
  { id: 'habit', name: '习惯打卡', icon: CheckSquare, color: '#10B981', path: '/tool/habit' },
  { id: 'countdown', name: '倒数日', icon: CalendarClock, color: '#F59E0B', path: '/tool/countdown' },
  { id: 'todo', name: '待办清单', icon: ListTodo, color: '#8B5CF6', path: '/tool/todo' },
  { id: 'water', name: '喝水记录', icon: Droplets, color: '#3B82F6', path: '/tool/water' },
  { id: 'pomodoro', name: '番茄钟', icon: Timer, color: '#EF4444', path: '/tool/pomodoro' },
  { id: 'tax', name: '个税计算', icon: Receipt, color: '#F97316', path: '/tool/tax' },
  { id: 'random', name: '随机决策', icon: Dices, color: '#A855F7', path: '/tool/random' },
];

export default function Home() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  const loadData = useCallback(async () => {
    const items: UpcomingItem[] = [];

    const events = await getAllEvents();
    for (const cd of sortByCountdown(events)) {
      items.push({
        id: cd.event.id,
        name: cd.event.name,
        icon: cd.event.icon || getEventTypeIcon(cd.event.type),
        daysRemaining: cd.daysRemaining,
        isToday: cd.isToday,
        dateLabel: cd.nextDate.format('M月D日'),
        lunarLabel: cd.lunarLabel,
        yearLabel: cd.yearsSince > 0 ? getYearLabel(cd.event, cd.yearsSince) : undefined,
        source: 'anniversary',
      });
    }

    const countdowns = await getCountdowns();
    const today = dayjs().startOf('day');
    for (const c of countdowns) {
      const target = dayjs(c.targetDate).startOf('day');
      const days = target.diff(today, 'day');
      if (days < 0) continue;
      items.push({
        id: c.id,
        name: c.name,
        icon: c.icon || '📅',
        daysRemaining: days,
        isToday: days === 0,
        dateLabel: target.format('M月D日'),
        source: 'countdown',
      });
    }

    items.sort((a, b) => a.daysRemaining - b.daysRemaining);
    setUpcoming(items.slice(0, 5));
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('eventUpdated', handler);
    window.addEventListener('countdownUpdated', handler);
    return () => {
      window.removeEventListener('eventUpdated', handler);
      window.removeEventListener('countdownUpdated', handler);
    };
  }, [loadData]);

  const today = dayjs();

  return (
    <div className="page">
      <div className="page-content">
        <div className="home-header">
          <div className="home-header-bg" />
          <div className="home-header-content">
            <div className="home-greeting">
              {getGreeting()}
            </div>
            <div className="home-date">
              {today.format('YYYY年M月D日')} {getWeekDay(today.day())}
            </div>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="home-section fade-in">
            <div className="section-header">
              <div className="section-title">
                <PartyPopper size={18} />
                <span>即将到来</span>
              </div>
              <button className="section-more" onClick={() => navigate('/anniversary')}>
                查看全部 <ChevronRight size={16} />
              </button>
            </div>
            <div className="upcoming-list">
              {upcoming.map(item => (
                <div
                  key={`${item.source}-${item.id}`}
                  className={`upcoming-card ${item.isToday ? 'is-today' : ''}`}
                  onClick={() => navigate(item.source === 'anniversary' ? `/event/${item.id}` : '/tool/countdown')}
                >
                  <div className="upcoming-icon">
                    {item.icon}
                  </div>
                  <div className="upcoming-info">
                    <div className="upcoming-name">{item.name}</div>
                    <div className="upcoming-meta">
                      {item.dateLabel}
                      {item.lunarLabel && <span className="lunar-tag">{item.lunarLabel}</span>}
                      {item.yearLabel && ` · ${item.yearLabel}`}
                      {item.source === 'countdown' && <span className="source-tag countdown-tag">倒数日</span>}
                    </div>
                  </div>
                  <div className="upcoming-countdown">
                    {item.isToday ? (
                      <span className="countdown-today">今天</span>
                    ) : (
                      <>
                        <span className="countdown-number">{item.daysRemaining}</span>
                        <span className="countdown-unit">天</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="home-section fade-in">
          <div className="section-header">
            <div className="section-title">
              <span>常用工具</span>
            </div>
            <button className="section-more" onClick={() => navigate('/toolbox')}>
              全部工具 <ChevronRight size={16} />
            </button>
          </div>
          <div className="quick-grid">
            {QUICK_TOOLS.map(tool => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  className="quick-item"
                  onClick={() => navigate(tool.path)}
                >
                  <div className="quick-icon" style={{ background: `${tool.color}12`, color: tool.color }}>
                    <Icon size={22} />
                  </div>
                  <span className="quick-name">{tool.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = dayjs().hour();
  if (hour < 6) return '夜深了 🌙';
  if (hour < 9) return '早上好 ☀️';
  if (hour < 12) return '上午好 🌤️';
  if (hour < 14) return '中午好 🌞';
  if (hour < 18) return '下午好 🌅';
  if (hour < 22) return '晚上好 🌆';
  return '夜深了 🌙';
}

function getWeekDay(day: number): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day];
}
