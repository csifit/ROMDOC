import {getLocale} from "next-intl/server";

import {
  normalizeAppLocale,
  selectTranslation,
  type AppLocale,
} from "@/lib/i18n/app-locale";
import {createClient} from "@/lib/supabase/server";

type ServiceTranslation = {
  locale: string;
  name: string;
};

type PublicDoctorServiceRow = {
  id: string;
  price: number | string;
  currency: string;
  sort_order: number;
  doctor_service_translations: ServiceTranslation[] | null;
};

type Props = {
  doctorId: string;
  locale?: AppLocale;
};

const copy = {
  ro: {
    title: "Servicii și prețuri",
    description: "Prețurile pot varia în funcție de complexitatea consultației sau procedurii.",
    service: "Serviciu",
    price: "Preț",
    fallback: "Serviciu medical",
  },
  en: {
    title: "Services and prices",
    description: "Prices may vary depending on the complexity of the consultation or procedure.",
    service: "Service",
    price: "Price",
    fallback: "Medical service",
  },
  de: {
    title: "Leistungen und Preise",
    description: "Die Preise können je nach Komplexität der Konsultation oder Behandlung variieren.",
    service: "Leistung",
    price: "Preis",
    fallback: "Medizinische Leistung",
  },
} as const;

function formatPrice(
  price: number,
  currency: string,
  locale: AppLocale
) {
  const intlLocale =
    locale === "ro"
      ? "ro-RO"
      : locale === "de"
        ? "de-DE"
        : "en-US";

  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export default async function PublicDoctorServices({
  doctorId,
  locale: localeProp,
}: Props) {
  const locale =
    localeProp ??
    normalizeAppLocale(await getLocale());
  const t = copy[locale];
  const supabase = await createClient();

  const {data, error} = await supabase
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
    .order("sort_order", {ascending: true})
    .order("created_at", {ascending: true});

  if (error) {
    console.error(
      "Public doctor services query failed:",
      error
    );
    return null;
  }

  const services =
    (data as unknown as PublicDoctorServiceRow[] | null) ?? [];

  if (services.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">
        {t.title}
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        {t.description}
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
        <div className="grid grid-cols-[1fr_auto] gap-4 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span>{t.service}</span>
          <span>{t.price}</span>
        </div>

        <div className="divide-y divide-gray-200">
          {services.map((service) => {
            const name =
              selectTranslation(
                service.doctor_service_translations,
                locale
              )?.name ?? t.fallback;

            return (
              <div
                key={service.id}
                className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4"
              >
                <span className="font-medium text-gray-900">
                  {name}
                </span>
                <span className="whitespace-nowrap font-semibold text-gray-900">
                  {formatPrice(
                    Number(service.price),
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
