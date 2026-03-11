import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './RandomPick.css';

const TEMPLATES = [
  {
    label: '今天吃什么',
    options: ['火锅', '烧烤', '麻辣烫', '炒菜', '面条', '饺子'],
  },
  {
    label: '做什么运动',
    options: ['跑步', '游泳', '瑜伽', '跳绳', '骑行'],
  },
];

const SPIN_DURATION = 1500;
const SPIN_INTERVAL = 80;

export default function RandomPick() {
  const navigate = useNavigate();
  const [optionsText, setOptionsText] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayOption, setDisplayOption] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const options = optionsText
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean);

  const applyTemplate = useCallback((opts: string[]) => {
    setOptionsText(opts.join('\n'));
    setResult(null);
    setDisplayOption(null);
  }, []);

  const startPick = useCallback(() => {
    if (options.length < 2 || isSpinning) return;
    setIsSpinning(true);
    setResult(null);
    let elapsed = 0;
    const tick = () => {
      const idx = Math.floor(Math.random() * options.length);
      setDisplayOption(options[idx]);
    };
    tick();
    intervalRef.current = setInterval(() => {
      elapsed += SPIN_INTERVAL;
      tick();
      if (elapsed >= SPIN_DURATION) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        const finalIdx = Math.floor(Math.random() * options.length);
        const final = options[finalIdx];
        setResult(final);
        setDisplayOption(final);
        setIsSpinning(false);
      }
    }, SPIN_INTERVAL);
  }, [options, isSpinning]);

  const reset = useCallback(() => {
    setResult(null);
    setDisplayOption(null);
  }, []);

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">随机决策</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab random-pick-content">
        <div className="pick-templates">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              className="pick-chip"
              onClick={() => applyTemplate(t.options)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          className="pick-textarea"
          placeholder={'每行输入一个选项\n例如：\n火锅\n烧烤\n麻辣烫'}
          value={optionsText}
          onChange={(e) => {
            setOptionsText(e.target.value);
            setResult(null);
            setDisplayOption(null);
          }}
          rows={6}
          disabled={isSpinning}
        />

        <button
          className="pick-start-btn"
          onClick={startPick}
          disabled={options.length < 2 || isSpinning}
        >
          {isSpinning ? '抽选中...' : '开始'}
        </button>

        {(displayOption !== null || result !== null) && (
          <div className={`pick-result-card ${result ? 'scale-in' : ''}`}>
            <div className="pick-result-label">
              {result ? '结果' : '抽选中'}
            </div>
            <div className="pick-result-value">{displayOption}</div>
            {result && (
              <button className="pick-again-btn" onClick={reset}>
                再来一次
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
