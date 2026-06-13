/**
 * Repository pattern: unified service layer that wraps Supabase + IndexedDB.
 *
 * Every public operation writes through Supabase first and then updates the
 * IndexedDB cache (write-through strategy). Reads also go to Supabase,
 * so the cache is a best-effort offline fallback, not the source of truth.
 *
 * Offline mode:
 *  - When `navigator.onLine === false`, mutations are queued in IndexedDB
 *    (`STORE_PENDING`) instead of failing.  The `useOnlineSync` hook picks
 *    them up when connectivity is restored.
 */

import {
  fetchRecords,
  fetchFullRecord,
  upsertRecord,
  deleteRecord,
} from './supabase';
import {
  upsertRecordCache,
  deleteRecordCache,
  getCachedRecordList,
  getRecord,
  enqueuePendingOp,
} from './indexeddb';
import type { Record, RecordListItem } from '../../types/record';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch the record list (id, title, timestamps) for a given user. */
export async function getUserRecordList(userId: string): Promise<RecordListItem[]> {
  try {
    return await fetchRecords(userId);
  } catch {
    // Fallback to cached list when offline
    return getCachedRecordList();
  }
}

/** Fetch a full record by id (decryption-ready fields). */
export async function getUserFullRecord(recordId: string): Promise<Record | null> {
  try {
    return await fetchFullRecord(recordId);
  } catch {
    // Fallback to cached record
    const cached = await getRecord(recordId);
    return cached ?? null;
  }
}

// ---------------------------------------------------------------------------
// Mutations (write-through + offline queue)
// ---------------------------------------------------------------------------

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/** Create or update a record in Supabase and the local IndexedDB cache. */
export async function saveRecord(
  record: Omit<Record, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
): Promise<void> {
  const fullRecord: Record = {
    id: record.id,
    user_id: record.user_id,
    title: record.title,
    ciphertext: record.ciphertext,
    nonce: record.nonce,
    salt: record.salt,
    alg_version: record.alg_version,
    tags: record.tags ?? [],
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? new Date().toISOString(),
  };

  // Always update local cache first (optimistic)
  await upsertRecordCache(fullRecord);

  if (isOnline()) {
    try {
      await upsertRecord(record);
    } catch {
      // Queue for later sync
      await enqueuePendingOp({ type: 'upsert', record: fullRecord });
      throw new Error('Saved locally — will sync when back online.');
    }
  } else {
    // Offline: queue
    await enqueuePendingOp({ type: 'upsert', record: fullRecord });
  }
}

/** Delete a record from Supabase and the IndexedDB cache. */
export async function removeRecord(recordId: string): Promise<void> {
  // Always update local cache first (optimistic)
  await deleteRecordCache(recordId);

  if (isOnline()) {
    try {
      await deleteRecord(recordId);
    } catch {
      // Queue for later sync
      await enqueuePendingOp({ type: 'delete', id: recordId });
      throw new Error('Deleted locally — will sync when back online.');
    }
  } else {
    // Offline: queue
    await enqueuePendingOp({ type: 'delete', id: recordId });
  }
}

// ---------------------------------------------------------------------------
// Cache-only helpers (offline resilience, optional)
// ---------------------------------------------------------------------------

/**
 * Return the locally cached record list.
 * Useful as a fallback when the Supabase call fails.
 */
export async function getCachedRecordListSafe(): Promise<RecordListItem[]> {
  return getCachedRecordList();
}

/**
 * Return a single cached record, if available.
 */
export async function getCachedRecordSafe(id: string): Promise<Record | undefined> {
  return getRecord(id);
}
