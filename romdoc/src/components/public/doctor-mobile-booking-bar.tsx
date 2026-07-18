type Props = {
  consultationPrice: number | null;
};

function formatPrice(
  value: number
) {
  return new Intl.NumberFormat(
    "ro-RO",
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    value
  );
}

export default function DoctorMobileBookingBar({
  consultationPrice,
}: Props) {
  return (
    <div
      role="region"
      aria-label="Acțiune rapidă pentru programare"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-[13px] pt-[8px] shadow-[0_-8px_21px_rgba(15,23,42,0.10)] backdrop-blur-md lg:hidden"
      style={{
        paddingBottom:
          "max(13px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-[13px]">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">
            Consultație
          </p>

          <p className="truncate text-sm font-bold text-gray-900 sm:text-base">
            {consultationPrice !==
            null
              ? `De la ${formatPrice(
                  consultationPrice
                )} RON`
              : "Tarif confirmat de clinică"}
          </p>
        </div>

        <a
          href="#programare"
          className="romdoc-button romdoc-button-primary romdoc-button-sm shrink-0"
          aria-label="Mergi la formularul de programare"
        >
          Programează-te
        </a>
      </div>
    </div>
  );
}
