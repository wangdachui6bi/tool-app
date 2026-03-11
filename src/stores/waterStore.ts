import localforage from 'localforage';
import type { WaterRecord } from '../types';

const KEY = 'water_records';

export async function getWaterRecords(): Promise<WaterRecord[]> {
  return (await localforage.getItem<WaterRecord[]>(KEY)) || [];
}

export async function getWaterByDate(date: string): Promise<WaterRecord> {
  const records = await getWaterRecords();
  const found = records.find(r => r.date === date);
  return found || { date, amount: 0, goal: 2000, logs: [] };
}

export async function addWater(date: string, ml: number): Promise<WaterRecord> {
  const records = await getWaterRecords();
  let record = records.find(r => r.date === date);
  if (!record) {
    record = { date, amount: 0, goal: 2000, logs: [] };
    records.push(record);
  }
  record.amount += ml;
  record.logs.push({ time: new Date().toISOString(), amount: ml });
  await localforage.setItem(KEY, records);
  return record;
}

export async function setWaterGoal(date: string, goal: number): Promise<void> {
  const records = await getWaterRecords();
  let record = records.find(r => r.date === date);
  if (!record) {
    record = { date, amount: 0, goal, logs: [] };
    records.push(record);
  } else {
    record.goal = goal;
  }
  await localforage.setItem(KEY, records);
}
