import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarHeart, ChevronRight, PartyPopper } from 'lucide-react';
import dayjs from 'dayjs';
import { getAllEvents } from '../stores/eventStore';
import { sortByCountdown, formatCountdown, getEventTypeIcon, getYearLabel } from '../utils/dateHelpers';
import type { EventCountdown } from '../utils/dateHelpers';
import './Home.css';

const TOOLS = [
  {
    id: 'anniversary',
    name: '纪念日提醒',
    desc: '生日、纪念日倒计时',
    icon: CalendarHeart,
    color: '#6366F1',
    path: '/anniversary',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<EventCountdown[]>([]);

  const loadData = useCallback(async () => {
    const events = await getAllEvents();
    const sorted = sortByCountdown(events);
    setUpcoming(sorted.slice(0, 3));
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('eventUpdated', handler);
    return () => window.removeEventListener('eventUpdated', handler);
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
                  key={item.event.id}
                  className={`upcoming-card ${item.isToday ? 'is-today' : ''}`}
                  onClick={() => navigate(`/event/${item.event.id}`)}
                >
                  <div className="upcoming-icon">
                    {item.event.icon || getEventTypeIcon(item.event.type)}
                  </div>
                  <div className="upcoming-info">
                    <div className="upcoming-name">{item.event.name}</div>
                    <div className="upcoming-meta">
                      {item.nextDate.format('M月D日')}
                      {item.lunarLabel && <span className="lunar-tag">{item.lunarLabel}</span>}
                      {item.yearsSince > 0 && ` · ${getYearLabel(item.event, item.yearsSince)}`}
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
              <span>工具箱</span>
            </div>
          </div>
          <div className="tool-grid">
            {TOOLS.map(tool => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  className="tool-card"
                  onClick={() => navigate(tool.path)}
                >
                  <div className="tool-icon" style={{ background: `${tool.color}15`, color: tool.color }}>
                    <Icon size={28} />
                  </div>
                  <div className="tool-name">{tool.name}</div>
                  <div className="tool-desc">{tool.desc}</div>
                </div>
              );
            })}

            <div className="tool-card tool-card-placeholder">
              <div className="tool-icon placeholder-icon">
                <span>+</span>
              </div>
              <div className="tool-name">更多工具</div>
              <div className="tool-desc">敬请期待</div>
            </div>
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
