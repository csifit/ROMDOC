export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentStatusDefinition = {
  labelRo: string;
  labelEn: string;
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
      labelRo:
        "În așteptare",
      labelEn:
        "Pending",
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
      labelRo:
        "Confirmată",
      labelEn:
        "Confirmed",
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
      labelRo:
        "Reprogramată",
      labelEn:
        "Rescheduled",
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
      labelRo:
        "Finalizată",
      labelEn:
        "Completed",
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
      labelRo:
        "Anulată",
      labelEn:
        "Cancelled",
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
      labelRo:
        "Neprezentare",
      labelEn:
        "No-show",
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
    | "ro"
    | "en" =
    "ro"
) {
  const status =
    getAppointmentStatus(
      value
    );

  return locale ===
    "en"
    ? status.labelEn
    : status.labelRo;
}
