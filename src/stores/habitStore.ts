import localforage from 'localforage';
import type { Habit, HabitCheck } from '../types';

const HABITS_KEY = 'habits';
const CHECKS_KEY = 'habit_checks';

export async function getHabits(): Promise<Habit[]> {
  return (await localforage.getItem<Habit[]>(HABITS_KEY)) || [];
}

export async function addHabit(h: Habit): Promise<void> {
  const list = await getHabits();
  list.unshift(h);
  await localforage.setItem(HABITS_KEY, list);
}

export async function deleteHabit(id: string): Promise<void> {
  const list = await getHabits();
  await localforage.setItem(HABITS_KEY, list.filter(h => h.id !== id));
  const checks = await getChecks();
  await localforage.setItem(CHECKS_KEY, checks.filter(c => c.habitId !== id));
}

export async function getChecks(): Promise<HabitCheck[]> {
  return (await localforage.getItem<HabitCheck[]>(CHECKS_KEY)) || [];
}

export async function toggleCheck(habitId: string, date: string): Promise<boolean> {
  const checks = await getChecks();
  const idx = checks.findIndex(c => c.habitId === habitId && c.date === date);
  if (idx !== -1) {
    checks.splice(idx, 1);
    await localforage.setItem(CHECKS_KEY, checks);
    return false;
  }
  checks.push({ habitId, date });
  await localforage.setItem(CHECKS_KEY, checks);
  return true;
}

export function getStreak(checks: HabitCheck[], habitId: string): number {
  const dates = checks.filter(c => c.habitId === habitId).map(c => c.date).sort().reverse();
  if (dates.length === 0) return 0;
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let current = new Date(today);
  for (let i = 0; i < 400; i++) {
    const key = current.toISOString().split('T')[0];
    if (dates.includes(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    current.setDate(current.getDate() - 1);
  }
  return streak;
}
