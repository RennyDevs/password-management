import { getSupabaseClient } from '../storage/supabase';
import type { User } from '@supabase/supabase-js';

export async function signUp(email: string, password: string): Promise<User | null> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signIn(email: string, password: string): Promise<User | null> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await getSupabaseClient().auth.getUser();
  return data?.user || null;
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null);
    }
  );
  return () => subscription.unsubscribe();
}
