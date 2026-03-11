import localforage from 'localforage';
import type { CountdownEvent } from '../types';

const KEY = 'countdown_events';

export async function getCountdowns(): Promise<CountdownEvent[]> {
  return (await localforage.getItem<CountdownEvent[]>(KEY)) || [];
}

export async function addCountdown(e: CountdownEvent): Promise<void> {
  const list = await getCountdowns();
  list.unshift(e);
  await localforage.setItem(KEY, list);
}

export async function deleteCountdown(id: string): Promise<void> {
  const list = await getCountdowns();
  await localforage.setItem(KEY, list.filter(e => e.id !== id));
}
