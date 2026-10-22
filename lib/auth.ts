import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = false;
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function setAuth(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

export type SignUpProfile = {
  full_name: string;
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (!error && data.session && profile) {
    // The DB trigger already created the profiles row as 'student'.
    // Only the name is filled in here — role changes are admin-only at
    // the database level, so signup input can never grant admin access.
    await supabase
      .from('profiles')
      .update({ full_name: profile.full_name })
      .eq('id', data.session.user.id);
  }
  if (!error && data.session) {
    setAuth(data.session);
  }
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!error && data.session) {
    setAuth(data.session);
  }
  return { data, error };
}

export async function signOut() {
  setAuth(null);
  supabase.auth.signOut().catch(() => {});
  return { error: null };
}

/**
 * Changes the password of the currently signed-in account.
 * The current password is verified first so a stale/borrowed session
 * cannot silently lock the real owner out of the account.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const email = globalUser?.email;
  if (!email) {
    return {
      error: new Error('You must be signed in to change your password.'),
    };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verifyError) {
    return { error: new Error('Your current password is incorrect.') };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}
