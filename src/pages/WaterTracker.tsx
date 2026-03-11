import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import dayjs from 'dayjs';
import { getWaterByDate, addWater, setWaterGoal } from '../stores/waterStore';
import './WaterTracker.css';

const QUICK_AMOUNTS = [100, 200, 250, 500];

function getMotivationalMessage(pct: number): string {
  if (pct >= 100) return '达标啦🎉';
  if (pct >= 75) return '就差一点🔥';
  if (pct >= 50) return '快到了🎯';
  if (pct >= 25) return '不错哦👍';
  return '继续加油💪';
}

export default function WaterTracker() {
  const navigate = useNavigate();
  const today = dayjs().format('YYYY-MM-DD');
  const [record, setRecord] = useState({ amount: 0, goal: 2000, logs: [] as { time: string; amount: number }[] });
  const [customMl, setCustomMl] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('2000');

  const loadData = useCallback(async () => {
    const r = await getWaterByDate(today);
    setRecord(r);
    setGoalInput(String(r.goal));
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (ml: number) => {
    await addWater(today, ml);
    loadData();
  };

  const handleCustomAdd = async () => {
    const val = parseInt(customMl, 10);
    if (isNaN(val) || val <= 0) return;
    await addWater(today, val);
    setCustomMl('');
    loadData();
  };

  const handleSaveGoal = async () => {
    const val = parseInt(goalInput, 10);
    if (isNaN(val) || val <= 0) return;
    await setWaterGoal(today, val);
    setEditingGoal(false);
    loadData();
  };

  const pct = record.goal > 0 ? Math.min(100, (record.amount / record.goal) * 100) : 0;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">喝水记录</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab water-tracker-content">
        <div className="water-progress-wrap fade-in">
          <svg className="water-progress-ring" viewBox="0 0 200 200">
            <circle
              className="water-progress-bg"
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="12"
            />
            <circle
              className="water-progress-fill"
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="water-progress-center">
            {editingGoal ? (
              <div className="water-goal-edit">
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onBlur={handleSaveGoal}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                  autoFocus
                  min={1}
                />
                <span className="water-goal-unit">ml</span>
              </div>
            ) : (
              <div
                className="water-progress-text"
                onClick={() => setEditingGoal(true)}
              >
                <span className="water-amount">{record.amount}</span>
                <span className="water-sep"> / </span>
                <span className="water-goal">{record.goal}</span>
                <span className="water-unit"> ml</span>
              </div>
            )}
          </div>
        </div>

        <p className="water-motivation">{getMotivationalMessage(pct)}</p>

        <div className="water-quick-btns">
          {QUICK_AMOUNTS.map((ml) => (
            <button
              key={ml}
              className="water-quick-btn"
              onClick={() => handleAdd(ml)}
            >
              +{ml}ml
            </button>
          ))}
        </div>

        <div className="water-custom-add">
          <input
            type="number"
            placeholder="自定义 ml"
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomAdd()}
          />
          <button
            className="water-custom-btn"
            onClick={handleCustomAdd}
            disabled={!customMl.trim()}
          >
            添加
          </button>
        </div>

        <div className="water-logs-section">
          <h3 className="water-logs-title">今日记录</h3>
          {record.logs.length === 0 ? (
            <p className="water-logs-empty">还没有喝水记录</p>
          ) : (
            <div className="water-logs-list">
              {[...record.logs].reverse().map((log, i) => (
                <div key={i} className="water-log-item">
                  <span className="water-log-time">
                    {dayjs(log.time).format('HH:mm')}
                  </span>
                  <span className="water-log-amount">+{log.amount} ml</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
