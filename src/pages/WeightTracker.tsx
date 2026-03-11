import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { getWeightEntries, addWeightEntry, deleteWeightEntry } from '../stores/weightStore';
import { generateId } from '../stores/eventStore';
import type { WeightEntry } from '../types';
import './WeightTracker.css';

export default function WeightTracker() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));

  const loadData = useCallback(async () => {
    const list = await getWeightEntries();
    setEntries(list);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;
    const entry: WeightEntry = {
      id: generateId(),
      date,
      weight: w,
    };
    await addWeightEntry(entry);
    setWeight('');
    setDate(dayjs().format('YYYY-MM-DD'));
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条记录吗？')) return;
    await deleteWeightEntry(id);
    loadData();
  };

  const currentWeight = entries.length > 0 ? entries[entries.length - 1].weight : null;
  const weights = entries.map((e) => e.weight);
  const minWeight = weights.length > 0 ? Math.min(...weights) : 50;
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 80;
  const avgWeight =
    weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null;

  const chartOption = {
    grid: { top: 20, right: 20, bottom: 30, left: 45 },
    xAxis: {
      type: 'category' as const,
      data: entries.map((e) => dayjs(e.date).format('M/D')),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const,
      min: minWeight - 2,
      max: maxWeight + 2,
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'line' as const,
        data: weights,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#6366F1', width: 2 },
        itemStyle: { color: '#6366F1' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99,102,241,0.3)' },
              { offset: 1, color: 'rgba(99,102,241,0.02)' },
            ],
          },
        },
      },
    ],
    tooltip: { trigger: 'axis' as const },
  };

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">体重记录</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab weight-tracker-content">
        <div className="weight-input-section card fade-in">
          <div className="weight-input-row">
            <div className="weight-input-group">
              <label>体重 (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="weight-input-group">
              <label>日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <button
            className="weight-record-btn"
            onClick={handleAdd}
            disabled={!weight.trim()}
          >
            记录
          </button>
        </div>

        <div className="weight-stats card fade-in">
          <div className="weight-stat">
            <span className="weight-stat-label">当前体重</span>
            <span className="weight-stat-value">
              {currentWeight != null ? `${currentWeight} kg` : '-'}
            </span>
          </div>
          <div className="weight-stat">
            <span className="weight-stat-label">最高</span>
            <span className="weight-stat-value">
              {weights.length > 0 ? `${Math.max(...weights)} kg` : '-'}
            </span>
          </div>
          <div className="weight-stat">
            <span className="weight-stat-label">最低</span>
            <span className="weight-stat-value">
              {weights.length > 0 ? `${Math.min(...weights)} kg` : '-'}
            </span>
          </div>
          <div className="weight-stat">
            <span className="weight-stat-label">平均</span>
            <span className="weight-stat-value">
              {avgWeight != null ? `${avgWeight.toFixed(1)} kg` : '-'}
            </span>
          </div>
        </div>

        <div className="weight-chart-section card fade-in">
          {entries.length < 2 ? (
            <p className="weight-chart-placeholder">至少需要2条记录才能显示趋势图</p>
          ) : (
            <ReactECharts option={chartOption} style={{ height: 220 }} />
          )}
        </div>

        <div className="weight-entries-section">
          <h3 className="weight-entries-title">最近记录</h3>
          {entries.length === 0 ? (
            <p className="weight-entries-empty">还没有体重记录</p>
          ) : (
            <div className="weight-entries-list">
              {[...entries].reverse().map((entry) => (
                <div key={entry.id} className="weight-entry-item card">
                  <span className="weight-entry-date">
                    {dayjs(entry.date).format('YYYY年M月D日')}
                  </span>
                  <span className="weight-entry-weight">{entry.weight} kg</span>
                  <button
                    className="weight-entry-delete"
                    onClick={() => handleDelete(entry.id)}
                    aria-label="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
