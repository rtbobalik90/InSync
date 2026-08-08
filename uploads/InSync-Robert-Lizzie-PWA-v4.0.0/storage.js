const DB_NAME = 'insync-local-v1';
const STORE_NAME = 'app';
const KEY = 'state';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = callback(store);
    tx.oncomplete = () => resolve(result?.result ?? result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }).finally(() => db.close());
}

export async function loadState() {
  try {
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  } catch (error) {
    console.warn('IndexedDB unavailable, falling back to localStorage.', error);
    const raw = localStorage.getItem(DB_NAME);
    return raw ? JSON.parse(raw) : null;
  }
}

export async function saveState(state) {
  const clean = structuredClone(state);
  delete clean.ui;
  try {
    await withStore('readwrite', store => store.put(clean, KEY));
  } catch (error) {
    console.warn('IndexedDB save failed, using localStorage.', error);
    localStorage.setItem(DB_NAME, JSON.stringify(clean));
  }
}

export async function clearState() {
  try {
    await withStore('readwrite', store => store.delete(KEY));
  } catch {
    localStorage.removeItem(DB_NAME);
  }
}

export function downloadJson(data, filename = 'insync-backup.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function readJsonFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}
