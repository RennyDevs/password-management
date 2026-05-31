import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { Record, RecordListItem } from '../../types/record';

const DB_NAME = 'passmgr';
const STORE_NAME = 'records';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheRecords(records: Record[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const record of records) {
    await store.put(record);
  }
  await tx.done;
}

export async function getRecord(id: string): Promise<Record | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, id);
}

export async function upsertRecordCache(record: Record): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, record);
}

export async function deleteRecordCache(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function clearAllRecords(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function getAllCachedRecords(): Promise<Record[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function getCachedRecordList(): Promise<RecordListItem[]> {
  const records = await getAllCachedRecords();
  return records.map((r) => ({
    id: r.id,
    title: r.title,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}
