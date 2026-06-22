type VerifiedDoctorBadgeProps = {
  compact?: boolean;
  className?: string;
};

function VerifiedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 19 6v5c0 4.6-2.7 8-7 10-4.3-2-7-5.4-7-10V6l7-3Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 12 2 2 4-4"
      />
    </svg>
  );
}

export default function VerifiedDoctorBadge({
  compact = false,
  className = "",
}: VerifiedDoctorBadgeProps) {
  return (
    <span
      title="RomDoc a verificat informațiile profesionale și documentele transmise de acest medic. RomDoc nu emite licențe medicale."
      aria-label="Medic verificat de RomDoc"
      className={`inline-flex items-center gap-1.5 rounded-full bg-[#036661]/10 font-semibold text-[#036661] ${
        compact
          ? "px-2.5 py-1 text-xs"
          : "px-3 py-1.5 text-sm"
      } ${className}`.trim()}
    >
      <VerifiedIcon />
      Medic verificat de RomDoc
    </span>
  );
}
