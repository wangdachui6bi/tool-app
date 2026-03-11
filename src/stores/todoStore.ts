import localforage from 'localforage';
import type { TodoItem } from '../types';

const KEY = 'todo_items';

export async function getTodos(): Promise<TodoItem[]> {
  return (await localforage.getItem<TodoItem[]>(KEY)) || [];
}

export async function addTodo(item: TodoItem): Promise<void> {
  const list = await getTodos();
  list.unshift(item);
  await localforage.setItem(KEY, list);
}

export async function toggleTodo(id: string): Promise<void> {
  const list = await getTodos();
  const item = list.find(t => t.id === id);
  if (item) {
    item.completed = !item.completed;
    await localforage.setItem(KEY, list);
  }
}

export async function deleteTodo(id: string): Promise<void> {
  const list = await getTodos();
  await localforage.setItem(KEY, list.filter(t => t.id !== id));
}

export async function clearCompleted(): Promise<void> {
  const list = await getTodos();
  await localforage.setItem(KEY, list.filter(t => !t.completed));
}
