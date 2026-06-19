import { createClient } from "@/lib/supabase/server";

type ServiceTranslation = {
  locale: string;
  name: string;
};

type PublicDoctorServiceRow = {
  id: string;
  price: number | string;
  currency: string;
  sort_order: number;

  doctor_service_translations:
    | ServiceTranslation[]
    | null;
};

type PublicDoctorServicesProps = {
  doctorId: string;
  locale?: "ro" | "en";
};

function getServiceName(
  translations:
    | ServiceTranslation[]
    | null,
  locale: "ro" | "en"
) {
  const requestedTranslation =
    translations?.find(
      (translation) =>
        translation.locale === locale
    );

  const romanianTranslation =
    translations?.find(
      (translation) =>
        translation.locale === "ro"
    );

  const fallbackTranslation =
    translations?.[0];

  return (
    requestedTranslation?.name ??
    romanianTranslation?.name ??
    fallbackTranslation?.name ??
    "Serviciu medical"
  );
}

function formatPrice(
  price: number,
  currency: string,
  locale: "ro" | "en"
) {
  return new Intl.NumberFormat(
    locale === "ro"
      ? "ro-RO"
      : "en-US",
    {
      style: "currency",
      currency,
      minimumFractionDigits:
        price % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }
  ).format(price);
}

export default async function PublicDoctorServices({
  doctorId,
  locale = "ro",
}: PublicDoctorServicesProps) {
  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("doctor_services")
    .select(`
      id,
      price,
      currency,
      sort_order,
      doctor_service_translations (
        locale,
        name
      )
    `)
    .eq("doctor_id", doctorId)
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Public doctor services query failed:",
      error
    );

    return null;
  }

  const services =
    (data as unknown as
      | PublicDoctorServiceRow[]
      | null) ?? [];

  if (services.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">
        {locale === "ro"
          ? "Servicii și prețuri"
          : "Services and prices"}
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        {locale === "ro"
          ? "Prețurile pot varia în funcție de complexitatea consultației sau procedurii."
          : "Prices may vary depending on the complexity of the consultation or procedure."}
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
        <div className="grid grid-cols-[1fr_auto] gap-4 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span>
            {locale === "ro"
              ? "Serviciu"
              : "Service"}
          </span>

          <span>
            {locale === "ro"
              ? "Preț"
              : "Price"}
          </span>
        </div>

        <div className="divide-y divide-gray-200">
          {services.map((service) => {
            const price =
              Number(service.price);

            return (
              <div
                key={service.id}
                className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4"
              >
                <span className="font-medium text-gray-900">
                  {getServiceName(
                    service.doctor_service_translations,
                    locale
                  )}
                </span>

                <span className="whitespace-nowrap font-semibold text-gray-900">
                  {formatPrice(
                    price,
                    service.currency,
                    locale
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}