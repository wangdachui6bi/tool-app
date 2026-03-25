import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  AlarmClockPlus, ArrowLeft, BellRing, CheckCircle2,
  Pencil, Siren, Trash2,
} from 'lucide-react';
import {
  deleteReminder,
  getReminders,
  saveReminder,
  type ReminderItem,
  type ReminderLevel,
} from '../stores/reminderStore';
import './ReminderTool.css';

const LEVELS: { value: ReminderLevel; label: string; desc: string }[] = [
  { value: 'normal', label: '普通', desc: '轻提醒' },
  { value: 'important', label: '重要', desc: '显眼提示' },
  { value: 'urgent', label: '紧急', desc: '高亮强调' },
];

const EMPTY_FORM = () => ({
  title: '',
  note: '',
  remindAt: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
  level: 'important' as ReminderLevel,
});

function makeNotificationTitle(level: ReminderLevel, title: string): string {
  if (level === 'urgent') return `【紧急提醒】${title}`;
  if (level === 'important') return `【重要提醒】${title}`;
  return title;
}

export default function ReminderTool() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [form, setForm] = useState(EMPTY_FORM());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permissionText, setPermissionText] = useState('将使用本地通知提醒你');

  const loadData = useCallback(async () => {
    const list = await getReminders();
    setReminders(list);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setPermissionText('当前在 Web 环境，仍可保存提醒，但本地通知以 App 端为准');
      return;
    }

    LocalNotifications.checkPermissions().then((result) => {
      setPermissionText(result.display === 'granted' ? '本地通知已开启' : '首次保存时会请求通知权限');
    });
  }, []);

  const upcoming = useMemo(
    () => reminders.filter((item) => !item.completed && dayjs(item.remindAt).isAfter(dayjs())),
    [reminders]
  );

  const overdue = useMemo(
    () => reminders.filter((item) => !item.completed && dayjs(item.remindAt).isBefore(dayjs())),
    [reminders]
  );

  const completed = useMemo(
    () => reminders.filter((item) => item.completed),
    [reminders]
  );

  const ensurePermission = async () => {
    if (!Capacitor.isNativePlatform()) return true;
    const result = await LocalNotifications.requestPermissions();
    setPermissionText(result.display === 'granted' ? '本地通知已开启' : '通知权限未开启，提醒将只保存在列表');
    return result.display === 'granted';
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!form.remindAt) return;

    const notificationId = editingId
      ? reminders.find((item) => item.id === editingId)?.notificationId ?? Date.now()
      : Date.now();

    if (Capacitor.isNativePlatform()) {
      const granted = await ensurePermission();
      if (granted) {
        await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title: makeNotificationTitle(form.level, form.title.trim()),
              body: form.note.trim() || '别忘了这件事',
              schedule: {
                at: new Date(form.remindAt),
                allowWhileIdle: true,
              },
            },
          ],
        });
      }
    }

    const reminder: ReminderItem = {
      id: editingId || `reminder_${Date.now()}`,
      notificationId,
      title: form.title.trim(),
      note: form.note.trim(),
      remindAt: form.remindAt,
      level: form.level,
      completed: false,
      createdAt: editingId
        ? reminders.find((item) => item.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveReminder(reminder);
    setForm(EMPTY_FORM());
    setEditingId(null);
    loadData();
  };

  const handleEdit = (item: ReminderItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      note: item.note,
      remindAt: dayjs(item.remindAt).format('YYYY-MM-DDTHH:mm'),
      level: item.level,
    });
  };

  const handleDelete = async (item: ReminderItem) => {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({ notifications: [{ id: item.notificationId }] });
    }
    await deleteReminder(item.id);
    loadData();
  };

  const handleComplete = async (item: ReminderItem) => {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({ notifications: [{ id: item.notificationId }] });
    }
    await saveReminder({
      ...item,
      completed: true,
    });
    loadData();
  };

  const renderReminder = (item: ReminderItem) => (
    <div key={item.id} className={`reminder-card level-${item.level}`}>
      <div className="reminder-card-head">
        <div>
          <div className="reminder-card-title">{item.title}</div>
          <div className="reminder-card-meta">
            {dayjs(item.remindAt).format('M月D日 HH:mm')}
            <span className={`reminder-badge ${item.level}`}>{LEVELS.find((level) => level.value === item.level)?.label}</span>
          </div>
        </div>
        <div className="reminder-card-actions">
          {!item.completed && (
            <button className="reminder-icon-btn" onClick={() => handleEdit(item)}>
              <Pencil size={16} />
            </button>
          )}
          {!item.completed && (
            <button className="reminder-icon-btn done" onClick={() => handleComplete(item)}>
              <CheckCircle2 size={16} />
            </button>
          )}
          <button className="reminder-icon-btn danger" onClick={() => handleDelete(item)}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {item.note && <div className="reminder-card-note">{item.note}</div>}
    </div>
  );

  return (
    <div className="page reminder-page">
      <div className="add-nav">
        <button className="add-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <span className="add-nav-title">提醒工具</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-content no-tab reminder-content">
        <div className="reminder-hero fade-in">
          <div className="reminder-hero-badge">
            <BellRing size={18} />
            {permissionText}
          </div>
          <h1>别只是记下来，要到点提醒你</h1>
          <p>把重要程度提上去，紧急提醒会在列表里更显眼，通知标题也会更强调。</p>
        </div>

        <div className="reminder-panel">
          <div className="reminder-panel-title">新建提醒</div>
          <div className="reminder-form">
            <input
              className="reminder-input"
              placeholder="要提醒我的事情"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <textarea
              className="reminder-textarea"
              placeholder="补充说明（可选）"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
            <input
              type="datetime-local"
              className="reminder-input"
              value={form.remindAt}
              onChange={(e) => setForm((prev) => ({ ...prev, remindAt: e.target.value }))}
            />
            <div className="reminder-level-row">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  className={`reminder-level-btn ${form.level === level.value ? 'active' : ''} ${level.value}`}
                  onClick={() => setForm((prev) => ({ ...prev, level: level.value }))}
                >
                  <strong>{level.label}</strong>
                  <span>{level.desc}</span>
                </button>
              ))}
            </div>
            <button className="reminder-save-btn" onClick={handleSave}>
              <AlarmClockPlus size={18} />
              {editingId ? '更新提醒' : '保存并提醒我'}
            </button>
          </div>
        </div>

        {overdue.length > 0 && (
          <div className="reminder-section">
            <div className="reminder-section-title urgent">
              <Siren size={18} />
              已过时间
            </div>
            {overdue.map(renderReminder)}
          </div>
        )}

        <div className="reminder-section">
          <div className="reminder-section-title">即将提醒</div>
          {upcoming.length === 0
            ? <div className="reminder-empty">还没有即将到来的提醒</div>
            : upcoming.map(renderReminder)}
        </div>

        {completed.length > 0 && (
          <div className="reminder-section">
            <div className="reminder-section-title">已完成</div>
            {completed.slice(-5).reverse().map(renderReminder)}
          </div>
        )}
      </div>
    </div>
  );
}
