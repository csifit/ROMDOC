export const RECENTLY_VIEWED_DOCTORS_STORAGE_KEY =
  "romdoc-recently-viewed-doctors";

export const RECENTLY_VIEWED_DOCTORS_EVENT =
  "romdoc:recently-viewed-doctors-changed";

export const MAX_RECENTLY_VIEWED_DOCTORS =
  6;

export type RecentlyViewedDoctor = {
  id: string;
  slug: string;
  name: string;
  title: string;
  specialtyName: string;
  clinicName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  viewedAt: string;
};

function isRecentlyViewedDoctor(
  value: unknown
): value is RecentlyViewedDoctor {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const doctor =
    value as Partial<RecentlyViewedDoctor>;

  return (
    typeof doctor.id === "string" &&
    typeof doctor.slug === "string" &&
    typeof doctor.name === "string" &&
    typeof doctor.title === "string" &&
    typeof doctor.specialtyName === "string" &&
    (
      doctor.clinicName === null ||
      typeof doctor.clinicName === "string"
    ) &&
    (
      doctor.photoUrl === null ||
      typeof doctor.photoUrl === "string"
    ) &&
    typeof doctor.isVerified === "boolean" &&
    typeof doctor.viewedAt === "string"
  );
}

export function readRecentlyViewedDoctors() {
  if (
    typeof window === "undefined"
  ) {
    return [] as RecentlyViewedDoctor[];
  }

  try {
    const rawValue =
      window.localStorage.getItem(
        RECENTLY_VIEWED_DOCTORS_STORAGE_KEY
      );

    if (!rawValue) {
      return [];
    }

    const parsed =
      JSON.parse(rawValue) as unknown;

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed
      .filter(
        isRecentlyViewedDoctor
      )
      .slice(
        0,
        MAX_RECENTLY_VIEWED_DOCTORS
      );
  } catch (error) {
    console.error(
      "Recently viewed doctors could not be read:",
      error
    );

    return [];
  }
}

function writeRecentlyViewedDoctors(
  doctors: RecentlyViewedDoctor[]
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      RECENTLY_VIEWED_DOCTORS_STORAGE_KEY,
      JSON.stringify(
        doctors.slice(
          0,
          MAX_RECENTLY_VIEWED_DOCTORS
        )
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        RECENTLY_VIEWED_DOCTORS_EVENT
      )
    );
  } catch (error) {
    console.error(
      "Recently viewed doctors could not be saved:",
      error
    );
  }
}

export function addRecentlyViewedDoctor(
  doctor: Omit<
    RecentlyViewedDoctor,
    "viewedAt"
  >
) {
  const current =
    readRecentlyViewedDoctors();

  const nextDoctor:
    RecentlyViewedDoctor = {
      ...doctor,
      viewedAt:
        new Date().toISOString(),
    };

  const next = [
    nextDoctor,
    ...current.filter(
      (item) =>
        item.id !== doctor.id
    ),
  ];

  writeRecentlyViewedDoctors(
    next
  );
}

export function clearRecentlyViewedDoctors() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      RECENTLY_VIEWED_DOCTORS_STORAGE_KEY
    );

    window.dispatchEvent(
      new CustomEvent(
        RECENTLY_VIEWED_DOCTORS_EVENT
      )
    );
  } catch (error) {
    console.error(
      "Recently viewed doctors could not be cleared:",
      error
    );
  }
}
