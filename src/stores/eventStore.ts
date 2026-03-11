import localforage from 'localforage';
import type { MemorialEvent } from '../types';

const EVENTS_KEY = 'memorial_events';

localforage.config({
  name: 'tool-app',
  storeName: 'tool_data',
});

export async function getAllEvents(): Promise<MemorialEvent[]> {
  return (await localforage.getItem<MemorialEvent[]>(EVENTS_KEY)) || [];
}

export async function addEvent(event: MemorialEvent): Promise<void> {
  const events = await getAllEvents();
  events.unshift(event);
  await localforage.setItem(EVENTS_KEY, events);
}

export async function updateEvent(event: MemorialEvent): Promise<void> {
  const events = await getAllEvents();
  const index = events.findIndex(e => e.id === event.id);
  if (index !== -1) {
    events[index] = event;
    await localforage.setItem(EVENTS_KEY, events);
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const events = await getAllEvents();
  await localforage.setItem(EVENTS_KEY, events.filter(e => e.id !== id));
}

export async function getEventById(id: string): Promise<MemorialEvent | null> {
  const events = await getAllEvents();
  return events.find(e => e.id === id) || null;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
