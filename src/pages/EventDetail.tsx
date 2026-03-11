import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { getEventById, deleteEvent } from '../stores/eventStore';
import { calculateCountdown, formatCountdown, getEventTypeIcon, getEventTypeLabel, getYearLabel, getLunarDateStr } from '../utils/dateHelpers';
import type { MemorialEvent } from '../types';
import type { EventCountdown } from '../utils/dateHelpers';
import './EventDetail.css';

export default function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [event, setEvent] = useState<MemorialEvent | null>(null);
  const [countdown, setCountdown] = useState<EventCountdown | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (id) {
      getEventById(id).then(e => {
        if (e) {
          setEvent(e);
          setCountdown(calculateCountdown(e));
        }
      });
    }
  }, [id]);

  const handleDelete = async () => {
    if (id) {
      await deleteEvent(id);
      window.dispatchEvent(new Event('eventUpdated'));
      navigate(-1);
    }
  };

  if (!event || !countdown) {
    return (
      <div className="page">
        <div className="add-nav">
          <button className="add-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={22} />
          </button>
          <span className="add-nav-title">详情</span>
          <div style={{ width: 36 }} />
        </div>
      </div>
    );
  }

  const originalDate = dayjs(event.date);
  const progressPercent = event.repeatYearly
    ? Math.max(0, Math.min(100, ((365 - countdown.daysRemaining) / 365) * 100))
    : 0;

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">详情</span>
        <button className="detail-edit" onClick={() => navigate(`/anniversary/edit/${id}`)}>
          <Pencil size={20} />
        </button>
      </div>

      <div className="page-content no-tab fade-in">
        <div className="detail-hero">
          <div className={`detail-icon-wrap ${countdown.isToday ? 'is-today' : ''}`}>
            <span className="detail-icon">
              {event.icon || getEventTypeIcon(event.type)}
            </span>
            {event.repeatYearly && !countdown.isToday && (
              <svg className="detail-ring" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#E2E8F0" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - progressPercent / 100)}`}
                  transform="rotate(-90 60 60)"
                />
              </svg>
            )}
          </div>
          <h2 className="detail-name">{event.name}</h2>
          <div className="detail-badges">
            <span className="detail-type-badge">{getEventTypeLabel(event.type)}</span>
            {event.calendarMode === 'lunar' && (
              <span className="detail-type-badge lunar-badge">🌙 农历</span>
            )}
          </div>
        </div>

        <div className="detail-countdown-card">
          {countdown.isToday ? (
            <div className="detail-today">
              <div className="detail-today-text">就是今天!</div>
              {countdown.yearsSince > 0 && (
                <div className="detail-today-years">
                  {getYearLabel(event, countdown.yearsSince)}
                </div>
              )}
            </div>
          ) : (
            <div className="detail-countdown">
              <div className="detail-countdown-main">
                <span className="detail-countdown-num">{countdown.daysRemaining}</span>
                <span className="detail-countdown-unit">天</span>
              </div>
              <div className="detail-countdown-sub">
                {formatCountdown(countdown.daysRemaining)}
                {countdown.yearsSince > 0 && ` · ${getYearLabel(event, countdown.yearsSince)}`}
              </div>
            </div>
          )}
        </div>

        <div className="detail-info-list">
          <div className="detail-info-item">
            <span className="detail-info-label">原始日期</span>
            <span className="detail-info-value">
              {originalDate.format('YYYY年M月D日')}
              {event.calendarMode === 'lunar' && event.lunarMonth && event.lunarDay && (
                <span className="detail-lunar-sub">({getLunarDateStr(event.lunarMonth, event.lunarDay)})</span>
              )}
            </span>
          </div>
          <div className="detail-info-item">
            <span className="detail-info-label">下次日期</span>
            <span className="detail-info-value">
              {countdown.nextDate.format('YYYY年M月D日')}
              {countdown.lunarLabel && (
                <span className="detail-lunar-sub">({countdown.lunarLabel})</span>
              )}
            </span>
          </div>
          {event.calendarMode === 'lunar' && (
            <div className="detail-info-item">
              <span className="detail-info-label">日历类型</span>
              <span className="detail-info-value">农历（自动转阳历）</span>
            </div>
          )}
          <div className="detail-info-item">
            <span className="detail-info-label">已经过去</span>
            <span className="detail-info-value">
              {dayjs().diff(originalDate, 'day')} 天 ({countdown.yearsSince > 0 ? `${countdown.yearsSince - 1} 年` : '不到一年'})
            </span>
          </div>
          <div className="detail-info-item">
            <span className="detail-info-label">每年重复</span>
            <span className="detail-info-value">{event.repeatYearly ? '是' : '否'}</span>
          </div>
          <div className="detail-info-item">
            <span className="detail-info-label">提前提醒</span>
            <span className="detail-info-value">
              {event.enableReminder ? `${event.reminderDays} 天前` : '关闭'}
            </span>
          </div>
          {event.note && (
            <div className="detail-info-item">
              <span className="detail-info-label">备注</span>
              <span className="detail-info-value">{event.note}</span>
            </div>
          )}
        </div>

        <div className="detail-actions">
          <button className="detail-delete-btn" onClick={() => setShowConfirm(true)}>
            <Trash2 size={18} />
            删除此纪念日
          </button>
        </div>

        {showConfirm && (
          <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <div className="confirm-title">确认删除</div>
              <div className="confirm-message">确定要删除「{event.name}」吗？此操作不可恢复。</div>
              <div className="confirm-buttons">
                <button className="confirm-cancel" onClick={() => setShowConfirm(false)}>取消</button>
                <button className="confirm-delete" onClick={handleDelete}>删除</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
