export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

export function buildQRPayload(
  event: {
    eventId: string;
    title?: string;
    start?: string;
    end?: string;
  },
  opts?: { compact?: boolean }
): string {
  // Compact = default: {v:1, event} lang (~25 chars) para dali ma-scan.
  // Mas mubo = mas dagko ang QR modules = mas paspas basahon sa camera,
  // bisag layo, ngitngit, o barato ang phone.
  // Ang title/start/end naa naman sa cloud (events table) —
  // ang scanner mag-lookup via getEventByCode, dili na kinahanglan sa QR.
  const compact = opts?.compact ?? true;
  if (compact) {
    return JSON.stringify({ v: 1, event: event.eventId.trim() });
  }

  const payload: QRPayload = {
    v: 1,
    event: event.eventId,
  };

  if (event.title) payload.title = event.title;
  if (event.start) payload.start = event.start;
  if (event.end) payload.end = event.end;

  return JSON.stringify(payload);
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
