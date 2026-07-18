import {
  getAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/appointments/appointment-status";

type AppointmentStatusBadgeProps = {
  status:
    | AppointmentStatus
    | string;
  locale?: "ro" | "en";
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
        {locale ===
        "en"
          ? definition.labelEn
          : definition.labelRo}
      </span>
    </span>
  );
}
