import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  AlarmClockPlus, ArrowLeft, BellRing, CheckCircle2,
  Pencil, RotateCcw, Siren, Trash2,
} from 'lucide-react';
import {
  deleteReminder,
  getReminderDueAt,
  getReminderNotificationIds,
  getReminderRepeatLabel,
  getReminders,
  isRepeatingReminder,
  saveReminder,
  type ReminderItem,
  type ReminderLevel,
  type ReminderRepeat,
} from '../stores/reminderStore';
import './ReminderTool.css';

const LEVELS: { value: ReminderLevel; label: string; desc: string }[] = [
  { value: 'normal', label: '普通', desc: '轻提醒' },
  { value: 'important', label: '重要', desc: '显眼提示' },
  { value: 'urgent', label: '紧急', desc: '高亮强调' },
];

const REPEAT_OPTIONS: { value: ReminderRepeat; label: string; desc: string }[] = [
  { value: 'none', label: '单次', desc: '只提醒这一次' },
  { value: 'daily', label: '每天', desc: '每天同一时间' },
  { value: 'weekly', label: '每周', desc: '每周同一天' },
  { value: 'weekdays', label: '工作日', desc: '周一到周五' },
];

const EMPTY_FORM = () => ({
  title: '',
  note: '',
  remindAt: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
  level: 'important' as ReminderLevel,
  repeat: 'none' as ReminderRepeat,
});

const WEEKDAY_REPEAT_SLOTS = [1, 2, 3, 4, 5] as const;
const MAX_NOTIFICATION_ID = 2147483000;

function makeNotificationTitle(level: ReminderLevel, title: string): string {
  if (level === 'urgent') return `【紧急提醒】${title}`;
  if (level === 'important') return `【重要提醒】${title}`;
  return title;
}

function makeStableNotificationId(seed: string): number {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 131 + seed.charCodeAt(index)) % MAX_NOTIFICATION_ID;
  }

  return hash + 1;
}

function toCapacitorWeekday(day: number): number {
  return day === 0 ? 1 : day + 1;
}

function createNotificationIds(reminderId: string, repeat: ReminderRepeat): number[] {
  if (repeat === 'weekdays') {
    return WEEKDAY_REPEAT_SLOTS.map((slot) => makeStableNotificationId(`${reminderId}:weekday:${slot}`));
  }

  return [makeStableNotificationId(`${reminderId}:${repeat}`)];
}

function buildNotificationPayloads(reminder: ReminderItem) {
  const at = dayjs(reminder.remindAt);
  const title = makeNotificationTitle(reminder.level, reminder.title);
  const body = reminder.note.trim() || '别忘了这件事';
  const ids = getReminderNotificationIds(reminder);

  if (reminder.repeat === 'daily') {
    return [
      {
        id: ids[0],
        title,
        body,
        schedule: {
          on: {
            hour: at.hour(),
            minute: at.minute(),
          },
          repeats: true,
        },
      },
    ];
  }

  if (reminder.repeat === 'weekly') {
    return [
      {
        id: ids[0],
        title,
        body,
        schedule: {
          on: {
            weekday: toCapacitorWeekday(at.day()),
            hour: at.hour(),
            minute: at.minute(),
          },
          repeats: true,
        },
      },
    ];
  }

  if (reminder.repeat === 'weekdays') {
    return WEEKDAY_REPEAT_SLOTS.map((slot, index) => ({
      id: ids[index],
      title,
      body,
      schedule: {
        on: {
          weekday: slot + 1,
          hour: at.hour(),
          minute: at.minute(),
        },
        repeats: true,
      },
    }));
  }

  return [
    {
      id: ids[0],
      title,
      body,
      schedule: {
        at: at.toDate(),
        allowWhileIdle: true,
      },
    },
  ];
}

function formatReminderTime(dueAt: Dayjs) {
  const now = dayjs();

  if (dueAt.isSame(now, 'day')) {
    return `今天 ${dueAt.format('HH:mm')}`;
  }

  if (dueAt.isSame(now.add(1, 'day'), 'day')) {
    return `明天 ${dueAt.format('HH:mm')}`;
  }

  return dueAt.format('M月D日 HH:mm');
}

export default function ReminderTool() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [form, setForm] = useState(EMPTY_FORM());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permissionText, setPermissionText] = useState('将使用本地通知提醒你');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<'info' | 'warn' | 'success'>('info');

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

  const activeReminders = useMemo(
    () => reminders.filter((item) => !item.completed || isRepeatingReminder(item)),
    [reminders]
  );

  const overdue = useMemo(() => {
    const now = dayjs();
    return activeReminders.filter((item) => getReminderDueAt(item, now).isBefore(now));
  }, [activeReminders]);

  const upcoming = useMemo(() => {
    const now = dayjs();
    return activeReminders.filter((item) => !getReminderDueAt(item, now).isBefore(now));
  }, [activeReminders]);

  const completed = useMemo(
    () => reminders.filter((item) => item.completed && !isRepeatingReminder(item)),
    [reminders]
  );

  const ensurePermission = async () => {
    if (!Capacitor.isNativePlatform()) return false;

    const result = await LocalNotifications.requestPermissions();
    setPermissionText(result.display === 'granted' ? '本地通知已开启' : '通知权限未开启，提醒将只保存在 App 列表');
    return result.display === 'granted';
  };

  const cancelNativeNotifications = useCallback(async (ids: number[]) => {
    if (!Capacitor.isNativePlatform() || ids.length === 0) return;

    try {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    } catch (error) {
      console.warn('[reminder] cancel notification failed', error);
    }
  }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.remindAt) return;

    const existing = editingId ? reminders.find((item) => item.id === editingId) : undefined;
    const reminderId = editingId || `reminder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const notificationIds = createNotificationIds(reminderId, form.repeat);

    const reminder: ReminderItem = {
      id: reminderId,
      notificationId: notificationIds[0],
      notificationIds,
      title: form.title.trim(),
      note: form.note.trim(),
      remindAt: form.remindAt,
      level: form.level,
      repeat: form.repeat,
      completed: form.repeat === 'none' ? existing?.completed ?? false : false,
      lastCompletedAt: form.repeat === 'none' ? null : existing?.lastCompletedAt || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let feedback = '已保存提醒';
    let tone: 'info' | 'warn' | 'success' = 'success';

    if (Capacitor.isNativePlatform()) {
      await cancelNativeNotifications(existing ? getReminderNotificationIds(existing) : []);

      const granted = await ensurePermission();

      if (granted) {
        try {
          await LocalNotifications.schedule({
            notifications: buildNotificationPayloads(reminder),
          });
          feedback = form.repeat === 'none'
            ? '已保存并会按时通知你'
            : `已保存，${getReminderRepeatLabel(form.repeat)}会继续提醒`;
        } catch (error) {
          console.error('[reminder] schedule failed', error);
          feedback = '已保存到 App，但系统通知暂时没有设置成功';
          tone = 'warn';
        }
      } else {
        feedback = '已保存到 App，但通知权限未开启';
        tone = 'warn';
      }
    } else {
      feedback = '已保存提醒，通知效果请以 App 端为准';
      tone = 'info';
    }

    await saveReminder(reminder);
    setSaveMessage(feedback);
    setSaveTone(tone);
    setForm(EMPTY_FORM());
    setEditingId(null);
    loadData();
  };

  const handleEdit = (item: ReminderItem) => {
    setEditingId(item.id);
    setSaveMessage(null);
    setForm({
      title: item.title,
      note: item.note,
      remindAt: dayjs(item.remindAt).format('YYYY-MM-DDTHH:mm'),
      level: item.level,
      repeat: item.repeat,
    });
  };

  const handleDelete = async (item: ReminderItem) => {
    await cancelNativeNotifications(getReminderNotificationIds(item));
    await deleteReminder(item.id);
    setSaveMessage('提醒已删除');
    setSaveTone('info');
    loadData();
  };

  const handleComplete = async (item: ReminderItem) => {
    if (isRepeatingReminder(item)) {
      await saveReminder({
        ...item,
        completed: false,
        lastCompletedAt: new Date().toISOString(),
      });
      setSaveMessage('本次循环提醒已处理，下一次会继续提醒');
      setSaveTone('success');
      loadData();
      return;
    }

    await cancelNativeNotifications(getReminderNotificationIds(item));
    await saveReminder({
      ...item,
      completed: true,
    });
    setSaveMessage('提醒已完成');
    setSaveTone('success');
    loadData();
  };

  const renderReminder = (item: ReminderItem) => {
    const dueAt = getReminderDueAt(item);
    const repeatLabel = getReminderRepeatLabel(item.repeat);
    const isOverdue = dueAt.isBefore(dayjs());

    return (
      <div key={item.id} className={`reminder-card level-${item.level}`}>
        <div className="reminder-card-head">
          <div>
            <div className="reminder-card-title">{item.title}</div>
            <div className="reminder-card-meta">
              {isOverdue ? `已过时间 · ${formatReminderTime(dueAt)}` : formatReminderTime(dueAt)}
              <span className={`reminder-badge ${item.level}`}>{LEVELS.find((level) => level.value === item.level)?.label}</span>
              <span className="reminder-repeat-badge">{repeatLabel}</span>
            </div>
          </div>
          <div className="reminder-card-actions">
            {!item.completed && (
              <button className="reminder-icon-btn" onClick={() => handleEdit(item)} title="编辑提醒">
                <Pencil size={16} />
              </button>
            )}
            {!item.completed && (
              <button
                className="reminder-icon-btn done"
                onClick={() => handleComplete(item)}
                title={isRepeatingReminder(item) ? '本次已处理' : '完成提醒'}
              >
                <CheckCircle2 size={16} />
              </button>
            )}
            <button className="reminder-icon-btn danger" onClick={() => handleDelete(item)} title="删除提醒">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {item.note && <div className="reminder-card-note">{item.note}</div>}
      </div>
    );
  };

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
          <p>现在支持单次、每天、每周和工作日循环提醒。即使系统通知暂时失败，提醒也会先保存在 App 里。</p>
        </div>

        <div className="reminder-panel">
          <div className="reminder-panel-title">{editingId ? '编辑提醒' : '新建提醒'}</div>
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

            <div className="reminder-group">
              <div className="reminder-group-title">重复方式</div>
              <div className="reminder-repeat-row">
                {REPEAT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`reminder-repeat-btn ${form.repeat === option.value ? 'active' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, repeat: option.value }))}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="reminder-group">
              <div className="reminder-group-title">提醒强度</div>
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
            </div>

            {saveMessage && (
              <div className={`reminder-feedback ${saveTone}`}>
                {saveTone === 'warn' ? <Siren size={16} /> : <BellRing size={16} />}
                {saveMessage}
              </div>
            )}

            <div className="reminder-action-row">
              <button className="reminder-save-btn" onClick={handleSave}>
                <AlarmClockPlus size={18} />
                {editingId ? '更新提醒' : '保存并提醒我'}
              </button>
              {editingId && (
                <button
                  className="reminder-secondary-btn"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_FORM());
                    setSaveMessage(null);
                  }}
                >
                  <RotateCcw size={16} />
                  取消编辑
                </button>
              )}
            </div>
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
