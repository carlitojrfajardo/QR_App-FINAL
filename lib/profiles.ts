import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

/** Roles an admin is allowed to assign from the dashboard. */
export type AssignableRole = Exclude<Role, 'admin'>;

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { full_name?: string; role?: Role }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error: error?.message ?? null };
}

// ---- Admin: user management (PDF: Administrator can manage users) ----

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data as Profile[];
}

export async function updateUserRole(
  targetUserId: string,
  role: AssignableRole
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', targetUserId);
  return { error: error?.message ?? null };
}
