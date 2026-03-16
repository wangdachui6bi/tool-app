import localforage from 'localforage';
import type { WeightEntry } from '../types';

const KEY = 'weight_entries';
const PERSONS_KEY = 'weight_persons';
const ACTIVE_PERSON_KEY = 'weight_active_person';
const DEFAULT_PERSON = '我';

export async function getPersons(): Promise<string[]> {
  const list = await localforage.getItem<string[]>(PERSONS_KEY);
  return list && list.length > 0 ? list : [DEFAULT_PERSON];
}

export async function addPerson(name: string): Promise<void> {
  const list = await getPersons();
  if (!list.includes(name)) {
    list.push(name);
    await localforage.setItem(PERSONS_KEY, list);
  }
}

export async function removePerson(name: string): Promise<void> {
  const list = await getPersons();
  await localforage.setItem(PERSONS_KEY, list.filter(p => p !== name));
}

export async function getActivePerson(): Promise<string> {
  return (await localforage.getItem<string>(ACTIVE_PERSON_KEY)) || DEFAULT_PERSON;
}

export async function setActivePerson(name: string): Promise<void> {
  await localforage.setItem(ACTIVE_PERSON_KEY, name);
}

export async function getWeightEntries(person?: string): Promise<WeightEntry[]> {
  const list = (await localforage.getItem<WeightEntry[]>(KEY)) || [];
  const filtered = person
    ? list.filter(e => (e.person || DEFAULT_PERSON) === person)
    : list;
  return filtered.sort((a, b) => a.date.localeCompare(b.date));
}

export async function addWeightEntry(entry: WeightEntry): Promise<void> {
  const list = (await localforage.getItem<WeightEntry[]>(KEY)) || [];
  const idx = list.findIndex(
    e => e.date === entry.date && (e.person || DEFAULT_PERSON) === (entry.person || DEFAULT_PERSON)
  );
  if (idx !== -1) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  await localforage.setItem(KEY, list);
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const list = (await localforage.getItem<WeightEntry[]>(KEY)) || [];
  await localforage.setItem(KEY, list.filter(e => e.id !== id));
}
