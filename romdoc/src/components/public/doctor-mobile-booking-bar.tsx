type Props = {
  consultationPrice: number | null;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function DoctorMobileBookingBar({
  consultationPrice,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500">
            Consultație
          </p>
          <p className="font-bold text-gray-900">
            {consultationPrice !== null
              ? `De la ${formatPrice(consultationPrice)} RON`
              : "Tarif la clinică"}
          </p>
        </div>

        <a
          href="#programare"
          className="romdoc-button romdoc-button-primary shrink-0"
        >
          Programează-te
        </a>
      </div>
    </div>
  );
}
