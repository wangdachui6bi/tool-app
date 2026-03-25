import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarHeart, ChevronRight, PartyPopper,
  CheckSquare, CalendarClock, ListTodo,
  Droplets, Timer, Receipt, Dices,
  Scale, Calculator, QrCode, RulerIcon, LineChart,
  ShieldPlus, BellRing, CircleAlert, Compass,
  Settings2, X, Check, GripVertical,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import dayjs from 'dayjs';
import { getAllEvents } from '../stores/eventStore';
import { getCountdowns } from '../stores/countdownStore';
import { getQuickToolIds, saveQuickToolIds } from '../stores/quickToolStore';
import { getSkinCareRecordByDate } from '../stores/skinCareStore';
import { getReminders, type ReminderItem } from '../stores/reminderStore';
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

interface ToolDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  path: string;
}

const ALL_TOOLS: ToolDef[] = [
  { id: 'anniversary', name: '纪念日', icon: CalendarHeart, color: '#6366F1', path: '/anniversary' },
  { id: 'habit', name: '习惯打卡', icon: CheckSquare, color: '#10B981', path: '/tool/habit' },
  { id: 'countdown', name: '倒数日', icon: CalendarClock, color: '#F59E0B', path: '/tool/countdown' },
  { id: 'todo', name: '待办清单', icon: ListTodo, color: '#8B5CF6', path: '/tool/todo' },
  { id: 'water', name: '喝水记录', icon: Droplets, color: '#3B82F6', path: '/tool/water' },
  { id: 'pomodoro', name: '番茄钟', icon: Timer, color: '#EF4444', path: '/tool/pomodoro' },
  { id: 'tax', name: '个税计算', icon: Receipt, color: '#F97316', path: '/tool/tax' },
  { id: 'random', name: '随机决策', icon: Dices, color: '#A855F7', path: '/tool/random' },
  { id: 'weight', name: '体重记录', icon: Scale, color: '#EC4899', path: '/tool/weight' },
  { id: 'bmi', name: 'BMI计算', icon: Calculator, color: '#14B8A6', path: '/tool/bmi' },
  { id: 'reminder', name: '提醒', icon: BellRing, color: '#EF4444', path: '/tool/reminder' },
  { id: 'skin', name: '皮肤护理', icon: ShieldPlus, color: '#F59E0B', path: '/tool/skin' },
  { id: 'qrcode', name: '二维码', icon: QrCode, color: '#1E293B', path: '/tool/qrcode' },
  { id: 'ruler', name: '尺子', icon: RulerIcon, color: '#64748B', path: '/tool/ruler' },
  { id: 'stock', name: '股票助手', icon: LineChart, color: '#F43F5E', path: '/tool/stock' },
];

export default function Home() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [quickIds, setQuickIds] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editIds, setEditIds] = useState<string[]>([]);
  const [skinPending, setSkinPending] = useState(false);
  const [reminderHighlights, setReminderHighlights] = useState<ReminderItem[]>([]);

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

  useEffect(() => {
    getQuickToolIds().then(setQuickIds);
  }, []);

  useEffect(() => {
    const today = dayjs().format('YYYY-MM-DD');

    const loadSkinReminder = async () => {
      const record = await getSkinCareRecordByDate(today);
      const pending = !(
        record.notes.trim().length > 0 ||
        record.photos.length > 0 ||
        record.triggers.length > 0 ||
        record.pus ||
        record.spreading ||
        record.fever ||
        record.rapidWorsening ||
        record.itchLevel > 0 ||
        record.painLevel > 0 ||
        record.rednessLevel > 1 ||
        record.bumpLevel !== 2 ||
        Object.values(record.routine).some(Boolean)
      );
      setSkinPending(pending);
    };

    loadSkinReminder();
  }, []);

  useEffect(() => {
    const loadReminderHighlights = async () => {
      const now = dayjs();
      const reminders = await getReminders();
      const active = reminders.filter((item) => !item.completed);
      const overdue = active.filter((item) => dayjs(item.remindAt).isBefore(now));
      const todayUpcoming = active.filter((item) => {
        const at = dayjs(item.remindAt);
        return at.isAfter(now) && at.diff(now, 'hour', true) <= 24;
      });
      const next = active.filter((item) => dayjs(item.remindAt).isAfter(now));
      setReminderHighlights([...overdue, ...todayUpcoming, ...next].slice(0, 2));
    };

    loadReminderHighlights();
    window.addEventListener('reminderUpdated', loadReminderHighlights);
    return () => window.removeEventListener('reminderUpdated', loadReminderHighlights);
  }, []);

  const quickTools = quickIds
    .map(id => ALL_TOOLS.find(t => t.id === id))
    .filter((t): t is ToolDef => !!t);

  const openEditor = () => {
    setEditIds([...quickIds]);
    setShowEditor(true);
  };

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const sortListRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const itemRects = useRef<DOMRect[]>([]);

  const toggleTool = (id: string) => {
    setEditIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= editIds.length) return;
    setEditIds(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleDragStart = (idx: number, clientY: number) => {
    setDragIdx(idx);
    setDragOverIdx(idx);
    dragStartY.current = clientY;
    if (sortListRef.current) {
      const items = sortListRef.current.querySelectorAll('.tool-sort-item');
      itemRects.current = Array.from(items).map(el => el.getBoundingClientRect());
    }
  };

  const handleDragMove = (clientY: number) => {
    if (dragIdx === null) return;
    const rects = itemRects.current;
    if (rects.length === 0) return;
    let newIdx = dragIdx;
    for (let i = 0; i < rects.length; i++) {
      const mid = rects[i].top + rects[i].height / 2;
      if (clientY < mid) {
        newIdx = i;
        break;
      }
      newIdx = i;
      if (clientY >= mid) newIdx = i;
    }
    if (clientY > rects[rects.length - 1].top + rects[rects.length - 1].height / 2) {
      newIdx = rects.length - 1;
    }
    setDragOverIdx(newIdx);
  };

  const handleDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      moveItem(dragIdx, dragOverIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const saveEdit = async () => {
    await saveQuickToolIds(editIds);
    setQuickIds(editIds);
    setShowEditor(false);
  };

  const today = dayjs();

  return (
    <div className="page">
      <div className="page-content">
        <div className="home-header">
          <div className="home-header-bg" />
          <div className="home-header-content">
            <div className="home-eyebrow">TOOL APP</div>
            <div className="home-greeting">{getGreeting()}</div>
            <div className="home-lead">把提醒、纪念日和常用工具收进一个更安静但更锋利的工作台。</div>
            <div className="home-meta-row">
              <div className="home-date">
                {today.format('YYYY年M月D日')} {getWeekDay(today.day())}
              </div>
              <div className="home-inline-chip">
                <Compass size={14} />
                {quickTools.length} 个常用入口
              </div>
            </div>
            <div className="home-hero-actions">
              <button className="home-hero-btn primary" onClick={() => navigate('/toolbox')}>
                全部工具
              </button>
              <button className="home-hero-btn" onClick={() => navigate('/tool/reminder')}>
                我的提醒
              </button>
            </div>
          </div>
        </div>

        {reminderHighlights.length > 0 && (
          <div className="home-section fade-in">
            <div className="section-header">
              <div className="section-title">
                <BellRing size={18} />
                <span>提醒你</span>
              </div>
              <button className="section-more" onClick={() => navigate('/tool/reminder')}>
                去处理 <ChevronRight size={16} />
              </button>
            </div>
            <div className="reminder-highlight-list">
              {reminderHighlights.map((item) => {
                const isOverdue = dayjs(item.remindAt).isBefore(dayjs());
                return (
                  <div
                    key={item.id}
                    className={`reminder-highlight-card ${isOverdue ? 'overdue' : item.level}`}
                    onClick={() => navigate('/tool/reminder')}
                  >
                    <div className="reminder-highlight-icon">
                      {isOverdue ? <CircleAlert size={20} /> : <BellRing size={20} />}
                    </div>
                    <div className="reminder-highlight-info">
                      <div className="reminder-highlight-title">{item.title}</div>
                      <div className="reminder-highlight-meta">
                        {isOverdue ? '已过时间' : dayjs(item.remindAt).format('今天 HH:mm')}
                        <span className={`reminder-highlight-badge ${item.level}`}>
                          {item.level === 'urgent' ? '紧急' : item.level === 'important' ? '重要' : '普通'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
            <div className="section-header-actions">
              <button className="section-edit-btn" onClick={openEditor}>
                <Settings2 size={16} />
              </button>
              <button className="section-more" onClick={() => navigate('/toolbox')}>
                全部工具 <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="quick-grid">
            {quickTools.map(tool => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  className="quick-item"
                  onClick={() => navigate(tool.path)}
                >
                  <div className="quick-icon-wrap">
                    <div className="quick-icon" style={{ background: `${tool.color}12`, color: tool.color }}>
                      <Icon size={22} />
                    </div>
                    {tool.id === 'skin' && skinPending && <span className="quick-badge">1</span>}
                    {tool.id === 'reminder' && reminderHighlights.length > 0 && <span className="quick-badge">{reminderHighlights.length}</span>}
                  </div>
                  <span className="quick-name">{tool.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showEditor && (
        <div className="tool-editor-overlay" onClick={() => setShowEditor(false)}>
          <div className="tool-editor-sheet" onClick={e => e.stopPropagation()}>
            <div className="tool-editor-header">
              <button className="tool-editor-close" onClick={() => setShowEditor(false)}>
                <X size={20} />
              </button>
              <span className="tool-editor-title">自定义常用工具</span>
              <button className="tool-editor-save" onClick={saveEdit}>
                <Check size={20} />
              </button>
            </div>
            <p className="tool-editor-hint">点击选择工具，拖拽或箭头调整顺序</p>

            {editIds.length > 0 && (
              <div className="tool-sort-section">
                <div className="tool-sort-label">已选 {editIds.length} 个（拖拽排序）</div>
                <div
                  className="tool-sort-list"
                  ref={sortListRef}
                  onTouchMove={e => handleDragMove(e.touches[0].clientY)}
                  onTouchEnd={handleDragEnd}
                  onMouseMove={e => { if (dragIdx !== null) handleDragMove(e.clientY); }}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                >
                  {editIds.map((id, idx) => {
                    const tool = ALL_TOOLS.find(t => t.id === id);
                    if (!tool) return null;
                    const Icon = tool.icon;
                    const isDragging = dragIdx === idx;
                    const isOver = dragOverIdx === idx && dragIdx !== null && dragIdx !== idx;
                    return (
                      <div
                        key={id}
                        className={`tool-sort-item ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
                      >
                        <div
                          className="tool-sort-handle"
                          onTouchStart={e => handleDragStart(idx, e.touches[0].clientY)}
                          onMouseDown={e => handleDragStart(idx, e.clientY)}
                        >
                          <GripVertical size={16} />
                        </div>
                        <div className="tool-sort-icon" style={{ background: `${tool.color}12`, color: tool.color }}>
                          <Icon size={18} />
                        </div>
                        <span className="tool-sort-name">{tool.name}</span>
                        <div className="tool-sort-arrows">
                          <button
                            className="tool-sort-arrow"
                            onClick={() => moveItem(idx, idx - 1)}
                            disabled={idx === 0}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            className="tool-sort-arrow"
                            onClick={() => moveItem(idx, idx + 1)}
                            disabled={idx === editIds.length - 1}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                        <button className="tool-sort-remove" onClick={() => toggleTool(id)}>
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="tool-editor-grid">
              {ALL_TOOLS.filter(t => !editIds.includes(t.id)).map(tool => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.id}
                    className="tool-editor-item"
                    onClick={() => toggleTool(tool.id)}
                  >
                    <div className="tool-editor-icon" style={{ background: `${tool.color}12`, color: tool.color }}>
                      <Icon size={20} />
                    </div>
                    <span className="tool-editor-name">{tool.name}</span>
                  </div>
                );
              })}
            </div>
            {ALL_TOOLS.filter(t => !editIds.includes(t.id)).length > 0 && (
              <div className="tool-editor-add-hint">点击上方工具添加到常用</div>
            )}
          </div>
        </div>
      )}
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
