import localforage from 'localforage';
import type { WeightEntry } from '../types';

const KEY = 'weight_entries';

export async function getWeightEntries(): Promise<WeightEntry[]> {
  const list = (await localforage.getItem<WeightEntry[]>(KEY)) || [];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export async function addWeightEntry(entry: WeightEntry): Promise<void> {
  const list = await getWeightEntries();
  const idx = list.findIndex(e => e.date === entry.date);
  if (idx !== -1) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  await localforage.setItem(KEY, list);
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const list = await getWeightEntries();
  await localforage.setItem(KEY, list.filter(e => e.id !== id));
}
