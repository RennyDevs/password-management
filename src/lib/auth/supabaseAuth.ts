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

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const client = getSupabaseClient();

  // Env flag: if true, reauthenticate before changing password so the user
  // can change it at any point during the session.
  const reauthenticate = import.meta.env.VITE_REAUTHENTICATE_BEFORE_PASSWORD_CHANGE === 'true';

  if (reauthenticate) {
    const user = await getCurrentUser();
    if (!user?.email) {
      throw new Error('No authenticated user with email found.');
    }

    const { error: reauthError } = await client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) throw reauthError;
  }

  const { error } = await client.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null);
    }
  );
  return () => subscription.unsubscribe();
}
