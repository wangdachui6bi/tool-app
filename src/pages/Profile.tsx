import { useState } from 'react';
import { Wrench, Database, Trash2, ChevronRight } from 'lucide-react';
import localforage from 'localforage';
import { getAllEvents, addEvent, generateId } from '../stores/eventStore';
import type { MemorialEvent } from '../types';
import './Profile.css';

export default function Profile() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState('');

  const handleExport = async () => {
    const events = await getAllEvents();
    const json = JSON.stringify(events, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-app-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flashSuccess('导出成功');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as MemorialEvent[];
        if (!Array.isArray(data)) throw new Error('Invalid format');
        for (const event of data) {
          event.id = generateId();
          await addEvent(event);
        }
        window.dispatchEvent(new Event('eventUpdated'));
        flashSuccess(`成功导入 ${data.length} 条记录`);
      } catch {
        flashSuccess('导入失败：文件格式错误');
      }
    };
    input.click();
  };

  const handleClear = async () => {
    await localforage.clear();
    window.dispatchEvent(new Event('eventUpdated'));
    setShowConfirm(false);
    flashSuccess('数据已清除');
  };

  const flashSuccess = (msg: string) => {
    setShowSuccess(msg);
    setTimeout(() => setShowSuccess(''), 2000);
  };

  return (
    <div className="page">
      <div className="page-content">
        <div className="profile-header">
          <div className="profile-icon-wrap">
            <Wrench size={32} color="var(--primary)" />
          </div>
          <h1 className="profile-app-name">工具集</h1>
          <span className="profile-version">v1.0.3</span>
        </div>

        <div className="profile-section fade-in">
          <div className="profile-section-title">数据管理</div>
          <div className="profile-card">
            <button className="profile-item" onClick={handleExport}>
              <Database size={20} className="profile-item-icon" />
              <span className="profile-item-label">导出数据</span>
              <ChevronRight size={18} className="profile-item-arrow" />
            </button>
            <button className="profile-item" onClick={handleImport}>
              <Database size={20} className="profile-item-icon" />
              <span className="profile-item-label">导入数据</span>
              <ChevronRight size={18} className="profile-item-arrow" />
            </button>
            <button className="profile-item danger" onClick={() => setShowConfirm(true)}>
              <Trash2 size={20} className="profile-item-icon" />
              <span className="profile-item-label">清除所有数据</span>
              <ChevronRight size={18} className="profile-item-arrow" />
            </button>
          </div>
        </div>

        <div className="profile-footer">
          <p>Made with ❤️</p>
        </div>

        {showSuccess && (
          <div className="toast">{showSuccess}</div>
        )}

        {showConfirm && (
          <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <div className="confirm-title">确认清除</div>
              <div className="confirm-message">确定要清除所有数据吗？此操作不可恢复。</div>
              <div className="confirm-buttons">
                <button className="confirm-cancel" onClick={() => setShowConfirm(false)}>取消</button>
                <button className="confirm-delete" onClick={handleClear}>清除</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
