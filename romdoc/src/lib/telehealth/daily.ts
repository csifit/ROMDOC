type DailyRoom = {
  name: string;
  url: string;
};

type DailyTokenResponse = {
  token: string;
};

function getDailyApiKey() {
  const value = process.env.DAILY_API_KEY?.trim();
  if (!value) throw new Error("DAILY_API_KEY is not configured.");
  return value;
}

async function dailyRequest<T>(path: string, init: RequestInit) {
  const response = await fetch(`https://api.daily.co/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getDailyApiKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | (T & { info?: string; error?: string })
    | null;

  if (!response.ok || !body) {
    throw new Error(
      body?.info ?? body?.error ?? `Daily request failed with status ${response.status}.`
    );
  }

  return body;
}

export async function createDailyRoom({
  appointmentId,
  expiresAt,
}: {
  appointmentId: string;
  expiresAt: Date;
}) {
  const roomName = `romdoc_${appointmentId.replaceAll("-", "")}`.slice(0, 64);

  return dailyRequest<DailyRoom>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        exp: Math.floor(expiresAt.getTime() / 1000),
        eject_at_room_exp: true,
        max_participants: 2,
        enable_prejoin_ui: true,
        enable_people_ui: false,
        enable_chat: false,
        enable_screenshare: false,
        enable_live_captions_ui: false,
        enable_transcription_storage: false,
        enforce_unique_user_ids: true,
      },
    }),
  });
}

export async function createDailyMeetingToken({
  roomName,
  profileId,
  displayName,
  expiresAt,
  closeTabOnExit,
}: {
  roomName: string;
  profileId: string;
  displayName: string;
  expiresAt: Date;
  closeTabOnExit: boolean;
}) {
  const tokenExpiry = Math.min(
    Math.floor(expiresAt.getTime() / 1000),
    Math.floor(Date.now() / 1000) + 60 * 60 * 3
  );

  const result = await dailyRequest<DailyTokenResponse>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: profileId,
        user_name: displayName.slice(0, 120),
        exp: tokenExpiry,
        eject_at_token_exp: true,
        is_owner: false,
        enable_prejoin_ui: true,
        enable_recording_ui: false,
        enable_live_captions_ui: false,
        close_tab_on_exit: closeTabOnExit,
        permissions: {
          hasPresence: true,
          canSend: ["video", "audio"],
          canReceive: { base: true },
          canAdmin: false,
        },
      },
    }),
  });

  return result.token;
}

export async function updateDailyRoomExpiry(roomName: string, expiresAt: Date) {
  return dailyRequest<DailyRoom>(`/rooms/${encodeURIComponent(roomName)}`, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        exp: Math.floor(expiresAt.getTime() / 1000),
        eject_at_room_exp: true,
      },
    }),
  });
}

export function roomExpiryForAppointmentDate(appointmentDate: string) {
  const [year, month, day] = appointmentDate.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid appointment date.");

  // Europe/Bucharest is UTC+2 or UTC+3. Building the local end-of-day through
  // Intl avoids assuming which offset applies on the appointment date.
  const targetLocal = new Date(Date.UTC(year, month - 1, day + 2, 0, 0, 0));
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  // Start from 21:59:59 UTC (EEST) and adjust until Bucharest displays the
  // requested next-day 23:59:59. The bounded search also covers EET/DST days.
  const desiredDate = new Date(Date.UTC(year, month - 1, day + 1));
  const desired = `${desiredDate.getUTCFullYear()}-${String(
    desiredDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(desiredDate.getUTCDate()).padStart(
    2,
    "0"
  )} 23:59:59`;
  for (let offsetHours = -6; offsetHours <= 6; offsetHours += 1) {
    const candidate = new Date(targetLocal.getTime() + offsetHours * 60 * 60 * 1000 - 1000);
    const parts = formatter.formatToParts(candidate);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    const rendered = `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
    if (rendered === desired) return candidate;
  }

  throw new Error("Could not resolve telehealth room expiry.");
}
