import {
  getAppointmentStatus,
  getAppointmentStatusLabel,
  type AppointmentStatus,
} from "@/lib/appointments/appointment-status";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type AppointmentStatusBadgeProps = {
  status:
    | AppointmentStatus
    | string;
  locale?: AppLocale;
  showDot?: boolean;
  className?: string;
};

function joinClasses(
  ...classes: Array<
    string | false | null | undefined
  >
) {
  return classes
    .filter(Boolean)
    .join(" ");
}

export default function AppointmentStatusBadge({
  status,
  locale = "ro",
  showDot = true,
  className,
}: AppointmentStatusBadgeProps) {
  const definition =
    getAppointmentStatus(
      status
    );

  return (
    <span
      className={joinClasses(
        "romdoc-status",
        definition.badgeClassName,
        className
      )}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className="romdoc-status-dot"
        />
      )}

      <span>
        {getAppointmentStatusLabel(
          status,
          locale
        )}
      </span>
    </span>
  );
}
