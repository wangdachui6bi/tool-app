import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Pomodoro.css';

type Mode = 'focus' | 'shortBreak' | 'longBreak';

const MODES: { key: Mode; label: string; duration: number }[] = [
  { key: 'focus', label: '专注 25min', duration: 25 * 60 },
  { key: 'shortBreak', label: '短休息 5min', duration: 5 * 60 },
  { key: 'longBreak', label: '长休息 15min', duration: 15 * 60 },
];

const CIRCLE_R = 54;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

export default function Pomodoro() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('focus');
  const [remaining, setRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const modeConfig = MODES.find((m) => m.key === mode)!;
  const totalSeconds = modeConfig.duration;
  const progressPercent = (remaining / totalSeconds) * 100;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progressPercent / 100);

  const resetTimer = useCallback(() => {
    setRemaining(modeConfig.duration);
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [modeConfig.duration]);

  const switchMode = useCallback((newMode: Mode) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const config = MODES.find((m) => m.key === newMode)!;
    setMode(newMode);
    setRemaining(config.duration);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
          if (mode === 'focus') {
            setCompletedCount((c) => c + 1);
            setMode('shortBreak');
            return 5 * 60;
          } else {
            setMode('focus');
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const timeStr = `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  const isBreak = mode === 'shortBreak' || mode === 'longBreak';
  const ringColor = isBreak ? 'var(--success)' : 'var(--primary)';

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">番茄钟</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab pomodoro-content">
        <div className="pomo-modes">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`pomo-mode-btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => switchMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="pomo-timer-wrap">
          <svg className="pomo-ring" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={CIRCLE_R}
              fill="none"
              stroke="var(--border)"
              strokeWidth="6"
            />
            <circle
              cx="60"
              cy="60"
              r={CIRCLE_R}
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="pomo-time">{timeStr}</div>
        </div>

        <div className="pomo-status">
          {isBreak ? '休息中' : '专注中'}
        </div>

        <div className="pomo-actions">
          <button
            className="pomo-primary-btn"
            onClick={() => setIsRunning((r) => !r)}
          >
            {isRunning ? '暂停' : '开始'}
          </button>
          <button className="pomo-reset-btn" onClick={resetTimer}>
            重置
          </button>
        </div>

        <div className="pomo-counter">
          已完成 {completedCount} 个番茄
        </div>
      </div>
    </div>
  );
}
