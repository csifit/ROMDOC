import RatingStars from "@/components/reviews/rating-stars";

export type PublicDoctorReview = {
  id: string;
  patient_name: string;
  rating: number;
  review_text:
    | string
    | null;
  created_at: string;
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
  ).format(new Date(value));
}

function getDisplayName(
  patientName: string
) {
  const parts =
    patientName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 0) {
    return "Pacient verificat";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} ${parts[
    parts.length - 1
  ].charAt(0)}.`;
}

export default function PublicDoctorReviews({
  reviews,
}: PublicDoctorReviewsProps) {
  if (reviews.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Recenzii ale pacienților
        </h2>

        <p className="mt-3 text-sm text-gray-600">
          Acest medic nu are încă recenzii publicate.
        </p>
      </section>
    );
  }

  const ratingTotal =
    reviews.reduce(
      (total, review) =>
        total + review.rating,
      0
    );

  const averageRating =
    ratingTotal /
    reviews.length;

  const roundedAverage =
    Math.round(
      averageRating * 10
    ) / 10;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-gray-200 pb-6">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            Experiențele pacienților
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Recenzii
          </h2>
        </div>

        <div className="flex items-center gap-4">
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

            <p className="mt-1 text-sm text-gray-500">
              {reviews.length}{" "}
              {reviews.length === 1
                ? "recenzie"
                : "recenzii"}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {reviews.map(
          (review) => (
            <article
              key={review.id}
              className="py-6 first:pt-6 last:pb-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">
                    {getDisplayName(
                      review.patient_name
                    )}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Pacient cu programare finalizată ·{" "}
                    {formatDate(
                      review.created_at
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <RatingStars
                    rating={
                      review.rating
                    }
                    size="small"
                  />

                  <span className="text-sm font-semibold text-gray-700">
                    {review.rating}/5
                  </span>
                </div>
              </div>

              {review.review_text && (
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-700">
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