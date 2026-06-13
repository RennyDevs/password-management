/**
 * Repository pattern: unified service layer that wraps Supabase + IndexedDB.
 *
 * Every public operation writes through Supabase first and then updates the
 * IndexedDB cache (write-through strategy). Reads also go to Supabase,
 * so the cache is a best-effort offline fallback, not the source of truth.
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
  getRecord as getCachedRecord,
} from './indexeddb';
import type { Record, RecordListItem } from '../../types/record';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch the record list (id, title, timestamps) for a given user. */
export async function getUserRecordList(userId: string): Promise<RecordListItem[]> {
  return fetchRecords(userId);
}

/** Fetch a full record by id (decryption-ready fields). */
export async function getUserFullRecord(recordId: string): Promise<Record | null> {
  return fetchFullRecord(recordId);
}

// ---------------------------------------------------------------------------
// Mutations (write-through)
// ---------------------------------------------------------------------------

/** Create or update a record in Supabase and the local IndexedDB cache. */
export async function saveRecord(
  record: Omit<Record, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
): Promise<void> {
  await upsertRecord(record);
  // IndexedDB cache is best-effort — don't let it break the main flow
  try {
    // For updates where created_at is not provided, fetch the existing record
    // to get the original timestamp for the cache.
    let createdAt = record.created_at;
    if (!createdAt) {
      try {
        const existing = await getCachedRecord(record.id);
        createdAt = existing?.created_at || new Date().toISOString();
      } catch {
        createdAt = new Date().toISOString();
      }
    }
    await upsertRecordCache({
      id: record.id,
      user_id: record.user_id,
      title: record.title,
      ciphertext: record.ciphertext,
      nonce: record.nonce,
      salt: record.salt,
      alg_version: record.alg_version,
      created_at: createdAt,
      updated_at: record.updated_at || new Date().toISOString(),
    });
  } catch {
    // Cache write failed — non-critical
  }
}

/** Delete a record from Supabase and the IndexedDB cache. */
export async function removeRecord(recordId: string): Promise<void> {
  await deleteRecord(recordId);
  // Cache cleanup is best-effort
  try {
    await deleteRecordCache(recordId);
  } catch {
    // Cache delete failed — non-critical
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
  return getCachedRecord(id);
}
