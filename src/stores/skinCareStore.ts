import localforage from 'localforage';

export interface SkinCareRoutine {
  showerAfterSweat: boolean;
  changedClothes: boolean;
  benzoylWash: boolean;
  avoidPicking: boolean;
  cleanBedding: boolean;
}

export interface SkinCareRecord {
  date: string;
  bumpLevel: number;
  itchLevel: number;
  painLevel: number;
  rednessLevel: number;
  pus: boolean;
  spreading: boolean;
  fever: boolean;
  rapidWorsening: boolean;
  triggers: string[];
  routine: SkinCareRoutine;
  notes: string;
  photos: string[];
  updatedAt: string;
}

const KEY = 'skin_care_records_v1';

const DEFAULT_ROUTINE: SkinCareRoutine = {
  showerAfterSweat: false,
  changedClothes: false,
  benzoylWash: false,
  avoidPicking: false,
  cleanBedding: false,
};

export function createEmptySkinRecord(date: string): SkinCareRecord {
  return {
    date,
    bumpLevel: 2,
    itchLevel: 0,
    painLevel: 0,
    rednessLevel: 1,
    pus: false,
    spreading: false,
    fever: false,
    rapidWorsening: false,
    triggers: [],
    routine: { ...DEFAULT_ROUTINE },
    notes: '',
    photos: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function getSkinCareRecords(): Promise<SkinCareRecord[]> {
  const records = await localforage.getItem<SkinCareRecord[]>(KEY);
  return (records || []).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getSkinCareRecordByDate(date: string): Promise<SkinCareRecord> {
  const records = await getSkinCareRecords();
  return records.find((item) => item.date === date) || createEmptySkinRecord(date);
}

export async function saveSkinCareRecord(record: SkinCareRecord): Promise<void> {
  const records = await getSkinCareRecords();
  const next = records.filter((item) => item.date !== record.date);
  next.push({
    ...record,
    updatedAt: new Date().toISOString(),
  });
  next.sort((a, b) => b.date.localeCompare(a.date));
  await localforage.setItem(KEY, next);
}
