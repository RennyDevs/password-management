import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { Record, RecordListItem } from '../../types/record';

const DB_NAME = 'passmgr';
const STORE_RECORDS = 'records';
const STORE_PENDING = 'pendingOps';
const DB_VERSION = 3;

// ---- Pending operation types ----

export type PendingOp =
  | { type: 'upsert'; record: Record }
  | { type: 'delete'; id: string };

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Reset the cached database connection (used in tests).
 * The next call to any storage function will open a fresh connection.
 */
export function resetDb(): void {
  dbPromise = null;
}

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          const store = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        }
        // v2: pending operations queue for offline sync
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(STORE_PENDING)) {
            db.createObjectStore(STORE_PENDING, {
              keyPath: 'id',
              autoIncrement: true,
            });
          }
        }
        // v3: tags index (added to existing store via raw transaction)
        if (oldVersion < 3 && transaction) {
          const store = transaction.objectStore(STORE_RECORDS);
          if (!store.indexNames.contains('tags')) {
            store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          }
        }
      },
    });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Record cache
// ---------------------------------------------------------------------------

export async function cacheRecords(records: Record[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_RECORDS, 'readwrite');
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}

export async function getRecord(id: string): Promise<Record | undefined> {
  const db = await getDb();
  return db.get(STORE_RECORDS, id);
}

export async function upsertRecordCache(record: Record): Promise<void> {
  const db = await getDb();
  await db.put(STORE_RECORDS, record);
}

export async function deleteRecordCache(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_RECORDS, id);
}

export async function clearAllRecords(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_RECORDS);
}

export async function getAllCachedRecords(): Promise<Record[]> {
  const db = await getDb();
  return db.getAll(STORE_RECORDS);
}

export async function getCachedRecordList(): Promise<RecordListItem[]> {
  const records = await getAllCachedRecords();
  return records.map((r) => ({
    id: r.id,
    title: r.title,
    tags: r.tags ?? [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

// ---------------------------------------------------------------------------
// Pending operations queue (offline resilience)
// ---------------------------------------------------------------------------

/** Append an operation to the pending queue (offline writes). */
export async function enqueuePendingOp(op: PendingOp): Promise<void> {
  const db = await getDb();
  await db.add(STORE_PENDING, op);
}

/** Retrieve all pending ops in FIFO order. */
export async function getPendingOps(): Promise<(PendingOp & { id: number })[]> {
  const db = await getDb();
  return db.getAll(STORE_PENDING);
}

/** Remove a single pending op after successful sync. */
export async function removePendingOp(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_PENDING, id);
}

/** Clear the entire pending queue. */
export async function clearPendingOps(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_PENDING);
}

/** Count pending operations (for UI badge, etc.). */
export async function pendingOpCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_PENDING);
}
