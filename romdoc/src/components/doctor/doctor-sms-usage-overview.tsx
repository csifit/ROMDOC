import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type SmsUsageOverviewCopy = {
  eyebrow: string;
  title: string;
  description: string;
  currentMonth: string;
  previousMonth: string;
  currentBadge: string;
  previousBadge: string;
  sent: string;
  delivered: string;
  failed: string;
  skipped: string;
  confirmations: string;
  reminders: string;
  deliveryNote: string;
  noActivity: string;
};

const COPY: Record<
  AppLocale,
  SmsUsageOverviewCopy
> = {
  ro: {
    eyebrow: "SMS",
    title: "Utilizare SMS",
    description:
      "Rezumat operațional al notificărilor SMS trimise pentru programările tale. Aceste date sunt informative și nu reprezintă costuri sau facturare.",
    currentMonth: "Luna curentă",
    previousMonth: "Luna precedentă",
    currentBadge: "În desfășurare",
    previousBadge: "Istoric",
    sent: "Trimise",
    delivered: "Livrate",
    failed: "Eșuate",
    skipped: "Omise",
    confirmations: "Confirmări",
    reminders: "Reamintiri 24h",
    deliveryNote:
      "Numărul de SMS livrate se bazează pe rapoartele de livrare primite de la furnizor și poate fi mai mic decât numărul de SMS trimise.",
    noActivity:
      "Nu există activitate SMS în această perioadă.",
  },
  en: {
    eyebrow: "SMS",
    title: "SMS usage",
    description:
      "Operational summary of SMS notifications sent for your appointments. These figures are informational and do not represent costs or billing.",
    currentMonth: "Current month",
    previousMonth: "Previous month",
    currentBadge: "In progress",
    previousBadge: "History",
    sent: "Sent",
    delivered: "Delivered",
    failed: "Failed",
    skipped: "Skipped",
    confirmations: "Confirmations",
    reminders: "24h reminders",
    deliveryNote:
      "Delivered SMS counts are based on delivery reports received from the provider and can be lower than the number sent.",
    noActivity:
      "There is no SMS activity in this period.",
  },
  de: {
    eyebrow: "SMS",
    title: "SMS-Nutzung",
    description:
      "Operative Übersicht der SMS-Benachrichtigungen für deine Termine. Diese Angaben dienen nur zur Information und stellen keine Kosten oder Abrechnung dar.",
    currentMonth: "Aktueller Monat",
    previousMonth: "Vorheriger Monat",
    currentBadge: "Laufend",
    previousBadge: "Verlauf",
    sent: "Gesendet",
    delivered: "Zugestellt",
    failed: "Fehlgeschlagen",
    skipped: "Übersprungen",
    confirmations: "Bestätigungen",
    reminders: "24h-Erinnerungen",
    deliveryNote:
      "Die Zahl der zugestellten SMS basiert auf den vom Anbieter empfangenen Zustellberichten und kann niedriger sein als die Zahl der gesendeten SMS.",
    noActivity:
      "In diesem Zeitraum gibt es keine SMS-Aktivität.",
  },
};

type SmsMonthOverview = {
  label: string;
  sent: number;
  delivered: number;
  failed: number;
  skipped: number;
  confirmations: number;
  reminders: number;
};

type DoctorSmsUsageOverviewProps = {
  locale: AppLocale;
  current: SmsMonthOverview;
  previous: SmsMonthOverview;
};

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[13px] bg-gray-50 p-[13px]">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-[8px] text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function MonthCard({
  title,
  badge,
  data,
  copy,
}: {
  title: string;
  badge: string;
  data: SmsMonthOverview;
  copy: SmsUsageOverviewCopy;
}) {
  const hasActivity =
    data.sent > 0 ||
    data.delivered > 0 ||
    data.failed > 0 ||
    data.skipped > 0;

  return (
    <article className="rounded-[21px] border border-gray-200 p-[21px]">
      <div className="flex flex-wrap items-start justify-between gap-[13px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </p>

          <h3 className="mt-[5px] text-lg font-bold capitalize text-gray-900">
            {data.label}
          </h3>
        </div>

        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-[13px] py-[5px] text-xs font-semibold text-gray-700">
          {badge}
        </span>
      </div>

      {hasActivity ? (
        <div className="mt-[21px] grid gap-[13px] sm:grid-cols-2 xl:grid-cols-3">
          <MiniStat
            label={copy.sent}
            value={data.sent}
          />
          <MiniStat
            label={copy.delivered}
            value={data.delivered}
          />
          <MiniStat
            label={copy.failed}
            value={data.failed}
          />
          <MiniStat
            label={copy.skipped}
            value={data.skipped}
          />
          <MiniStat
            label={copy.confirmations}
            value={data.confirmations}
          />
          <MiniStat
            label={copy.reminders}
            value={data.reminders}
          />
        </div>
      ) : (
        <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm text-gray-600">
          {copy.noActivity}
        </div>
      )}
    </article>
  );
}

export default function DoctorSmsUsageOverview({
  locale,
  current,
  previous,
}: DoctorSmsUsageOverviewProps) {
  const copy = COPY[locale];

  return (
    <section className="mt-[34px] rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          {copy.eyebrow}
        </p>

        <h2 className="mt-[8px] text-xl font-bold text-gray-900">
          {copy.title}
        </h2>

        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.description}
        </p>
      </div>

      <div className="mt-[21px] grid gap-[21px] xl:grid-cols-2">
        <MonthCard
          title={copy.currentMonth}
          badge={copy.currentBadge}
          data={current}
          copy={copy}
        />

        <MonthCard
          title={copy.previousMonth}
          badge={copy.previousBadge}
          data={previous}
          copy={copy}
        />
      </div>

      <p className="mt-[13px] text-xs leading-5 text-gray-500">
        {copy.deliveryNote}
      </p>
    </section>
  );
}
