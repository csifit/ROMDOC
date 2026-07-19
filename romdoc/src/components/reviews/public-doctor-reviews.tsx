import RatingStars from "@/components/reviews/rating-stars";
import type {AppLocale} from "@/lib/i18n/app-locale";

export type PublicDoctorReview = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  verified_appointment: boolean;
};

type Props = {
  reviews: PublicDoctorReview[];
  locale: AppLocale;
};

const copy = {
  ro: {
    title: "Recenzii ale pacienților",
    empty: "Acest medic nu are încă recenzii publicate.",
    eyebrow: "Experiențele pacienților",
    reviews: "Recenzii",
    privacy: "Identitatea pacienților nu este afișată public. Eticheta „Programare verificată” confirmă doar existența unei programări finalizate prin RomDoc.",
    verified: "Programare verificată",
    verifiedTitle: "Recenzia este asociată unei programări finalizate prin RomDoc.",
    average: "Evaluare medie {rating} din 5",
    singular: "recenzie",
    plural: "recenzii",
    anonymous: "Pacient anonim",
  },
  en: {
    title: "Patient reviews",
    empty: "This doctor does not have any published reviews yet.",
    eyebrow: "Patient experiences",
    reviews: "Reviews",
    privacy: "Patient identities are not displayed publicly. The “Verified appointment” label only confirms that a completed appointment exists in RomDoc.",
    verified: "Verified appointment",
    verifiedTitle: "The review is associated with an appointment completed through RomDoc.",
    average: "Average rating {rating} out of 5",
    singular: "review",
    plural: "reviews",
    anonymous: "Anonymous patient",
  },
  de: {
    title: "Patientenbewertungen",
    empty: "Für diesen Arzt wurden noch keine Bewertungen veröffentlicht.",
    eyebrow: "Erfahrungen von Patienten",
    reviews: "Bewertungen",
    privacy: "Die Identität der Patienten wird nicht öffentlich angezeigt. Die Kennzeichnung „Verifizierter Termin“ bestätigt lediglich einen über RomDoc abgeschlossenen Termin.",
    verified: "Verifizierter Termin",
    verifiedTitle: "Die Bewertung ist einem über RomDoc abgeschlossenen Termin zugeordnet.",
    average: "Durchschnittliche Bewertung {rating} von 5",
    singular: "Bewertung",
    plural: "Bewertungen",
    anonymous: "Anonymer Patient",
  },
} as const;

function formatDate(value: string, locale: AppLocale) {
  const intlLocale =
    locale === "ro"
      ? "ro-RO"
      : locale === "de"
        ? "de-DE"
        : "en-US";

  return new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function VerifiedAppointmentBadge({
  locale,
}: {
  locale: AppLocale;
}) {
  const t = copy[locale];

  return (
    <span
      title={t.verifiedTitle}
      className="inline-flex min-h-[34px] items-center gap-[5px] rounded-full border border-emerald-200 bg-emerald-50 px-[13px] py-[5px] text-xs font-semibold text-emerald-800"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="h-[13px] w-[13px]"
      >
        <path
          d="m5.5 10.2 2.8 2.8 6.2-6.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {t.verified}
    </span>
  );
}

export default function PublicDoctorReviews({
  reviews,
  locale,
}: Props) {
  const t = copy[locale];

  if (reviews.length === 0) {
    return (
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <h2 className="text-2xl font-bold text-gray-900">
          {t.title}
        </h2>
        <p className="mt-[13px] text-sm text-gray-600">
          {t.empty}
        </p>
      </section>
    );
  }

  const ratingTotal = reviews.reduce(
    (total, review) => total + review.rating,
    0
  );
  const averageRating = ratingTotal / reviews.length;
  const roundedAverage =
    Math.round(averageRating * 10) / 10;

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <div className="flex flex-wrap items-end justify-between gap-[21px] border-b border-gray-200 pb-[21px]">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {t.eyebrow}
          </p>
          <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
            {t.reviews}
          </h2>
          <p className="mt-[8px] max-w-2xl text-xs leading-5 text-gray-500">
            {t.privacy}
          </p>
        </div>

        <div className="flex items-center gap-[13px]">
          <p className="text-4xl font-bold text-gray-900">
            {roundedAverage.toFixed(1)}
          </p>
          <div>
            <RatingStars
              rating={Math.round(averageRating)}
              size="medium"
              label={t.average.replace(
                "{rating}",
                String(roundedAverage)
              )}
            />
            <p className="mt-[5px] text-sm text-gray-500">
              {reviews.length}{" "}
              {reviews.length === 1
                ? t.singular
                : t.plural}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="py-[21px] first:pt-[21px] last:pb-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-[13px]">
              <div>
                <p className="font-semibold text-gray-900">
                  {t.anonymous}
                </p>
                <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
                  {review.verified_appointment && (
                    <VerifiedAppointmentBadge locale={locale} />
                  )}
                  <span className="text-xs text-gray-500">
                    {formatDate(review.created_at, locale)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-[8px]">
                <RatingStars
                  rating={review.rating}
                  size="small"
                />
                <span className="text-sm font-semibold text-gray-700">
                  {review.rating}/5
                </span>
              </div>
            </div>

            {review.review_text && (
              <p className="mt-[13px] whitespace-pre-line text-sm leading-7 text-gray-700">
                {review.review_text}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
