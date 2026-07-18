import RatingStars from "@/components/reviews/rating-stars";

export type PublicDoctorReview = {
  id: string;
  rating: number;
  review_text:
    | string
    | null;
  created_at: string;
  verified_appointment: boolean;
};

type PublicDoctorReviewsProps = {
  reviews: PublicDoctorReview[];
};

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}

function VerifiedAppointmentBadge() {
  return (
    <span
      title="Recenzia este asociată unei programări finalizate prin RomDoc."
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

      Programare verificată
    </span>
  );
}

export default function PublicDoctorReviews({
  reviews,
}: PublicDoctorReviewsProps) {
  if (
    reviews.length ===
    0
  ) {
    return (
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <h2 className="text-2xl font-bold text-gray-900">
          Recenzii ale pacienților
        </h2>

        <p className="mt-[13px] text-sm text-gray-600">
          Acest medic nu are încă recenzii publicate.
        </p>
      </section>
    );
  }

  const ratingTotal =
    reviews.reduce(
      (
        total,
        review
      ) =>
        total +
        review.rating,
      0
    );

  const averageRating =
    ratingTotal /
    reviews.length;

  const roundedAverage =
    Math.round(
      averageRating *
        10
    ) / 10;

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <div className="flex flex-wrap items-end justify-between gap-[21px] border-b border-gray-200 pb-[21px]">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            Experiențele pacienților
          </p>

          <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
            Recenzii
          </h2>

          <p className="mt-[8px] max-w-2xl text-xs leading-5 text-gray-500">
            Identitatea pacienților nu este afișată public. Eticheta „Programare verificată” confirmă doar existența unei programări finalizate prin RomDoc.
          </p>
        </div>

        <div className="flex items-center gap-[13px]">
          <p className="text-4xl font-bold text-gray-900">
            {roundedAverage.toFixed(
              1
            )}
          </p>

          <div>
            <RatingStars
              rating={Math.round(
                averageRating
              )}
              size="medium"
              label={`Evaluare medie ${roundedAverage} din 5`}
            />

            <p className="mt-[5px] text-sm text-gray-500">
              {reviews.length}{" "}
              {reviews.length ===
              1
                ? "recenzie"
                : "recenzii"}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {reviews.map(
          (
            review
          ) => (
            <article
              key={
                review.id
              }
              className="py-[21px] first:pt-[21px] last:pb-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-[13px]">
                <div>
                  <p className="font-semibold text-gray-900">
                    Pacient anonim
                  </p>

                  <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
                    {review.verified_appointment && (
                      <VerifiedAppointmentBadge />
                    )}

                    <span className="text-xs text-gray-500">
                      {formatDate(
                        review.created_at
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-[8px]">
                  <RatingStars
                    rating={
                      review.rating
                    }
                    size="small"
                  />

                  <span className="text-sm font-semibold text-gray-700">
                    {review.rating}
                    /5
                  </span>
                </div>
              </div>

              {review.review_text && (
                <p className="mt-[13px] whitespace-pre-line text-sm leading-7 text-gray-700">
                  {
                    review.review_text
                  }
                </p>
              )}
            </article>
          )
        )}
      </div>
    </section>
  );
}
