import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import dayjs from 'dayjs';
import { addEvent, updateEvent, getEventById, generateId } from '../stores/eventStore';
import { getEventTypeIcon, solarToLunarInfo, lunarToSolarDate, getLunarDateStr, getLunarMonthDays } from '../utils/dateHelpers';
import type { EventType, CalendarMode, MemorialEvent } from '../types';
import './AddEvent.css';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'birthday', label: '生日' },
  { value: 'anniversary', label: '纪念日' },
  { value: 'memorial', label: '忌日' },
  { value: 'custom', label: '自定义' },
];

const EMOJI_OPTIONS = ['🎂', '💕', '🎉', '🌹', '⭐', '🎁', '🕯️', '💍', '👶', '🏠', '🎓', '💼', '✈️', '🌸', '🎵', '❤️'];

const LUNAR_MONTHS = [
  { value: 1, label: '正月' }, { value: 2, label: '二月' }, { value: 3, label: '三月' },
  { value: 4, label: '四月' }, { value: 5, label: '五月' }, { value: 6, label: '六月' },
  { value: 7, label: '七月' }, { value: 8, label: '八月' }, { value: 9, label: '九月' },
  { value: 10, label: '十月' }, { value: 11, label: '冬月' }, { value: 12, label: '腊月' },
];

const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

export default function AddEvent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('birthday');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('solar');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [lunarYear, setLunarYear] = useState(dayjs().year());
  const [lunarMonth, setLunarMonth] = useState(1);
  const [lunarDay, setLunarDay] = useState(1);
  const [repeatYearly, setRepeatYearly] = useState(true);
  const [enableReminder, setEnableReminder] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);
  const [note, setNote] = useState('');
  const [icon, setIcon] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);

  const lunarMaxDays = useMemo(() => getLunarMonthDays(lunarYear, lunarMonth), [lunarYear, lunarMonth]);

  useEffect(() => {
    if (lunarDay > lunarMaxDays) setLunarDay(lunarMaxDays);
  }, [lunarMaxDays, lunarDay]);

  const lunarSolarPreview = useMemo(() => {
    if (calendarMode !== 'lunar') return null;
    const result = lunarToSolarDate(lunarYear, lunarMonth, lunarDay);
    if (!result) return null;
    return `对应阳历: ${result.year}年${result.month}月${result.day}日`;
  }, [calendarMode, lunarYear, lunarMonth, lunarDay]);

  const solarLunarPreview = useMemo(() => {
    if (calendarMode !== 'solar') return null;
    const d = dayjs(date);
    if (!d.isValid()) return null;
    const info = solarToLunarInfo(d.year(), d.month() + 1, d.date());
    return info ? info.str : null;
  }, [calendarMode, date]);

  useEffect(() => {
    if (isEdit && id) {
      getEventById(id).then(event => {
        if (event) {
          setName(event.name);
          setType(event.type);
          setCalendarMode(event.calendarMode || 'solar');
          setDate(dayjs(event.date).format('YYYY-MM-DD'));
          setRepeatYearly(event.repeatYearly);
          setEnableReminder(event.enableReminder);
          setReminderDays(event.reminderDays);
          setNote(event.note || '');
          setIcon(event.icon || '');
          if (event.calendarMode === 'lunar' && event.lunarMonth && event.lunarDay) {
            setLunarMonth(event.lunarMonth);
            setLunarDay(event.lunarDay);
            const origDate = dayjs(event.date);
            const info = solarToLunarInfo(origDate.year(), origDate.month() + 1, origDate.date());
            if (info) setLunarYear(info.year);
          }
        }
      });
    }
  }, [id, isEdit]);

  const handleSave = async () => {
    if (!name.trim()) return;

    let solarDate: string;
    let lMonth: number | undefined;
    let lDay: number | undefined;

    if (calendarMode === 'lunar') {
      lMonth = lunarMonth;
      lDay = lunarDay;
      const result = lunarToSolarDate(lunarYear, lunarMonth, lunarDay);
      if (result) {
        solarDate = dayjs(`${result.year}-${result.month}-${result.day}`).toISOString();
      } else {
        return;
      }
    } else {
      solarDate = dayjs(date).toISOString();
    }

    const event: MemorialEvent = {
      id: isEdit ? id! : generateId(),
      name: name.trim(),
      date: solarDate,
      type,
      calendarMode,
      lunarMonth: lMonth,
      lunarDay: lDay,
      repeatYearly,
      enableReminder,
      reminderDays,
      note: note.trim() || undefined,
      icon: icon || undefined,
      createdAt: isEdit ? '' : new Date().toISOString(),
    };

    if (isEdit) {
      const existing = await getEventById(id!);
      if (existing) event.createdAt = existing.createdAt;
      await updateEvent(event);
    } else {
      await addEvent(event);
    }

    window.dispatchEvent(new Event('eventUpdated'));
    navigate(-1);
  };

  const lunarYearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = 1920; y <= 2100; y++) years.push(y);
    return years;
  }, []);

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">{isEdit ? '编辑纪念日' : '添加纪念日'}</span>
        <button
          className="add-save"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          <Check size={22} />
        </button>
      </div>

      <div className="page-content no-tab">
        <div className="add-form fade-in">
          <div className="form-section">
            <div className="form-icon-row" onClick={() => setShowEmoji(!showEmoji)}>
              <div className="form-icon-preview">
                {icon || getEventTypeIcon(type)}
              </div>
              <span className="form-icon-hint">点击选择图标</span>
            </div>
            {showEmoji && (
              <div className="emoji-grid">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    className={`emoji-item ${icon === e ? 'selected' : ''}`}
                    onClick={() => { setIcon(e); setShowEmoji(false); }}
                  >
                    {e}
                  </button>
                ))}
                {icon && (
                  <button
                    className="emoji-item emoji-clear"
                    onClick={() => { setIcon(''); setShowEmoji(false); }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">名称</label>
            <input
              className="form-input"
              placeholder="例如：爸爸生日"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="form-section">
            <label className="form-label">类型</label>
            <div className="type-grid">
              {EVENT_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`type-chip ${type === t.value ? 'active' : ''}`}
                  onClick={() => setType(t.value)}
                >
                  <span className="type-emoji">{getEventTypeIcon(t.value)}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">日历类型</label>
            <div className="calendar-mode-toggle">
              <button
                className={`mode-btn ${calendarMode === 'solar' ? 'active' : ''}`}
                onClick={() => setCalendarMode('solar')}
              >
                ☀️ 阳历
              </button>
              <button
                className={`mode-btn ${calendarMode === 'lunar' ? 'active' : ''}`}
                onClick={() => setCalendarMode('lunar')}
              >
                🌙 农历
              </button>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">日期</label>
            {calendarMode === 'solar' ? (
              <>
                <input
                  className="form-input"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
                {solarLunarPreview && (
                  <div className="date-preview">🌙 {solarLunarPreview}</div>
                )}
              </>
            ) : (
              <>
                <div className="lunar-picker">
                  <select
                    className="lunar-select"
                    value={lunarYear}
                    onChange={e => setLunarYear(Number(e.target.value))}
                  >
                    {lunarYearOptions.map(y => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                  <select
                    className="lunar-select"
                    value={lunarMonth}
                    onChange={e => setLunarMonth(Number(e.target.value))}
                  >
                    {LUNAR_MONTHS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    className="lunar-select"
                    value={lunarDay}
                    onChange={e => setLunarDay(Number(e.target.value))}
                  >
                    {Array.from({ length: lunarMaxDays }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{LUNAR_DAYS[d - 1]}</option>
                    ))}
                  </select>
                </div>
                <div className="lunar-preview-label">
                  {getLunarDateStr(lunarMonth, lunarDay)}
                </div>
                {lunarSolarPreview && (
                  <div className="date-preview">☀️ {lunarSolarPreview}</div>
                )}
              </>
            )}
          </div>

          <div className="form-section">
            <div className="form-row">
              <span className="form-label-inline">每年重复</span>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={repeatYearly}
                  onChange={e => setRepeatYearly(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row">
              <span className="form-label-inline">提前提醒</span>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={enableReminder}
                  onChange={e => setEnableReminder(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            {enableReminder && (
              <div className="reminder-days">
                <span className="reminder-text">提前</span>
                <div className="reminder-btns">
                  {[1, 3, 7, 14, 30].map(d => (
                    <button
                      key={d}
                      className={`reminder-btn ${reminderDays === d ? 'active' : ''}`}
                      onClick={() => setReminderDays(d)}
                    >
                      {d}天
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">备注</label>
            <textarea
              className="form-textarea"
              placeholder="可选备注..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
