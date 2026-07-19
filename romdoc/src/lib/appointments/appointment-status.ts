import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentStatusDefinition = {
  labels: Record<
    AppLocale,
    string
  >;
  labelRo: string;
  labelEn: string;
  labelDe: string;
  badgeClassName: string;
  dotClassName: string;
  calendarBackground: string;
  calendarBorder: string;
  calendarText: string;
};

export const APPOINTMENT_STATUS_ORDER:
  AppointmentStatus[] = [
    "pending",
    "confirmed",
    "rescheduled",
    "completed",
    "cancelled",
    "no_show",
  ];

export const APPOINTMENT_STATUS:
  Record<
    AppointmentStatus,
    AppointmentStatusDefinition
  > = {
    pending: {
      labels: {
        ro: "În așteptare",
        en: "Pending",
        de: "Ausstehend",
      },
      labelRo:
        "În așteptare",
      labelEn:
        "Pending",
      labelDe:
        "Ausstehend",
      badgeClassName:
        "romdoc-status-pending",
      dotClassName:
        "bg-amber-500",
      calendarBackground:
        "#F59E0B",
      calendarBorder:
        "#D97706",
      calendarText:
        "#111827",
    },

    confirmed: {
      labels: {
        ro: "Confirmată",
        en: "Confirmed",
        de: "Bestätigt",
      },
      labelRo:
        "Confirmată",
      labelEn:
        "Confirmed",
      labelDe:
        "Bestätigt",
      badgeClassName:
        "romdoc-status-confirmed",
      dotClassName:
        "bg-green-600",
      calendarBackground:
        "#16A34A",
      calendarBorder:
        "#15803D",
      calendarText:
        "#FFFFFF",
    },

    rescheduled: {
      labels: {
        ro: "Reprogramată",
        en: "Rescheduled",
        de: "Verschoben",
      },
      labelRo:
        "Reprogramată",
      labelEn:
        "Rescheduled",
      labelDe:
        "Verschoben",
      badgeClassName:
        "romdoc-status-rescheduled",
      dotClassName:
        "bg-blue-600",
      calendarBackground:
        "#2563EB",
      calendarBorder:
        "#1D4ED8",
      calendarText:
        "#FFFFFF",
    },

    completed: {
      labels: {
        ro: "Finalizată",
        en: "Completed",
        de: "Abgeschlossen",
      },
      labelRo:
        "Finalizată",
      labelEn:
        "Completed",
      labelDe:
        "Abgeschlossen",
      badgeClassName:
        "romdoc-status-completed",
      dotClassName:
        "bg-gray-500",
      calendarBackground:
        "#6B7280",
      calendarBorder:
        "#4B5563",
      calendarText:
        "#FFFFFF",
    },

    cancelled: {
      labels: {
        ro: "Anulată",
        en: "Cancelled",
        de: "Storniert",
      },
      labelRo:
        "Anulată",
      labelEn:
        "Cancelled",
      labelDe:
        "Storniert",
      badgeClassName:
        "romdoc-status-cancelled",
      dotClassName:
        "bg-red-600",
      calendarBackground:
        "#DC2626",
      calendarBorder:
        "#B91C1C",
      calendarText:
        "#FFFFFF",
    },

    no_show: {
      labels: {
        ro: "Neprezentare",
        en: "No-show",
        de: "Nicht erschienen",
      },
      labelRo:
        "Neprezentare",
      labelEn:
        "No-show",
      labelDe:
        "Nicht erschienen",
      badgeClassName:
        "romdoc-status-no-show",
      dotClassName:
        "bg-orange-700",
      calendarBackground:
        "#C2410C",
      calendarBorder:
        "#9A3412",
      calendarText:
        "#FFFFFF",
    },
  };

export function isAppointmentStatus(
  value: string
): value is AppointmentStatus {
  return (
    value in
    APPOINTMENT_STATUS
  );
}

export function getAppointmentStatus(
  value: string
): AppointmentStatusDefinition {
  if (
    isAppointmentStatus(
      value
    )
  ) {
    return APPOINTMENT_STATUS[
      value
    ];
  }

  return APPOINTMENT_STATUS.pending;
}

export function getAppointmentStatusLabel(
  value: string,
  locale:
    AppLocale = "ro"
) {
  return getAppointmentStatus(
    value
  ).labels[locale];
}
