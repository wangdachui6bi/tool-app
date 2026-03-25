import localforage from 'localforage';

export type ReminderLevel = 'normal' | 'important' | 'urgent';

export interface ReminderItem {
  id: string;
  notificationId: number;
  title: string;
  note: string;
  remindAt: string;
  level: ReminderLevel;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const KEY = 'tool_app_reminders_v1';

function emitReminderUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('reminderUpdated'));
  }
}

export async function getReminders(): Promise<ReminderItem[]> {
  const reminders = await localforage.getItem<ReminderItem[]>(KEY);
  return (reminders || []).sort((a, b) => a.remindAt.localeCompare(b.remindAt));
}

export async function saveReminder(reminder: ReminderItem): Promise<void> {
  const reminders = await getReminders();
  const next = reminders.filter((item) => item.id !== reminder.id);
  next.push({
    ...reminder,
    updatedAt: new Date().toISOString(),
  });
  next.sort((a, b) => a.remindAt.localeCompare(b.remindAt));
  await localforage.setItem(KEY, next);
  emitReminderUpdated();
}

export async function deleteReminder(id: string): Promise<void> {
  const reminders = await getReminders();
  await localforage.setItem(KEY, reminders.filter((item) => item.id !== id));
  emitReminderUpdated();
}
