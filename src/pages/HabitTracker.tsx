import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import dayjs from 'dayjs';
import { getHabits, addHabit, deleteHabit, getChecks, toggleCheck, getStreak } from '../stores/habitStore';
import { generateId } from '../stores/eventStore';
import type { Habit } from '../types';
import './HabitTracker.css';

const EMOJI_OPTIONS = ['💪', '🏃‍♂️', '📚', '🧘‍♀️', '💧', '🍎', '😴', '🎯', '✍️', '🏋️‍♂️', '🧹', '🎵'];
const COLOR_PRESETS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日'];

function getWeekDates(): string[] {
  const d = dayjs().day();
  const start = dayjs().subtract(d === 0 ? 6 : d - 1, 'day');
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
}

export default function HabitTracker() {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('💪');
  const [formColor, setFormColor] = useState(COLOR_PRESETS[0]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const today = dayjs().format('YYYY-MM-DD');
  const weekDates = getWeekDates();

  const loadData = useCallback(async () => {
    const [hList, cList] = await Promise.all([getHabits(), getChecks()]);
    setHabits(hList);
    const map: Record<string, boolean> = {};
    cList.forEach(c => { map[`${c.habitId}-${c.date}`] = true; });
    setChecks(map);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleCheck = async (habitId: string) => {
    const key = `${habitId}-${today}`;
    const checked = await toggleCheck(habitId, today);
    setChecks(prev => ({ ...prev, [key]: checked }));
  };

  const handleAddHabit = async () => {
    if (!formName.trim()) return;
    const habit: Habit = {
      id: generateId(),
      name: formName.trim(),
      icon: formIcon,
      color: formColor,
      createdAt: new Date().toISOString(),
    };
    await addHabit(habit);
    setFormName('');
    setFormIcon('💪');
    setFormColor(COLOR_PRESETS[0]);
    setShowForm(false);
    loadData();
  };

  const handleDeleteHabit = async (id: string) => {
    const confirmed = deleteConfirm === id;
    if (confirmed) {
      await deleteHabit(id);
      setDeleteConfirm(null);
      loadData();
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const isChecked = (habitId: string, date: string) => !!checks[`${habitId}-${date}`];
  const hasAnyCheckForDate = (date: string) =>
    habits.some(h => isChecked(h.id, date));

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">习惯打卡</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab habit-content">
        <div className="habit-date-display fade-in">
          {dayjs().format('M月D日')} · {['周日','周一','周二','周三','周四','周五','周六'][dayjs().day()]}
        </div>

        <div className="habit-week-strip fade-in">
          {weekDates.map((date, i) => (
            <div
              key={date}
              className={`habit-day-cell ${date === today ? 'today' : ''} ${hasAnyCheckForDate(date) ? 'has-dot' : ''}`}
            >
              <span className="habit-day-label">{WEEK_DAYS[i]}</span>
              <span className="habit-day-num">{dayjs(date).date()}</span>
              {hasAnyCheckForDate(date) && <span className="habit-day-dot" />}
            </div>
          ))}
        </div>

        <div className="habit-list">
          {habits.map(habit => {
            const checked = isChecked(habit.id, today);
            const habitCheckDates = Object.entries(checks)
              .filter(([, v]) => v)
              .map(([k]) => {
                const parts = k.split('-');
                return { habitId: parts[0], date: parts.slice(1).join('-') };
              })
              .filter(c => c.habitId === habit.id);
            const streak = getStreak(habitCheckDates, habit.id);
            const isDeleting = deleteConfirm === habit.id;

            return (
              <div
                key={habit.id}
                className={`habit-card card fade-in ${isDeleting ? 'habit-card-deleting' : ''}`}
              >
                <div className="habit-card-main">
                  <div
                    className="habit-icon-wrap"
                    style={{ background: `${habit.color}20`, color: habit.color }}
                  >
                    {habit.icon}
                  </div>
                  <div className="habit-info">
                    <div className="habit-name">{habit.name}</div>
                    <div className="habit-streak">
                      🔥 连续{streak}天
                    </div>
                  </div>
                  <button
                    className={`habit-check-btn ${checked ? 'checked' : ''}`}
                    onClick={() => handleToggleCheck(habit.id)}
                    style={checked ? { background: habit.color } : undefined}
                  >
                    {checked ? <Check size={24} strokeWidth={3} color="#fff" /> : null}
                  </button>
                </div>
                <div className="habit-card-actions">
                  {isDeleting ? (
                    <button
                      className="habit-delete-confirm"
                      onClick={() => handleDeleteHabit(habit.id)}
                    >
                      确认删除
                    </button>
                  ) : (
                    <button
                      className="habit-delete-btn"
                      onClick={() => handleDeleteHabit(habit.id)}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="habit-spacer" />
      </div>

      {showForm && (
        <div className="habit-form-overlay" onClick={() => setShowForm(false)}>
          <div className="habit-form slide-up" onClick={e => e.stopPropagation()}>
            <div className="habit-form-title">添加习惯</div>
            <input
              className="habit-form-input"
              placeholder="习惯名称"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              maxLength={20}
            />
            <div className="habit-form-emoji-grid">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  className={`habit-form-emoji ${formIcon === e ? 'selected' : ''}`}
                  onClick={() => setFormIcon(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="habit-form-colors">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  className={`habit-form-color ${formColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setFormColor(c)}
                />
              ))}
            </div>
            <button
              className="habit-form-submit"
              onClick={handleAddHabit}
              disabled={!formName.trim()}
            >
              添加
            </button>
          </div>
        </div>
      )}

      <button className="habit-add-fab" onClick={() => setShowForm(true)}>
        + 添加习惯
      </button>
    </div>
  );
}
