import dayjs, { type Dayjs } from 'dayjs';
import localforage from 'localforage';

export type ReminderLevel = 'normal' | 'important' | 'urgent';
export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'weekdays';

export interface ReminderItem {
  id: string;
  notificationId?: number;
  notificationIds?: number[];
  title: string;
  note: string;
  remindAt: string;
  level: ReminderLevel;
  repeat: ReminderRepeat;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  lastCompletedAt?: string | null;
}

const KEY = 'tool_app_reminders_v1';

function emitReminderUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('reminderUpdated'));
  }
}

function isWeekday(date: Dayjs) {
  const day = date.day();
  return day >= 1 && day <= 5;
}

function getReminderStartAt(reminder: ReminderItem): Dayjs {
  const base = dayjs(reminder.remindAt);

  if (reminder.repeat !== 'weekdays' || isWeekday(base)) {
    return base;
  }

  let candidate = base;
  while (!isWeekday(candidate)) {
    candidate = candidate.add(1, 'day');
  }
  return candidate;
}

function getPreviousRecurringOccurrence(reminder: ReminderItem, now: Dayjs): Dayjs {
  const base = getReminderStartAt(reminder);

  if (reminder.repeat === 'daily') {
    let candidate = now.hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
    if (candidate.isAfter(now)) {
      candidate = candidate.subtract(1, 'day');
    }
    return candidate.isBefore(base) ? base : candidate;
  }

  if (reminder.repeat === 'weekly') {
    let candidate = now.day(base.day()).hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
    if (candidate.isAfter(now)) {
      candidate = candidate.subtract(7, 'day');
    }
    return candidate.isBefore(base) ? base : candidate;
  }

  let candidate = now.hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
  while (!isWeekday(candidate) || candidate.isAfter(now)) {
    candidate = candidate.subtract(1, 'day');
    candidate = candidate.hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
  }
  return candidate.isBefore(base) ? base : candidate;
}

function getNextRecurringOccurrence(reminder: ReminderItem, now: Dayjs): Dayjs {
  const base = getReminderStartAt(reminder);

  if (reminder.repeat === 'daily') {
    let candidate = now.hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
    if (!candidate.isAfter(now)) {
      candidate = candidate.add(1, 'day');
    }
    return candidate.isBefore(base) ? base : candidate;
  }

  if (reminder.repeat === 'weekly') {
    let candidate = now.day(base.day()).hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
    if (!candidate.isAfter(now)) {
      candidate = candidate.add(7, 'day');
    }
    return candidate.isBefore(base) ? base : candidate;
  }

  let candidate = now.hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
  if (!candidate.isAfter(now)) {
    candidate = candidate.add(1, 'day');
  }
  while (!isWeekday(candidate)) {
    candidate = candidate.add(1, 'day');
    candidate = candidate.hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
  }
  return candidate.isBefore(base) ? base : candidate;
}

function normalizeReminder(item: ReminderItem): ReminderItem {
  const notificationIds = Array.isArray(item.notificationIds)
    ? item.notificationIds.filter((id) => Number.isInteger(id) && id > 0)
    : typeof item.notificationId === 'number' && Number.isInteger(item.notificationId) && item.notificationId > 0
      ? [item.notificationId]
      : [];

  return {
    ...item,
    note: item.note || '',
    repeat: item.repeat || 'none',
    completed: Boolean(item.completed),
    notificationIds,
    notificationId: notificationIds[0],
    lastCompletedAt: item.lastCompletedAt || null,
  };
}

export function isRepeatingReminder(reminder: ReminderItem): boolean {
  return normalizeReminder(reminder).repeat !== 'none';
}

export function getReminderNotificationIds(reminder: ReminderItem): number[] {
  return normalizeReminder(reminder).notificationIds || [];
}

export function getReminderDueAt(reminder: ReminderItem, now = dayjs()): Dayjs {
  const normalized = normalizeReminder(reminder);
  const startAt = getReminderStartAt(normalized);

  if (normalized.repeat === 'none') {
    return dayjs(normalized.remindAt);
  }

  if (now.isBefore(startAt)) {
    return startAt;
  }

  const lastCompletedAt = normalized.lastCompletedAt ? dayjs(normalized.lastCompletedAt) : null;
  const previous = getPreviousRecurringOccurrence(normalized, now);

  if (!previous.isAfter(now) && (!lastCompletedAt || lastCompletedAt.isBefore(previous))) {
    return previous;
  }

  return getNextRecurringOccurrence(normalized, now);
}

export function getReminderRepeatLabel(repeat: ReminderRepeat): string {
  if (repeat === 'daily') return '每天';
  if (repeat === 'weekly') return '每周';
  if (repeat === 'weekdays') return '工作日';
  return '单次';
}

export async function getReminders(): Promise<ReminderItem[]> {
  const reminders = await localforage.getItem<ReminderItem[]>(KEY);
  const normalized = (reminders || []).map(normalizeReminder);
  const now = dayjs();
  return normalized.sort((a, b) => {
    const diff = getReminderDueAt(a, now).valueOf() - getReminderDueAt(b, now).valueOf();
    if (diff !== 0) {
      return diff;
    }
    return dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf();
  });
}

export async function saveReminder(reminder: ReminderItem): Promise<void> {
  const reminders = await getReminders();
  const next = reminders.filter((item) => item.id !== reminder.id);
  next.push(normalizeReminder({
    ...reminder,
    updatedAt: new Date().toISOString(),
  }));
  const now = dayjs();
  next.sort((a, b) => getReminderDueAt(a, now).valueOf() - getReminderDueAt(b, now).valueOf());
  await localforage.setItem(KEY, next);
  emitReminderUpdated();
}

export async function deleteReminder(id: string): Promise<void> {
  const reminders = await getReminders();
  await localforage.setItem(KEY, reminders.filter((item) => item.id !== id));
  emitReminderUpdated();
}
