type RatingStarsProps = {
  rating: number;
  maximum?: number;
  size?: "small" | "medium" | "large";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  label?: string;
  starUnitLabel?: string;
};

function StarIcon({
  filled,
  className,
}: {
  filled: boolean;
  className: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3.5 2.65 5.37 5.93.86-4.29 4.18 1.01 5.91L12 17.03l-5.3 2.79 1.01-5.91-4.29-4.18 5.93-.86L12 3.5Z" />
    </svg>
  );
}

export default function RatingStars({
  rating,
  maximum = 5,
  size = "medium",
  interactive = false,
  onChange,
  label,
  starUnitLabel = "stele",
}: RatingStarsProps) {
  const sizeClass =
    size === "small"
      ? "h-4 w-4"
      : size === "large"
        ? "h-7 w-7"
        : "h-5 w-5";

  return (
    <div
      className="inline-flex items-center gap-1"
      aria-label={
        label ??
        `${rating} din ${maximum} ${starUnitLabel}`
      }
    >
      {Array.from(
        {
          length: maximum,
        },
        (_, index) => {
          const value =
            index + 1;

          const filled =
            value <= rating;

          if (interactive) {
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onChange?.(value)
                }
                aria-label={`${value} ${starUnitLabel}`}
                className="rounded p-0.5 text-[#036661] transition hover:scale-110 hover:text-[#ff2800] focus:outline-none focus:ring-2 focus:ring-[#036661]/30"
              >
                <StarIcon
                  filled={filled}
                  className={sizeClass}
                />
              </button>
            );
          }

          return (
            <span
              key={value}
              className={
                filled
                  ? "text-[#036661]"
                  : "text-gray-300"
              }
            >
              <StarIcon
                filled={filled}
                className={sizeClass}
              />
            </span>
          );
        }
      )}
    </div>
  );
}
