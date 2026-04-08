import localforage from 'localforage';
import type { TodoItem } from '../types';

const KEY = 'todo_items';
const CLOUD_MIGRATION_KEY = 'todo_items_cloud_migrated_v2';
const TODO_SYNC_SERVER = import.meta.env.VITE_SYNC_SERVER_URL || import.meta.env.VITE_UPDATE_SERVER_URL || '';
const TODO_SYNC_TOKEN = import.meta.env.VITE_TODO_SYNC_TOKEN || '';
const FEISHU_CHECK_THROTTLE_MS = 30 * 1000;

let lastFeishuCheckAt = 0;

interface ServerTodoItem extends TodoItem {
  meta?: {
    date?: string;
    time?: string;
  } | null;
}

interface TodoListResponse {
  items: ServerTodoItem[];
  total: number;
  serverTime: string;
}

function emitTodoUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('todoUpdated'));
  }
}

function normalizeTodo(item: TodoItem): TodoItem {
  const createdAt = item.createdAt || new Date().toISOString();
  return {
    ...item,
    date: item.date || createdAt.slice(0, 10),
    time: item.time || '',
    createdAt,
    updatedAt: item.updatedAt || createdAt,
    deletedAt: item.deletedAt || null,
  };
}

function fromServerTodo(item: ServerTodoItem): TodoItem {
  return normalizeTodo({
    ...item,
    date: item.meta?.date || item.date || item.createdAt?.slice(0, 10),
    time: item.meta?.time || item.time || '',
  });
}

function toServerTodoPayload(item: TodoItem) {
  const normalized = normalizeTodo(item);
  return {
    id: normalized.id,
    text: normalized.text,
    completed: normalized.completed,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    deletedAt: normalized.deletedAt || null,
    meta: {
      date: normalized.date,
      time: normalized.time || '',
    },
  };
}

function getCloudEnabled() {
  return Boolean(TODO_SYNC_SERVER && TODO_SYNC_TOKEN);
}

async function getStoredTodos(): Promise<TodoItem[]> {
  const list = (await localforage.getItem<TodoItem[]>(KEY)) || [];
  return list.map(normalizeTodo);
}

async function saveStoredTodos(list: TodoItem[]): Promise<void> {
  const normalized = list.map(normalizeTodo).sort((a, b) => {
    if (a.deletedAt && !b.deletedAt) return 1;
    if (!a.deletedAt && b.deletedAt) return -1;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  await localforage.setItem(KEY, normalized);
  emitTodoUpdated();
}

async function saveServerTodos(items: TodoItem[]): Promise<TodoItem[]> {
  const normalized = (items || []).map(fromServerTodo);
  await saveStoredTodos(normalized);
  return normalized;
}

async function requestTodoList(path: string, init?: RequestInit): Promise<TodoListResponse> {
  const response = await fetch(`${TODO_SYNC_SERVER}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Token': TODO_SYNC_TOKEN,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败: ${response.status}`);
  }

  return response.json() as Promise<TodoListResponse>;
}

function triggerServerFeishuCheck(reason: string) {
  if (!getCloudEnabled()) {
    return;
  }

  const now = Date.now();
  if (now - lastFeishuCheckAt < FEISHU_CHECK_THROTTLE_MS) {
    return;
  }

  lastFeishuCheckAt = now;
  void requestTodoList('/api/sync/feishu/check', {
    method: 'POST',
  }).catch((error) => {
    console.warn(`[todoStore] feishu check failed after ${reason}`, error);
  });
}

async function ensureCloudImported(): Promise<void> {
  if (!getCloudEnabled()) return;

  const migrated = await localforage.getItem<boolean>(CLOUD_MIGRATION_KEY);
  if (migrated) return;

  const localItems = await getStoredTodos();
  if (localItems.length === 0) {
    await localforage.setItem(CLOUD_MIGRATION_KEY, true);
    return;
  }

  const data = await requestTodoList('/api/sync/todos/import', {
    method: 'POST',
    body: JSON.stringify({
      sourceApp: 'tool-app',
      items: localItems.map((item) => toServerTodoPayload(item)),
    }),
  });

  await saveServerTodos(data.items || []);
  triggerServerFeishuCheck('import');
  await localforage.setItem(CLOUD_MIGRATION_KEY, true);
}

export function getTodoSyncConfig() {
  return {
    enabled: getCloudEnabled(),
    serverUrl: TODO_SYNC_SERVER,
  };
}

export async function getTodos(includeDeleted = false): Promise<TodoItem[]> {
  const list = await getStoredTodos();
  return includeDeleted ? list : list.filter((item) => !item.deletedAt);
}

export async function refreshTodos(): Promise<{ enabled: boolean; total: number; message: string }> {
  if (!getCloudEnabled()) {
    return {
      enabled: false,
      total: 0,
      message: '云同步未配置',
    };
  }

  await ensureCloudImported();
  const data = await requestTodoList('/api/sync/todos');
  const items = await saveServerTodos(data.items || []);
  triggerServerFeishuCheck('refresh');

  return {
    enabled: true,
    total: data.total || items.length,
    message: `已从云端刷新 ${data.total || items.length} 条待办`,
  };
}

export async function syncTodos() {
  return refreshTodos();
}

export async function addTodo(item: TodoItem): Promise<void> {
  if (!getCloudEnabled()) {
    const list = await getStoredTodos();
    list.unshift(normalizeTodo(item));
    await saveStoredTodos(list);
    return;
  }

  await ensureCloudImported();
  const data = await requestTodoList('/api/sync/todos', {
    method: 'POST',
    body: JSON.stringify({
      ...toServerTodoPayload(item),
      sourceApp: 'tool-app',
    }),
  });

  await saveServerTodos(data.items || []);
  triggerServerFeishuCheck('add');
}

export async function updateTodo(id: string, patch: Pick<TodoItem, 'text' | 'date' | 'time'>): Promise<void> {
  const nextText = patch.text.trim();
  if (!nextText) {
    throw new Error('待办内容不能为空');
  }

  if (!getCloudEnabled()) {
    const list = await getStoredTodos();
    const item = list.find((todo) => todo.id === id && !todo.deletedAt);
    if (!item) {
      throw new Error('待办不存在，无法更新');
    }

    item.text = nextText;
    item.date = patch.date || item.date || item.createdAt.slice(0, 10);
    item.time = patch.time || '';
    item.updatedAt = new Date().toISOString();
    await saveStoredTodos(list);
    return;
  }

  await ensureCloudImported();
  const list = await getStoredTodos();
  const item = list.find((todo) => todo.id === id && !todo.deletedAt);
  if (!item) {
    throw new Error('待办不存在，无法更新');
  }

  const data = await requestTodoList(`/api/sync/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      text: nextText,
      meta: {
        date: patch.date || item.date || item.createdAt.slice(0, 10),
        time: patch.time || '',
      },
      sourceApp: 'tool-app',
    }),
  });

  await saveServerTodos(data.items || []);
  triggerServerFeishuCheck('update');
}

export async function toggleTodo(id: string): Promise<void> {
  if (!getCloudEnabled()) {
    const list = await getStoredTodos();
    const item = list.find((todo) => todo.id === id && !todo.deletedAt);
    if (item) {
      item.completed = !item.completed;
      item.updatedAt = new Date().toISOString();
      await saveStoredTodos(list);
    }
    return;
  }

  await ensureCloudImported();
  const list = await getStoredTodos();
  const item = list.find((todo) => todo.id === id && !todo.deletedAt);
  if (!item) {
    throw new Error('待办不存在，无法切换状态');
  }

  const data = await requestTodoList(`/api/sync/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      completed: !item.completed,
      sourceApp: 'tool-app',
    }),
  });

  await saveServerTodos(data.items || []);
  triggerServerFeishuCheck('toggle');
}

export async function deleteTodo(id: string): Promise<void> {
  if (!getCloudEnabled()) {
    const list = await getStoredTodos();
    const item = list.find((todo) => todo.id === id && !todo.deletedAt);
    if (item) {
      const now = new Date().toISOString();
      item.deletedAt = now;
      item.updatedAt = now;
      await saveStoredTodos(list);
    }
    return;
  }

  await ensureCloudImported();
  const data = await requestTodoList(`/api/sync/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({
      sourceApp: 'tool-app',
    }),
  });

  await saveServerTodos(data.items || []);
  triggerServerFeishuCheck('delete');
}

export async function clearCompleted(): Promise<void> {
  if (!getCloudEnabled()) {
    const list = await getStoredTodos();
    const now = new Date().toISOString();
    let changed = false;

    for (const item of list) {
      if (!item.deletedAt && item.completed) {
        item.deletedAt = now;
        item.updatedAt = now;
        changed = true;
      }
    }

    if (changed) {
      await saveStoredTodos(list);
    }
    return;
  }

  await ensureCloudImported();
  const data = await requestTodoList('/api/sync/todos/clear-completed', {
    method: 'POST',
    body: JSON.stringify({
      sourceApp: 'tool-app',
    }),
  });

  await saveServerTodos(data.items || []);
  triggerServerFeishuCheck('clear-completed');
}
