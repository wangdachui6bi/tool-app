import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { getAllEvents, deleteEvents } from '../stores/eventStore';
import { sortByCountdown, getEventTypeIcon, getEventTypeLabel, getYearLabel } from '../utils/dateHelpers';
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
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

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

  const enterBatchMode = () => {
    setBatchMode(true);
    setSelected(new Set());
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(i => i.event.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    await deleteEvents(Array.from(selected));
    window.dispatchEvent(new Event('eventUpdated'));
    setShowConfirm(false);
    exitBatchMode();
    loadData();
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="anni-header">
          <h1 className="anni-title">纪念日</h1>
          <div className="anni-header-actions">
            {!batchMode ? (
              <>
                {items.length > 0 && (
                  <button className="anni-manage-btn" onClick={enterBatchMode}>
                    管理
                  </button>
                )}
                <button className="anni-add-btn" onClick={() => navigate('/anniversary/add')}>
                  <Plus size={20} />
                </button>
              </>
            ) : (
              <button className="anni-cancel-btn" onClick={exitBatchMode}>
                <X size={16} />
                <span>取消</span>
              </button>
            )}
          </div>
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

        {batchMode && filtered.length > 0 && (
          <div className="anni-batch-bar fade-in">
            <button className="anni-batch-select-all" onClick={toggleSelectAll}>
              {selected.size === filtered.length ? <CheckSquare size={18} /> : <Square size={18} />}
              <span>{selected.size === filtered.length ? '取消全选' : '全选'}</span>
            </button>
            <span className="anni-batch-count">已选 {selected.size} 项</span>
            <button
              className="anni-batch-delete-btn"
              onClick={() => setShowConfirm(true)}
              disabled={selected.size === 0}
            >
              <Trash2 size={16} />
              <span>删除</span>
            </button>
          </div>
        )}

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
                className={`anni-card ${item.isToday ? 'is-today' : ''} ${batchMode && selected.has(item.event.id) ? 'batch-selected' : ''}`}
                onClick={() => {
                  if (batchMode) {
                    toggleSelect(item.event.id);
                  } else {
                    navigate(`/event/${item.event.id}`);
                  }
                }}
              >
                {batchMode && (
                  <div className="anni-checkbox">
                    {selected.has(item.event.id) ? (
                      <CheckSquare size={20} />
                    ) : (
                      <Square size={20} />
                    )}
                  </div>
                )}
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

      {showConfirm && (
        <div className="anni-confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="anni-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="anni-confirm-title">确认删除</div>
            <div className="anni-confirm-message">
              确定要删除选中的 {selected.size} 个纪念日吗？此操作不可恢复。
            </div>
            <div className="anni-confirm-actions">
              <button className="anni-confirm-cancel" onClick={() => setShowConfirm(false)}>
                取消
              </button>
              <button className="anni-confirm-delete" onClick={handleBatchDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
