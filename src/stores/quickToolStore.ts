import localforage from 'localforage';

const KEY = 'quick_tool_ids';

const DEFAULT_IDS = [
  'anniversary', 'habit', 'countdown', 'todo',
  'water', 'pomodoro', 'tax', 'random',
];

export async function getQuickToolIds(): Promise<string[]> {
  const ids = await localforage.getItem<string[]>(KEY);
  return ids || DEFAULT_IDS;
}

export async function saveQuickToolIds(ids: string[]): Promise<void> {
  await localforage.setItem(KEY, ids);
}
