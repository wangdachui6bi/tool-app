import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import dayjs from 'dayjs';
import {
  getReminderNotificationIds,
  getReminders,
  isRepeatingReminder,
  type ReminderItem,
  type ReminderLevel,
  type ReminderRepeat,
} from '../stores/reminderStore';

const WEEKDAY_REPEAT_SLOTS = [1, 2, 3, 4, 5] as const;
const MAX_NOTIFICATION_ID = 2147483000;
const REMINDER_GROUP = 'tool_app_reminders';
const CHANNELS = {
  normal: 'reminder_normal',
  important: 'reminder_important',
  urgent: 'reminder_urgent',
} as const;

export interface ReminderNotificationStatus {
  canNotify: boolean;
  displayGranted: boolean;
  exactAlarmGranted: boolean;
}

function isAndroidNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function toCapacitorWeekday(day: number): number {
  return day === 0 ? 1 : day + 1;
}

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

export function createNotificationIds(reminderId: string, repeat: ReminderRepeat): number[] {
  if (repeat === 'weekdays') {
    return WEEKDAY_REPEAT_SLOTS.map((slot) => makeStableNotificationId(`${reminderId}:weekday:${slot}`));
  }

  return [makeStableNotificationId(`${reminderId}:${repeat}`)];
}

function getChannelId(level: ReminderLevel): string {
  if (level === 'urgent') return CHANNELS.urgent;
  if (level === 'important') return CHANNELS.important;
  return CHANNELS.normal;
}

function buildBaseNotification(reminder: ReminderItem, id: number, at = dayjs(reminder.remindAt)): LocalNotificationSchema {
  const body = reminder.note.trim() || '别忘了这件事';

  return {
    id,
    title: makeNotificationTitle(reminder.level, reminder.title),
    body,
    largeBody: body,
    summaryText: reminder.level === 'urgent' ? '强提醒' : '提醒工具',
    channelId: getChannelId(reminder.level),
    group: REMINDER_GROUP,
    autoCancel: true,
    extra: {
      reminderId: reminder.id,
      reminderLevel: reminder.level,
      repeat: reminder.repeat,
    },
    schedule: {
      at: at.toDate(),
      allowWhileIdle: true,
    },
  };
}

export function buildNotificationPayloads(reminder: ReminderItem): LocalNotificationSchema[] {
  const at = dayjs(reminder.remindAt);
  const ids = getReminderNotificationIds(reminder);

  if (reminder.repeat === 'daily') {
    return [
      {
        ...buildBaseNotification(reminder, ids[0], at),
        schedule: {
          on: {
            hour: at.hour(),
            minute: at.minute(),
          },
          repeats: true,
          allowWhileIdle: true,
        },
      },
    ];
  }

  if (reminder.repeat === 'weekly') {
    return [
      {
        ...buildBaseNotification(reminder, ids[0], at),
        schedule: {
          on: {
            weekday: toCapacitorWeekday(at.day()),
            hour: at.hour(),
            minute: at.minute(),
          },
          repeats: true,
          allowWhileIdle: true,
        },
      },
    ];
  }

  if (reminder.repeat === 'weekdays') {
    return WEEKDAY_REPEAT_SLOTS.map((slot, index) => ({
      ...buildBaseNotification(reminder, ids[index], at),
      schedule: {
        on: {
          weekday: slot + 1,
          hour: at.hour(),
          minute: at.minute(),
        },
        repeats: true,
        allowWhileIdle: true,
      },
    }));
  }

  return [buildBaseNotification(reminder, ids[0], at)];
}

export async function ensureReminderChannels(): Promise<void> {
  if (!isAndroidNative()) return;

  await Promise.all([
    LocalNotifications.createChannel({
      id: CHANNELS.normal,
      name: '提醒工具',
      description: '普通提醒',
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#2563EB',
    }),
    LocalNotifications.createChannel({
      id: CHANNELS.important,
      name: '重要提醒',
      description: '高可见度提醒',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#F97316',
    }),
    LocalNotifications.createChannel({
      id: CHANNELS.urgent,
      name: '强提醒',
      description: '到点强提醒，适合重要和紧急事项',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#EF4444',
    }),
  ]);
}

export async function getReminderNotificationStatus(): Promise<ReminderNotificationStatus> {
  if (!Capacitor.isNativePlatform()) {
    return {
      canNotify: false,
      displayGranted: false,
      exactAlarmGranted: false,
    };
  }

  const permission = await LocalNotifications.checkPermissions();
  const displayGranted = permission.display === 'granted';
  const exactAlarmGranted = !isAndroidNative()
    ? true
    : (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';

  return {
    canNotify: displayGranted && exactAlarmGranted,
    displayGranted,
    exactAlarmGranted,
  };
}

export async function clearReminderNotifications(ids: number[]): Promise<void> {
  if (!Capacitor.isNativePlatform() || ids.length === 0) return;

  const notifications = ids.map((id) => ({ id }));
  await LocalNotifications.cancel({ notifications });
  const delivered = await LocalNotifications.getDeliveredNotifications();
  const matched = delivered.notifications.filter((notification) => ids.includes(notification.id));
  if (matched.length > 0) {
    await LocalNotifications.removeDeliveredNotifications({ notifications: matched });
  }
}

function shouldScheduleReminder(reminder: ReminderItem): boolean {
  if (reminder.completed && !isRepeatingReminder(reminder)) {
    return false;
  }

  if (isRepeatingReminder(reminder)) {
    return true;
  }

  return dayjs(reminder.remindAt).isAfter(dayjs().subtract(1, 'minute'));
}

export async function syncReminderNotifications(reminders?: ReminderItem[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await ensureReminderChannels();

  const status = await getReminderNotificationStatus();
  if (!status.displayGranted) return;

  const activeReminders = (reminders || await getReminders()).filter(shouldScheduleReminder);

  await Promise.all(activeReminders.map(async (reminder) => {
    const ids = getReminderNotificationIds(reminder);
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    }

    await LocalNotifications.schedule({
      notifications: buildNotificationPayloads(reminder),
    });
  }));
}

export async function openExactAlarmSettings(): Promise<boolean> {
  if (!isAndroidNative()) return false;

  const result = await LocalNotifications.changeExactNotificationSetting();
  return result.exact_alarm === 'granted';
}
