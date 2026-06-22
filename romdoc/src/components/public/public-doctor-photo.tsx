type PublicDoctorPhotoProps = {
  photoUrl: string | null;
  doctorName: string;
  size?: "small" | "medium" | "large";
  className?: string;
};

const sizeClasses = {
  small: "h-16 w-16 text-xl rounded-xl",
  medium: "h-24 w-24 text-2xl rounded-2xl",
  large: "h-32 w-32 text-4xl rounded-2xl",
};

export default function PublicDoctorPhoto({
  photoUrl,
  doctorName,
  size = "medium",
  className = "",
}: PublicDoctorPhotoProps) {
  const initial =
    doctorName.trim().charAt(0).toLocaleUpperCase("ro-RO") || "M";

  return (
    <div
      className={`shrink-0 overflow-hidden border border-gray-200 bg-[#F0EEE9] ${sizeClasses[size]} ${className}`.trim()}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`Fotografie de profil pentru ${doctorName}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-label={`Fotografie indisponibilă pentru ${doctorName}`}
          className="flex h-full w-full items-center justify-center font-bold text-[#036661]"
        >
          {initial}
        </div>
      )}
    </div>
  );
}
