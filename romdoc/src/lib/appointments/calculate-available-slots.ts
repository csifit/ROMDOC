import type { SupabaseClient } from "@supabase/supabase-js";

export type AvailableAppointmentSlot = {
  time: string;
  durationMinutes: number;
};

export type AvailableAppointmentDate = {
  date: string;
  availableSlotCount: number;
  slots: AvailableAppointmentSlot[];
};

export type NextAvailableAppointment = {
  date: string;
  time: string;
  durationMinutes: number;
};

type AvailableSlotRpcRow = {
  slot_time: string;
  duration_minutes: number;
};

type GetAvailableSlotsInput = {
  doctorId: string;
  clinicId: string;
  date: string;
  durationMinutes?: number;
};

type GetAvailableDatesInput = {
  doctorId: string;
  clinicId: string;
  from: string;
  to: string;
  durationMinutes?: number;
};

type GetNextAvailableAppointmentInput = {
  doctorId: string;
  clinicId: string;
  from?: string;
  to?: string;
  searchDays?: number;
  batchSize?: number;
};

export const BOOKING_TIME_ZONE = "Europe/Bucharest";
export const BOOKING_WINDOW_DAYS = 90;
export const MAXIMUM_AVAILABILITY_RANGE_DAYS = 42;
export const HOMEPAGE_NEXT_SLOT_SEARCH_DAYS = 30;

/**
 * Public online bookings start two calendar days after today.
 *
 * Manual Doctor/Staff-created appointments do not use this limit.
 */
export const PUBLIC_BOOKING_MINIMUM_LEAD_DAYS = 2;

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

export function getDateStringInTimeZone(
  date: Date,
  timeZone = BOOKING_TIME_ZONE
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("The booking date could not be calculated.");
  }

  return `${year}-${month}-${day}`;
}

export function addDays(value: string, numberOfDays: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + numberOfDays);

  return date.toISOString().slice(0, 10);
}

export function getPublicMinimumBookingDate(referenceDate = new Date()) {
  const today = getDateStringInTimeZone(
    referenceDate,
    BOOKING_TIME_ZONE
  );

  return addDays(
    today,
    PUBLIC_BOOKING_MINIMUM_LEAD_DAYS
  );
}

export function getInclusiveDayCount(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);

  return Math.floor((end - start) / 86_400_000) + 1;
}

export function getDatesInRange(from: string, to: string) {
  const dates: string[] = [];
  let currentDate = from;

  while (currentDate <= to) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

function mapSlots(
  rows: AvailableSlotRpcRow[] | null
): AvailableAppointmentSlot[] {
  return (rows ?? []).map((row) => ({
    time: row.slot_time.slice(0, 5),
    durationMinutes: row.duration_minutes,
  }));
}

export async function getAvailableSlotsForDate(
  supabase: SupabaseClient,
  input: GetAvailableSlotsInput
): Promise<AvailableAppointmentSlot[]> {
  const { data, error } = await supabase.rpc(
    "get_available_appointment_slots",
    {
      target_doctor_id: input.doctorId,
      target_clinic_id: input.clinicId,
      target_date: input.date,
      ...(input.durationMinutes
        ? { target_duration_minutes: input.durationMinutes }
        : {}),
    }
  );

  if (error) {
    console.error(
      `Available slots RPC failed for ${input.date}:`,
      error
    );
    throw new Error("AVAILABLE_SLOTS_RPC_FAILED");
  }

  return mapSlots(
    (data as AvailableSlotRpcRow[] | null) ?? []
  );
}

export async function getAvailableDatesInRange(
  supabase: SupabaseClient,
  input: GetAvailableDatesInput
): Promise<AvailableAppointmentDate[]> {
  const dates = getDatesInRange(input.from, input.to);

  return Promise.all(
    dates.map(async (date) => {
      const slots = await getAvailableSlotsForDate(
        supabase,
        {
          doctorId: input.doctorId,
          clinicId: input.clinicId,
          date,
          durationMinutes: input.durationMinutes,
        }
      );

      return {
        date,
        availableSlotCount: slots.length,
        slots,
      };
    })
  );
}

export async function getNextAvailableAppointment(
  supabase: SupabaseClient,
  input: GetNextAvailableAppointmentInput
): Promise<NextAvailableAppointment | null> {
  const defaultFrom = getPublicMinimumBookingDate();
  const from = input.from ?? defaultFrom;
  const searchDays = Math.max(
    1,
    Math.min(
      input.searchDays ?? HOMEPAGE_NEXT_SLOT_SEARCH_DAYS,
      BOOKING_WINDOW_DAYS
    )
  );
  const to =
    input.to ??
    addDays(from, searchDays - 1);
  const batchSize = Math.max(
    1,
    Math.min(input.batchSize ?? 7, 14)
  );
  const dates = getDatesInRange(from, to);

  for (
    let startIndex = 0;
    startIndex < dates.length;
    startIndex += batchSize
  ) {
    const batchDates = dates.slice(
      startIndex,
      startIndex + batchSize
    );

    const batchResults = await Promise.all(
      batchDates.map(async (date) => ({
        date,
        slots: await getAvailableSlotsForDate(
          supabase,
          {
            doctorId: input.doctorId,
            clinicId: input.clinicId,
            date,
          }
        ),
      }))
    );

    const firstAvailableDate = batchResults.find(
      (item) => item.slots.length > 0
    );

    if (firstAvailableDate) {
      const firstSlot = firstAvailableDate.slots[0];

      return {
        date: firstAvailableDate.date,
        time: firstSlot.time,
        durationMinutes: firstSlot.durationMinutes,
      };
    }
  }

  return null;
}
