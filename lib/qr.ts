export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
  /** Smart QR token — kinahanglan mu-match sa events.qr_token sa DB. */
  t?: string;
  /** Expiry timestamp (ISO) — para sa time-limited QR. */
  exp?: string;
};

export function buildQRPayload(
  event: {
    eventId: string;
    title?: string;
    start?: string;
    end?: string;
    token?: string | null;
    expiresAt?: string | null;
  },
  opts?: { compact?: boolean }
): string {
  // Compact = default: {v:1, event} lang (~25 chars) para dali ma-scan.
  // Mas mubo = mas dagko ang QR modules = mas paspas basahon sa camera,
  // bisag layo, ngitngit, o barato ang phone.
  // Ang title/start/end naa naman sa cloud (events table) —
  // ang scanner mag-lookup via getEventByCode, dili na kinahanglan sa QR.
  const compact = opts?.compact ?? true;
  if (compact && !event.token) {
    return JSON.stringify({ v: 1, event: event.eventId.trim() });
  }

  // Smart QR: event + token + expiry para rotating/time-limited/anti-reuse.
  const payload: QRPayload = {
    v: 1,
    event: event.eventId.trim(),
  };
  if (!compact && event.title) payload.title = event.title;
  if (!compact && event.start) payload.start = event.start;
  if (!compact && event.end) payload.end = event.end;
  if (event.token) payload.t = event.token;
  if (event.expiresAt) payload.exp = event.expiresAt;
  return JSON.stringify(payload);
}

/** Smart QR builder — para sa rotating/time-limited QR sa teacher screen. */
export function buildSmartQRPayload(
  eventCode: string,
  token: string,
  expiresAt: string
): string {
  return JSON.stringify({
    v: 1,
    event: eventCode.trim(),
    t: token,
    exp: expiresAt,
  });
}

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function parseQRPayload(raw: string): ParseQRResult {
  const text = raw.trim();
  if (!text) {
    return { ok: false, message: 'Invalid QR code.' };
  }

  // 1) Try JSON v:1 format (bag-o nga compact o daan nga full — parehong dawaton)
  try {
    const parsed: any = JSON.parse(text);
    if (
      parsed &&
      parsed.v === 1 &&
      typeof parsed.event === 'string' &&
      parsed.event.trim()
    ) {
      parsed.event = parsed.event.trim();
      return { ok: true, payload: parsed as QRPayload };
    }
  } catch {
    // Dili JSON — basin bare event code (tan-awa sa ubos)
  }

  // 2) Fallback: bare event code mismo ang sulod sa QR, e.g. "EVT-2026-0001".
  // Kini ang pinakadali ma-scan nga format (pinakamubo).
  if (/^[A-Za-z0-9][A-Za-z0-9-_]{1,63}$/.test(text)) {
    return { ok: true, payload: { v: 1, event: text } };
  }

  // 3) Kung JSON pero sayop ang version / walay event
  if (text.startsWith('{')) {
    return { ok: false, message: 'Not an attendance QR code.' };
  }

  return { ok: false, message: 'Invalid QR code.' };
}

/** Para sa defense: 5 ka events nga klaro ma-explain (Event -> Handler -> Action -> Result). */
export const DEMO_EVENTS = [
  'User presses Login -> signIn -> session set -> tabs open',
  'QR Scanner detects QR -> parseQRPayload -> validate token/expiry -> attendance insert',
  'Teacher rotates QR -> rotateQrToken -> new token/expiry -> old screenshot rejected',
  'Duplicate scan -> unique constraint 23505 -> "Already registered" message',
  'Teacher closes event -> status=closed -> scans blocked with "Event is closed"',
  'Late scan -> start+grace compare -> status=late saved + "Late" confirmation',
] as const;
