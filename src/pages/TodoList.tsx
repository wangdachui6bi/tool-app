import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, X, Send, ClipboardList, Cloud, RefreshCw, Pencil, RotateCcw } from 'lucide-react';
import {
  getTodoSyncConfig,
  getTodos,
  addTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
  clearCompleted,
  refreshTodos,
} from '../stores/todoStore';
import { generateId } from '../stores/eventStore';
import type { TodoItem } from '../types';
import './TodoList.css';

type Filter = 'all' | 'active' | 'completed';

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatTodoSchedule(item: TodoItem) {
  if (!item.date) return '未设置日期';
  if (item.time) return `${item.date} ${item.time}`;
  return `${item.date} 全天`;
}

function getScheduleTimestamp(item: TodoItem) {
  if (!item.date) return Number.MAX_SAFE_INTEGER;
  const value = item.time ? `${item.date}T${item.time}:00` : `${item.date}T23:59:59`;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export default function TodoList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const [todoDate, setTodoDate] = useState(getTodayValue());
  const [todoTime, setTodoTime] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(
    getTodoSyncConfig().enabled
      ? '待办会自动同步到云端'
      : '云同步未配置，当前仅保存在本机'
  );

  const syncConfig = getTodoSyncConfig();

  const loadData = useCallback(async () => {
    const list = await getTodos();
    setTodos(list);
  }, []);

  const clearEditState = useCallback((keepMessage = false) => {
    setEditingId(null);
    setInput('');
    setTodoDate(getTodayValue());
    setTodoTime('');
    if (!keepMessage) {
      setSyncMessage(
        syncConfig.enabled
          ? '待办会自动同步到云端'
          : '云同步未配置，当前仅保存在本机'
      );
    }

    if (searchParams.has('edit')) {
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, syncConfig.enabled]);

  const openEditState = useCallback((item: TodoItem, syncUrl = true) => {
    setEditingId(item.id);
    setInput(item.text);
    setTodoDate(item.date || item.createdAt.slice(0, 10) || getTodayValue());
    setTodoTime(item.time || '');
    setFilter('all');

    if (syncUrl && searchParams.get('edit') !== item.id) {
      const next = new URLSearchParams(searchParams);
      next.set('edit', item.id);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('todoUpdated', handler);
    return () => window.removeEventListener('todoUpdated', handler);
  }, [loadData]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;

    const target = todos.find((item) => item.id === editId);
    if (!target) return;

    if (
      editingId === target.id &&
      input === target.text &&
      todoDate === (target.date || target.createdAt.slice(0, 10)) &&
      todoTime === (target.time || '')
    ) {
      return;
    }
    openEditState(target, false);
  }, [editingId, input, openEditState, searchParams, todoDate, todoTime, todos]);

  const runSync = useCallback(async (silent = false) => {
    if (!syncConfig.enabled) {
      if (!silent) {
        setSyncMessage('云同步未配置，当前仅保存在本机');
      }
      return;
    }

    try {
      setSyncing(true);
      if (!silent) {
        setSyncMessage('正在同步到云端...');
      }
      const result = await refreshTodos();
      setSyncMessage(result.message);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : '同步失败，请稍后再试';
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  }, [loadData, syncConfig.enabled]);

  useEffect(() => {
    if (syncConfig.enabled) {
      runSync(true);
    }
  }, [runSync, syncConfig.enabled]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;

    try {
      if (editingId) {
        await updateTodo(editingId, {
          text,
          date: todoDate || getTodayValue(),
          time: todoTime,
        });
        if (syncConfig.enabled) {
          setSyncMessage('云端待办内容已更新');
        }
        clearEditState(true);
      } else {
        const now = new Date().toISOString();
        const item: TodoItem = {
          id: generateId(),
          text,
          completed: false,
          date: todoDate || now.slice(0, 10),
          time: todoTime,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        await addTodo(item);
        setInput('');
        setTodoDate(getTodayValue());
        setTodoTime('');
        if (syncConfig.enabled) {
          setSyncMessage('已添加到云端待办');
        }
      }

      await loadData();
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : editingId ? '更新待办失败' : '新增待办失败');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleTodo(id);
      await loadData();
      if (syncConfig.enabled) {
        setSyncMessage('云端待办状态已更新');
      }
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '更新待办失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
      if (id === editingId) {
        clearEditState(true);
      }
      await loadData();
      if (syncConfig.enabled) {
        setSyncMessage('待办已从云端删除');
      }
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '删除待办失败');
    }
  };

  const handleClearCompleted = async () => {
    try {
      await clearCompleted();
      await loadData();
      if (syncConfig.enabled) {
        setSyncMessage('已清除云端已完成待办');
      }
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '清除失败');
    }
  };

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const scheduleDiff = getScheduleTimestamp(a) - getScheduleTimestamp(b);
    if (scheduleDiff !== 0) return scheduleDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div className="page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">待办清单</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab todo-content">
        <div className="todo-sync-bar fade-in">
          <div className="todo-sync-copy">
            <Cloud size={18} />
            <div>
              <div className="todo-sync-title">
                {syncConfig.enabled ? '云端待办由服务端统一管理' : '当前使用本地待办'}
              </div>
              <div className="todo-sync-desc">
                {syncConfig.enabled
                  ? syncMessage
                  : '配置服务地址和同步 token 后，可在其他项目里同步查看'}
              </div>
            </div>
          </div>
          {syncConfig.enabled && (
            <button className="todo-sync-btn" onClick={() => runSync()} disabled={syncing}>
              <RefreshCw size={16} className={syncing ? 'spinning' : ''} />
              {syncing ? '同步中' : '立即同步'}
            </button>
          )}
        </div>

        <div className="todo-input-bar fade-in">
          <div className="todo-input-main">
            <input
              className="todo-input"
              placeholder={editingId ? '修改待办内容...' : '添加待办...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              className="todo-add-btn"
              onClick={handleSubmit}
              disabled={!input.trim()}
              title={editingId ? '保存修改' : '新增待办'}
            >
              {editingId ? <Pencil size={20} /> : <Send size={20} />}
            </button>
            {editingId && (
              <button
                className="todo-cancel-btn"
                onClick={() => clearEditState()}
                title="取消编辑"
              >
                <RotateCcw size={18} />
              </button>
            )}
          </div>
          <div className="todo-schedule-row">
            <label className="todo-schedule-field">
              <span className="todo-schedule-label">日期</span>
              <input
                className="todo-schedule-input"
                type="date"
                value={todoDate}
                onChange={e => setTodoDate(e.target.value)}
              />
            </label>
            <label className="todo-schedule-field">
              <span className="todo-schedule-label">时间</span>
              <input
                className="todo-schedule-input"
                type="time"
                value={todoTime}
                onChange={e => setTodoTime(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="todo-filters fade-in">
          <button
            className={`todo-filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            className={`todo-filter-tab ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            未完成
          </button>
          <button
            className={`todo-filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            已完成
          </button>
        </div>

        <div className="todo-count fade-in">
          {activeCount} 项待办 · {completedCount} 项已完成
        </div>

        <div className="todo-list">
          {sorted.length === 0 ? (
            <div className="todo-empty fade-in">
              <ClipboardList size={48} strokeWidth={1.5} />
              <span>暂无待办</span>
            </div>
          ) : (
            sorted.map(item => (
              <div
                key={item.id}
                className={`todo-item fade-in ${item.completed ? 'completed' : ''}`}
              >
                <button
                  className={`todo-checkbox ${item.completed ? 'checked' : ''}`}
                  onClick={() => handleToggle(item.id)}
                >
                  {item.completed && <span className="todo-checkmark">✓</span>}
                </button>
                <div className="todo-body">
                  <span className="todo-text">{item.text}</span>
                  <span className="todo-meta">{formatTodoSchedule(item)}</span>
                </div>
                <button
                  className="todo-edit"
                  onClick={() => openEditState(item)}
                  title="编辑待办"
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="todo-delete"
                  onClick={() => handleDelete(item.id)}
                >
                  <X size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {completedCount > 0 && (
          <button className="todo-clear-btn fade-in" onClick={handleClearCompleted}>
            清除已完成
          </button>
        )}
      </div>
    </div>
  );
}
