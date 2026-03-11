export type EventType = 'birthday' | 'anniversary' | 'memorial' | 'custom';

export type CalendarMode = 'solar' | 'lunar';

export interface MemorialEvent {
  id: string;
  name: string;
  date: string;
  type: EventType;
  calendarMode: CalendarMode;
  lunarMonth?: number;
  lunarDay?: number;
  repeatYearly: boolean;
  enableReminder: boolean;
  reminderDays: number;
  note?: string;
  icon?: string;
  createdAt: string;
}
