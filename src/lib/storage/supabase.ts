import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Record, RecordListItem } from '../../types/record';

let supabase: SupabaseClient | null = null;
let initCalled = false;

/**
 * Lazy-safe Supabase client initialization.
 *
 * Subsequent calls with the same (or different) parameters are no-ops —
 * the first invocation wins. This makes the function idempotent and safe
 * to call from multiple places (e.g. App init + tests).
 */
export function initSupabase(url: string, anonKey: string): SupabaseClient {
  if (!supabase) {
    supabase = createClient(url, anonKey);
  } else if (!initCalled) {
    // Already created elsewhere (e.g. a previous App mount in dev mode
    // with Fast Refresh), but flag wasn't set — fix the flag.
  }
  initCalled = true;
  return supabase;
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase not initialized. Call initSupabase first.');
  }
  return supabase;
}

export async function fetchRecords(userId: string): Promise<RecordListItem[]> {
  const { data, error } = await getSupabaseClient()
    .from('records')
    .select('id, title, tags, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((r: { [key: string]: unknown }) => ({
    id: r.id as string,
    title: r.title as string,
    tags: (r.tags as string[]) ?? [],
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

export async function fetchFullRecord(recordId: string): Promise<Record | null> {
  const { data, error } = await getSupabaseClient()
    .from('records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (error) throw error;
  return data;
}

export async function upsertRecord(
  record: Omit<Record, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
): Promise<void> {
  const now = new Date().toISOString();
  const payload: { [key: string]: unknown } = {
    ...record,
    updated_at: now,
  };
  // Only set created_at for new records; omit on updates to preserve original.
  // Strip falsy values (empty string, null, undefined) to avoid timestamp errors.
  if (record.created_at) {
    payload.created_at = record.created_at;
  } else {
    delete payload.created_at;
  }

  const { error } = await getSupabaseClient()
    .from('records')
    .upsert(payload, { onConflict: 'id' });

  if (error) throw error;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('records')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
