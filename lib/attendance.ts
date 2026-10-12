import { supabase } from './supabase';
import { parseQRPayload } from './qr';
import { getEventByCode } from './events';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
  status: 'present' | 'late';
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
  status?: 'present' | 'late';
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  createdAt: string | null;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  presentCount: number;
  lateCount: number;
  attendees: {
    studentId: string;
    studentName: string | null;
    scannedAt: string;
    status: 'present' | 'late';
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
  presentCount: number;
  lateCount: number;
};

/** Late grace period: 15 min human sa start = present, human ana = late. */
export const LATE_GRACE_MINUTES = 15;

export function computeStatus(
  startTime: string | null,
  scannedAt: number = Date.now()
): 'present' | 'late' {
  if (!startTime) return 'present';
  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) return 'present';
  return scannedAt > start + LATE_GRACE_MINUTES * 60 * 1000
    ? 'late'
    : 'present';
}

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) {
    return { success: false, message: parsed.message };
  }
  const payload = parsed.payload;

  const now = Date.now();

  // 0) Smart QR expiry check (QR payload mismo naay exp).
  if (payload.exp) {
    const expTime = new Date(payload.exp).getTime();
    if (!Number.isNaN(expTime) && now > expTime) {
      return {
        success: false,
        message: 'QR code expired. Ask your teacher to rotate the QR.',
      };
    }
  }

  // 1) Time window gikan sa QR payload (para sa daan nga full QRs)
  const payloadStart = payload.start
    ? new Date(payload.start).getTime()
    : null;
  const payloadEnd = payload.end ? new Date(payload.end).getTime() : null;

  if (payloadStart && now < payloadStart) {
    return { success: false, message: 'Event has not started yet.' };
  }
  if (payloadEnd && now > payloadEnd) {
    return { success: false, message: 'Event has already ended.' };
  }

  const title = payload.title ?? payload.event;
  let event: {
    id: string;
    title: string;
    start_time: string | null;
    end_time: string | null;
    status?: string | null;
    qr_token?: string | null;
    qr_expires_at?: string | null;
  } | null = null;

  const foundEvent = await getEventByCode(payload.event);
  if (foundEvent) {
    event = foundEvent;

    // 1b) Closed events dili na pwede scan-an (PDF requirement).
    if ((foundEvent as any).status === 'closed') {
      return { success: false, message: 'Event is closed.' };
    }

    // 2) Smart QR token validation (anti-screenshot/reuse).
    // Kung ang event naay qr_token sa DB ug ang QR naay token,
    // kinahanglan mu-match — kung dili, daan/screenshot nga QR na.
    const dbToken = (foundEvent as any).qr_token as string | null;
    if (dbToken && payload.t && payload.t !== dbToken) {
      return {
        success: false,
        message: 'Old QR code. Please scan the latest QR on screen.',
      };
    }
    // Kung ang DB naay expiry (rotating QR), i-check pud.
    const dbExp = (foundEvent as any).qr_expires_at as string | null;
    if (dbExp) {
      const dbExpTime = new Date(dbExp).getTime();
      if (!Number.isNaN(dbExpTime) && now > dbExpTime) {
        return {
          success: false,
          message: 'QR code expired. Ask your teacher to rotate the QR.',
        };
      }
    }

    // 3) Time window gikan sa CLOUD event.
    const cloudStart = foundEvent.start_time
      ? new Date(foundEvent.start_time).getTime()
      : null;
    const cloudEnd = foundEvent.end_time
      ? new Date(foundEvent.end_time).getTime()
      : null;
    if (cloudStart && now < cloudStart) {
      return { success: false, message: 'Event has not started yet.' };
    }
    if (cloudEnd && now > cloudEnd) {
      return { success: false, message: 'Event has already ended.' };
    }
  } else {
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert([
        {
          event_code: payload.event,
          title,
          start_time: payload.start ?? null,
          end_time: payload.end ?? null,
        },
      ])
      .select('id, title')
      .single();

    if (insertError || !newEvent) {
      return { success: false, message: 'Could not create event.' };
    }
    event = newEvent as any;
  }

  if (!event) {
    return { success: false, message: 'Could not create event.' };
  }

  // 4) Late detection: present kung sayo, late kung lapas sa grace period.
  const status = computeStatus((event as any).start_time ?? null, now);

  const { error: attError } = await supabase.from('attendance').insert([
    {
      student_id: studentId,
      event_id: event.id,
      status,
    },
  ]);

  if (attError) {
    if (attError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
      };
    }
    return { success: false, message: attError.message };
  }

  return {
    success: true,
    message:
      status === 'late'
        ? 'Late attendance recorded!'
        : 'Attendance recorded!',
    eventTitle: event.title,
    status,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, status, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as any[]).map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
    status: (row.status ?? 'present') as 'present' | 'late',
  }));
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, created_at, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = (events as any[]).map((e: any) => e.id);
  if (eventIds.length === 0) return [];

  // NOTE: attendance.student_id references auth.users, NOT profiles,
  // so a direct `profiles (...)` join often fails (no FK) and returns error
  // -> which previously caused empty lists ("No scans yet" + count 0).
  // Fix: 2-step fetch — attendance rows first, then profiles separately.
  const { data: attendance, error: attError } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, event_id, status')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attError || !attendance) {
    return (events as any[]).map((e: any) => ({
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      createdAt: e.created_at ?? null,
      startTime: e.start_time,
      endTime: e.end_time,
      attendeeCount: 0,
      presentCount: 0,
      lateCount: 0,
      attendees: [],
    }));
  }

  // Fetch student profiles in one query para makuha ang name/email
  // sama sa Image 2 (e.g. "jhonny321") bisag walay full_name.
  const studentIds = [...new Set((attendance as any[]).map((a: any) => a.student_id))];
  let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds);
    (profiles as any[] | null)?.forEach((p: any) => {
      profileMap[p.id] = { full_name: p.full_name ?? null, email: p.email ?? null };
    });
  }

  return (events as any[]).map((e: any) => {
    const rows = (attendance as any[]).filter(
      (a: any) => a.event_id === e.id
    );
    return {
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      createdAt: e.created_at ?? null,
      startTime: e.start_time,
      endTime: e.end_time,
      attendeeCount: rows.length,
      presentCount: rows.filter((r: any) => (r.status ?? 'present') === 'present').length,
      lateCount: rows.filter((r: any) => r.status === 'late').length,
      attendees: rows.map((a: any) => {
        const prof = profileMap[a.student_id];
        // Fallback chain: full_name -> email prefix (e.g. jhonny321) -> null
        // (UI will fallback pa to shortId if gihapon null)
        const studentName =
          prof?.full_name ??
          (typeof prof?.email === 'string' ? prof.email.split('@')[0] : null) ??
          null;
        return {
          studentId: a.student_id,
          studentName,
          scannedAt: a.scanned_at,
          status: (a.status ?? 'present') as 'present' | 'late',
        };
      }),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = (events as any[]).map((e: any) => e.id);
  if (eventIds.length === 0) return [];

  const { data: attRows, error: attError } = await supabase
    .from('attendance')
    .select('event_id, status')
    .in('event_id', eventIds);

  if (attError || !attRows) {
    return (events as any[]).map((e: any) => ({
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      attendeeCount: 0,
      presentCount: 0,
      lateCount: 0,
    }));
  }

  const counts: Record<string, number> = {};
  const present: Record<string, number> = {};
  const late: Record<string, number> = {};
  (attRows as any[]).forEach((r: any) => {
    counts[r.event_id] = (counts[r.event_id] ?? 0) + 1;
    if (r.status === 'late') late[r.event_id] = (late[r.event_id] ?? 0) + 1;
    else present[r.event_id] = (present[r.event_id] ?? 0) + 1;
  });

  return (events as any[]).map((e: any) => ({
    eventId: e.id,
    eventCode: e.event_code,
    title: e.title,
    attendeeCount: counts[e.id] ?? 0,
    presentCount: present[e.id] ?? 0,
    lateCount: late[e.id] ?? 0,
  }));
}

// ---- Admin queries (campus-wide, para sa dashboard) ----

export type AdminOverview = {
  totalEvents: number;
  totalScans: number;
  presentCount: number;
  lateCount: number;
  totalStudents: number;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const [{ count: totalEvents }, { count: totalScans }, { data: attRows }, { count: totalStudents }] =
    await Promise.all([
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('attendance').select('id', { count: 'exact', head: true }),
      supabase.from('attendance').select('status'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    ]);
  const rows = (attRows as any[] | null) ?? [];
  return {
    totalEvents: totalEvents ?? 0,
    totalScans: totalScans ?? 0,
    presentCount: rows.filter((r) => (r.status ?? 'present') === 'present').length,
    lateCount: rows.filter((r) => r.status === 'late').length,
    totalStudents: totalStudents ?? 0,
  };
}

export type EventTrend = {
  eventCode: string;
  title: string;
  attendeeCount: number;
  presentCount: number;
  lateCount: number;
};

export async function getAttendanceTrends(limit = 10): Promise<EventTrend[]> {
  const { data: events } = await supabase
    .from('events')
    .select('id, event_code, title')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!events || events.length === 0) return [];
  const ids = (events as any[]).map((e: any) => e.id);
  const { data: attRows } = await supabase
    .from('attendance')
    .select('event_id, status')
    .in('event_id', ids);
  const rows = (attRows as any[] | null) ?? [];
  return (events as any[]).map((e: any) => {
    const mine = rows.filter((r: any) => r.event_id === e.id);
    return {
      eventCode: e.event_code,
      title: e.title,
      attendeeCount: mine.length,
      presentCount: mine.filter((r: any) => (r.status ?? 'present') === 'present').length,
      lateCount: mine.filter((r: any) => r.status === 'late').length,
    };
  });
}

/** Admin correction: usbon ang status (present/late) sa usa ka attendance row. */
export async function correctAttendanceStatus(
  attendanceId: string,
  status: 'present' | 'late'
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('attendance')
    .update({ status })
    .eq('id', attendanceId);
  return { error: error?.message ?? null };
}

/** Admin correction: delete usa ka attendance record. */
export async function deleteAttendance(
  attendanceId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', attendanceId);
  return { error: error?.message ?? null };
}
