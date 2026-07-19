"use client";

export const BOOKING_DRAFT_STORAGE_KEY =
  "romdoc.booking-draft.v1";

const BOOKING_DRAFT_MAX_AGE_MS =
  2 * 60 * 60 * 1000;

export type BookingDraft = {
  version: 1;
  doctorId: string;
  doctorSlug: string;
  clinicId: string;
  requestedDate: string;
  requestedTime: string;
  durationMinutes: number;
  createdAt: number;
};

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidDraft(
  value: unknown
): value is BookingDraft {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const draft =
    value as Partial<BookingDraft>;

  return (
    draft.version === 1 &&
    isNonEmptyString(draft.doctorId) &&
    isNonEmptyString(draft.doctorSlug) &&
    isNonEmptyString(draft.clinicId) &&
    isNonEmptyString(draft.requestedDate) &&
    isNonEmptyString(draft.requestedTime) &&
    typeof draft.durationMinutes === "number" &&
    Number.isFinite(draft.durationMinutes) &&
    draft.durationMinutes > 0 &&
    typeof draft.createdAt === "number" &&
    Number.isFinite(draft.createdAt)
  );
}

function removeLegacySessionDraft() {
  window.sessionStorage.removeItem(
    BOOKING_DRAFT_STORAGE_KEY
  );
}

export function saveBookingDraft(
  draft: Omit<
    BookingDraft,
    "version" | "createdAt"
  >
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const value: BookingDraft = {
    version: 1,
    ...draft,
    createdAt: Date.now(),
  };

  window.localStorage.setItem(
    BOOKING_DRAFT_STORAGE_KEY,
    JSON.stringify(value)
  );

  removeLegacySessionDraft();
}

export function readBookingDraft(
  doctorId: string,
  doctorSlug: string
): BookingDraft | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const raw =
    window.localStorage.getItem(
      BOOKING_DRAFT_STORAGE_KEY
    ) ??
    window.sessionStorage.getItem(
      BOOKING_DRAFT_STORAGE_KEY
    );

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown =
      JSON.parse(raw);

    if (!isValidDraft(parsed)) {
      clearBookingDraft();
      return null;
    }

    const expired =
      Date.now() -
        parsed.createdAt >
      BOOKING_DRAFT_MAX_AGE_MS;

    const belongsToDoctor =
      parsed.doctorId === doctorId &&
      parsed.doctorSlug === doctorSlug;

    if (
      expired ||
      !belongsToDoctor
    ) {
      clearBookingDraft();
      return null;
    }

    window.localStorage.setItem(
      BOOKING_DRAFT_STORAGE_KEY,
      JSON.stringify(parsed)
    );

    removeLegacySessionDraft();

    return parsed;
  } catch {
    clearBookingDraft();
    return null;
  }
}

export function clearBookingDraft() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.removeItem(
    BOOKING_DRAFT_STORAGE_KEY
  );

  removeLegacySessionDraft();
}
