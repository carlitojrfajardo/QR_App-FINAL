import { supabase } from './supabase';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
  venue?: string;
  description?: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  description: string | null;
  status: 'open' | 'closed';
  qr_token: string | null;
  qr_expires_at: string | null;
  created_by: string | null;
  created_at: string;
};

function newToken(): string {
  // Mubo pero lisod tagnaon — igo para sa QR + anti-screenshot.
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

export async function createEvent(
  event: Event
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const token = newToken();
  const { error } = await supabase.from('events').upsert(
    {
      event_code: event.eventId,
      title: event.title,
      start_time: event.start || null,
      end_time: event.end || null,
      venue: event.venue?.trim() || null,
      description: event.description?.trim() || null,
      status: 'open',
      qr_token: token,
      // Default expiry = end_time (kung naa), para time-limited ang QR.
      qr_expires_at: event.end || null,
      created_by: user?.id ?? null,
    },
    { onConflict: 'event_code' }
  );

  return { error: error?.message ?? null };
}

export async function updateEvent(
  eventCode: string,
  updates: {
    title?: string;
    start?: string;
    end?: string;
    venue?: string;
    description?: string;
  }
): Promise<{ error: string | null }> {
  const payload: Record<string, string | null> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.start !== undefined) payload.start_time = updates.start || null;
  if (updates.end !== undefined) {
    payload.end_time = updates.end || null;
    // Kung gi-usab ang end, i-sync pud ang QR expiry.
    payload.qr_expires_at = updates.end || null;
  }
  if (updates.venue !== undefined) payload.venue = updates.venue || null;
  if (updates.description !== undefined)
    payload.description = updates.description || null;

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('event_code', eventCode);

  return { error: error?.message ?? null };
}

export async function closeEvent(
  eventCode: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status: 'closed' })
    .eq('event_code', eventCode);
  return { error: error?.message ?? null };
}

export async function reopenEvent(
  eventCode: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status: 'open' })
    .eq('event_code', eventCode);
  return { error: error?.message ?? null };
}

/** Smart QR rotation: bag-ong token + bag-ong expiry (minutes gikan karon). */
export async function rotateQrToken(
  eventCode: string,
  expiresInMinutes = 5
): Promise<{ error: string | null; token?: string; expiresAt?: string }> {
  const token = newToken();
  const expiresAt = new Date(
    Date.now() + expiresInMinutes * 60 * 1000
  ).toISOString();
  const { error } = await supabase
    .from('events')
    .update({ qr_token: token, qr_expires_at: expiresAt })
    .eq('event_code', eventCode);
  if (error) return { error: error.message };
  return { error: null, token, expiresAt };
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function getAllEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as CloudEvent[];
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}
