import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Send, ClipboardList } from 'lucide-react';
import { getTodos, addTodo, toggleTodo, deleteTodo, clearCompleted } from '../stores/todoStore';
import { generateId } from '../stores/eventStore';
import type { TodoItem } from '../types';
import './TodoList.css';

type Filter = 'all' | 'active' | 'completed';

export default function TodoList() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const loadData = useCallback(async () => {
    const list = await getTodos();
    setTodos(list);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    const text = input.trim();
    if (!text) return;
    const item: TodoItem = {
      id: generateId(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    await addTodo(item);
    setInput('');
    loadData();
  };

  const handleToggle = async (id: string) => {
    await toggleTodo(id);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteTodo(id);
    loadData();
  };

  const handleClearCompleted = async () => {
    await clearCompleted();
    loadData();
  };

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return 0;
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
        <div className="todo-input-bar fade-in">
          <input
            className="todo-input"
            placeholder="添加待办..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            className="todo-add-btn"
            onClick={handleAdd}
            disabled={!input.trim()}
          >
            <Send size={20} />
          </button>
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
                <span className="todo-text">{item.text}</span>
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
