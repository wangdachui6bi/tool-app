import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { getCountdowns, addCountdown, deleteCountdown } from '../stores/countdownStore';
import { generateId } from '../stores/eventStore';
import type { CountdownEvent } from '../types';
import './Countdown.css';

const ICON_OPTIONS = ['📅', '🎓', '✈️', '🏠', '💼', '🎉', '🎯', '🏆', '🎊', '💝'];

export default function Countdown() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CountdownEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    targetDate: dayjs().format('YYYY-MM-DD'),
    icon: '📅',
    note: '',
  });

  const loadData = useCallback(async () => {
    const list = await getCountdowns();
    const sorted = [...list].sort((a, b) => {
      const da = dayjs(a.targetDate);
      const db = dayjs(b.targetDate);
      return da.diff(db);
    });
    setItems(sorted);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const event: CountdownEvent = {
      id: generateId(),
      name: form.name.trim(),
      targetDate: form.targetDate,
      icon: form.icon,
      note: form.note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await addCountdown(event);
    setForm({ name: '', targetDate: dayjs().format('YYYY-MM-DD'), icon: '📅', note: '' });
    setShowModal(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个倒数日吗？')) return;
    await deleteCountdown(id);
    loadData();
  };

  const getDaysRemaining = (targetDate: string) => {
    const target = dayjs(targetDate).startOf('day');
    const today = dayjs().startOf('day');
    return target.diff(today, 'day');
  };

  const formatTargetDate = (dateStr: string) => {
    const d = dayjs(dateStr);
    return `${d.year()}年${d.month() + 1}月${d.date()}日`;
  };

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">倒数日</span>
        <button className="countdown-add-btn" onClick={() => setShowModal(true)}>
          <Plus size={22} />
        </button>
      </div>

      <div className="page-content no-tab">
        {items.length === 0 ? (
          <div className="countdown-empty fade-in">
            <div className="countdown-empty-icon">📅</div>
            <p className="countdown-empty-text">还没有倒数日</p>
            <button className="countdown-empty-btn" onClick={() => setShowModal(true)}>
              <Plus size={20} /> 添加
            </button>
          </div>
        ) : (
          <div className="countdown-list fade-in">
            {items.map((item) => {
              const days = getDaysRemaining(item.targetDate);
              const isToday = days === 0;
              const isPast = days < 0;
              return (
                <div
                  key={item.id}
                  className={`countdown-card ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}`}
                >
                  <div className="countdown-card-main">
                    <div className="countdown-card-icon">{item.icon || '📅'}</div>
                    <div className="countdown-card-info">
                      <div className="countdown-card-name">{item.name}</div>
                      <div className="countdown-card-date">{formatTargetDate(item.targetDate)}</div>
                      {item.note && (
                        <div className="countdown-card-note">{item.note}</div>
                      )}
                    </div>
                    <div className="countdown-card-right">
                      {isPast ? (
                        <span className="countdown-past">已过 {Math.abs(days)} 天</span>
                      ) : isToday ? (
                        <span className="countdown-today-badge">今天</span>
                      ) : (
                        <div className="countdown-days">
                          <span className="countdown-days-num">{days}</span>
                          <span className="countdown-days-label">天</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="countdown-delete-btn"
                    onClick={() => handleDelete(item.id)}
                    aria-label="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="countdown-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="countdown-modal" onClick={(e) => e.stopPropagation()}>
            <div className="countdown-modal-title">添加倒数日</div>
            <div className="countdown-form">
              <div className="countdown-form-row">
                <label>名称</label>
                <input
                  type="text"
                  placeholder="例如：高考"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="countdown-form-row">
                <label>日期</label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                />
              </div>
              <div className="countdown-form-row">
                <label>图标</label>
                <div className="countdown-emoji-picker">
                  {ICON_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`countdown-emoji-btn ${form.icon === emoji ? 'selected' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="countdown-form-row">
                <label>备注</label>
                <textarea
                  placeholder="可选"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <div className="countdown-modal-actions">
              <button className="countdown-modal-cancel" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button
                className="countdown-modal-save"
                onClick={handleSave}
                disabled={!form.name.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
