import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getAllEvents } from '../stores/eventStore';
import { sortByCountdown, formatCountdown, getEventTypeIcon, getEventTypeLabel, getYearLabel } from '../utils/dateHelpers';
import type { EventCountdown } from '../utils/dateHelpers';
import type { EventType } from '../types';
import './Anniversary.css';

const FILTERS: { label: string; value: EventType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '生日', value: 'birthday' },
  { label: '纪念日', value: 'anniversary' },
  { label: '忌日', value: 'memorial' },
  { label: '其他', value: 'custom' },
];

export default function Anniversary() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EventCountdown[]>([]);
  const [filter, setFilter] = useState<EventType | 'all'>('all');

  const loadData = useCallback(async () => {
    const events = await getAllEvents();
    setItems(sortByCountdown(events));
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('eventUpdated', handler);
    return () => window.removeEventListener('eventUpdated', handler);
  }, [loadData]);

  const filtered = filter === 'all'
    ? items
    : items.filter(i => i.event.type === filter);

  return (
    <div className="page">
      <div className="page-content">
        <div className="anni-header">
          <h1 className="anni-title">纪念日</h1>
          <button className="anni-add-btn" onClick={() => navigate('/anniversary/add')}>
            <Plus size={20} />
          </button>
        </div>

        <div className="anni-filters">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`filter-chip ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="anni-empty fade-in">
            <div className="empty-icon">📅</div>
            <p className="empty-text">还没有纪念日</p>
            <p className="empty-sub">点击右上角 + 添加一个吧</p>
          </div>
        ) : (
          <div className="anni-list fade-in">
            {filtered.map(item => (
              <div
                key={item.event.id}
                className={`anni-card ${item.isToday ? 'is-today' : ''}`}
                onClick={() => navigate(`/event/${item.event.id}`)}
              >
                <div className="anni-card-left">
                  <div className="anni-card-icon">
                    {item.event.icon || getEventTypeIcon(item.event.type)}
                  </div>
                  <div className="anni-card-info">
                    <div className="anni-card-name">{item.event.name}</div>
                    <div className="anni-card-meta">
                      <span className="anni-card-type">{getEventTypeLabel(item.event.type)}</span>
                      {item.lunarLabel && <span className="anni-card-lunar">{item.lunarLabel}</span>}
                      <span className="anni-card-date">{item.nextDate.format('M月D日')}</span>
                      {item.yearsSince > 0 && (
                        <span className="anni-card-years">{getYearLabel(item.event, item.yearsSince)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="anni-card-right">
                  {item.isToday ? (
                    <div className="anni-today-badge">今天</div>
                  ) : (
                    <div className="anni-countdown">
                      <span className="anni-countdown-num">{item.daysRemaining}</span>
                      <span className="anni-countdown-label">天后</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
