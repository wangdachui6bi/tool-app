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

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface HabitCheck {
  habitId: string;
  date: string;
}

export interface CountdownEvent {
  id: string;
  name: string;
  targetDate: string;
  icon?: string;
  note?: string;
  createdAt: string;
}

export interface WaterRecord {
  date: string;
  amount: number;
  goal: number;
  logs: { time: string; amount: number }[];
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}
