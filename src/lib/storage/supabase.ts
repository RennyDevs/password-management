import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Record, RecordListItem } from '../../types/record';

let supabase: SupabaseClient | null = null;

export function initSupabase(url: string, anonKey: string): SupabaseClient {
  supabase = createClient(url, anonKey);
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
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
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
  const payload = {
    ...record,
    updated_at: now,
    created_at: record.created_at || now,
  };

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
