import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  AlarmClockPlus, ArrowLeft, BellRing, CheckCircle2, CircleAlert,
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
import {
  buildNotificationPayloads,
  clearReminderNotifications,
  createNotificationIds,
  ensureReminderChannels,
  getReminderNotificationStatus,
  openExactAlarmSettings,
  syncReminderNotifications,
} from '../lib/reminderNotifications';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [form, setForm] = useState(EMPTY_FORM());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permissionText, setPermissionText] = useState('将使用本地通知提醒你');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<'info' | 'warn' | 'success'>('info');
  const [needsExactAlarm, setNeedsExactAlarm] = useState(false);

  const loadData = useCallback(async () => {
    const list = await getReminders();
    setReminders(list);
  }, []);

  const clearEditState = useCallback((keepMessage = false) => {
    setEditingId(null);
    setForm(EMPTY_FORM());
    if (!keepMessage) {
      setSaveMessage(null);
    }

    if (searchParams.has('edit')) {
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openEditState = useCallback((item: ReminderItem, syncUrl = true) => {
    setEditingId(item.id);
    setSaveMessage(null);
    setForm({
      title: item.title,
      note: item.note,
      remindAt: dayjs(item.remindAt).format('YYYY-MM-DDTHH:mm'),
      level: item.level,
      repeat: item.repeat,
    });

    if (syncUrl && searchParams.get('edit') !== item.id) {
      const next = new URLSearchParams(searchParams);
      next.set('edit', item.id);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setPermissionText('当前在 Web 环境，仍可保存提醒，但本地通知以 App 端为准');
      return;
    }

    let active = true;

    const loadNotificationState = async () => {
      await ensureReminderChannels();
      const status = await getReminderNotificationStatus();
      if (!active) return;

      if (!status.displayGranted) {
        setPermissionText('首次保存时会请求通知权限');
        setNeedsExactAlarm(false);
        return;
      }

      if (!status.exactAlarmGranted) {
        setPermissionText('通知已开启，但安卓未授权准时提醒，可能延后弹出');
        setNeedsExactAlarm(true);
        return;
      }

      setPermissionText('本地通知已开启，安卓会尽量准时强提醒');
      setNeedsExactAlarm(false);
    };

    loadNotificationState().catch((error) => {
      console.warn('[reminder] load notification state failed', error);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;

    const target = reminders.find((item) => item.id === editId);
    if (!target) return;

    if (editingId === target.id) return;
    openEditState(target, false);
  }, [editingId, openEditState, reminders, searchParams]);

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
      await clearReminderNotifications(ids);
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

    await saveReminder(reminder);

    if (Capacitor.isNativePlatform()) {
      await cancelNativeNotifications(existing ? getReminderNotificationIds(existing) : []);

      const granted = await ensurePermission();

      if (granted) {
        try {
          await ensureReminderChannels();
          await LocalNotifications.schedule({
            notifications: buildNotificationPayloads(reminder),
          });
          await syncReminderNotifications();
          const status = await getReminderNotificationStatus();
          setNeedsExactAlarm(!status.exactAlarmGranted);
          setPermissionText(status.exactAlarmGranted
            ? '本地通知已开启，安卓会尽量准时强提醒'
            : '通知已开启，但安卓未授权准时提醒，可能延后弹出');
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

    setSaveMessage(feedback);
    setSaveTone(tone);
    clearEditState(true);
    loadData();
  };

  const handleEnableExactAlarm = async () => {
    try {
      await openExactAlarmSettings();
      const status = await getReminderNotificationStatus();
      setNeedsExactAlarm(!status.exactAlarmGranted);
      setPermissionText(status.exactAlarmGranted
        ? '本地通知已开启，安卓会尽量准时强提醒'
        : '通知已开启，但安卓未授权准时提醒，可能延后弹出');
      if (status.exactAlarmGranted) {
        await syncReminderNotifications();
        setSaveMessage('已开启安卓准时提醒，现有提醒已重新同步');
        setSaveTone('success');
      }
    } catch (error) {
      console.warn('[reminder] change exact alarm setting failed', error);
      setSaveMessage('没有成功打开安卓准时提醒设置');
      setSaveTone('warn');
    }
  };

  const handleEdit = (item: ReminderItem) => {
    openEditState(item);
  };

  const handleDelete = async (item: ReminderItem) => {
    await cancelNativeNotifications(getReminderNotificationIds(item));
    await deleteReminder(item.id);
    if (item.id === editingId) {
      clearEditState(true);
    }
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
          <p>现在支持单次、每天、每周和工作日循环提醒。安卓端会补高优先级通知渠道和准时提醒能力，即使系统通知暂时失败，提醒也会先保存在 App 里。</p>
        </div>

        {Capacitor.isNativePlatform() && needsExactAlarm && (
          <div className="reminder-exact-card">
            <div className="reminder-exact-copy">
              <CircleAlert size={18} />
              <div>
                <strong>安卓还没打开“准时提醒”</strong>
                <span>不开启的话，省电和待机时通知可能延后，强提醒效果会打折。</span>
              </div>
            </div>
            <button className="reminder-exact-btn" onClick={handleEnableExactAlarm}>
              去开启准时提醒
            </button>
          </div>
        )}

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
                    clearEditState();
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
