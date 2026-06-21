"use client";

import Button from "@/components/ui/button";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import RatingStars from "@/components/reviews/rating-stars";

type DoctorTranslation = {
  locale: string;
  title:
    | string
    | null;
};

type DoctorRelation = {
  id: string;
  slug: string;
  doctor_translations:
    | DoctorTranslation[]
    | null;
};

type Review = {
  id: string;
  patient_name: string;
  rating: number;

  review_text:
    | string
    | null;

  status: string;

  moderation_reason:
    | string
    | null;

  created_at: string;

  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
};

type ApiResponse = {
  reviews?: Review[];
  message?: string;
  error?: string;
};

type ReviewFilter =
  | "published"
  | "hidden"
  | "removed";

function getFirstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
) {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatDoctorName(
  review: Review
) {
  const doctor =
    getFirstRelation(
      review.doctors
    );

  if (!doctor) {
    return "Medic indisponibil";
  }

  return doctor.slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

export default function ReviewsManagement() {
  const [
    selectedStatus,
    setSelectedStatus,
  ] =
    useState<ReviewFilter>(
      "published"
    );

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    changingReviewId,
    setChangingReviewId,
  ] =
    useState<string | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadReviews =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            `/api/admin/reviews?status=${selectedStatus}`,
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Recenziile nu au putut fi încărcate."
          );
        }

        setReviews(
          result.reviews ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Recenziile nu au putut fi încărcate."
        );
      } finally {
        setIsLoading(false);
      }
    }, [selectedStatus]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function moderateReview(
    reviewId: string,
    action:
      | "hide"
      | "restore"
      | "remove"
  ) {
    setError(null);
    setSuccess(null);

    let moderationReason = "";

    if (
      action === "hide" ||
      action === "remove"
    ) {
      const enteredReason =
        window.prompt(
          action === "hide"
            ? "Motivul ascunderii recenziei:"
            : "Motivul eliminării recenziei:"
        );

      if (
        !enteredReason ||
        enteredReason.trim()
          .length < 3
      ) {
        return;
      }

      moderationReason =
        enteredReason.trim();
    }

    setChangingReviewId(
      reviewId
    );

    try {
      const response =
        await fetch(
          "/api/admin/reviews",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                reviewId,
                action,
                moderationReason,
              }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Recenzia nu a putut fi actualizată."
        );
      }

      setSuccess(
        result.message ??
          "Recenzia a fost actualizată."
      );

      await loadReviews();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Recenzia nu a putut fi actualizată."
      );
    } finally {
      setChangingReviewId(
        null
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setSelectedStatus(
                "published"
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              selectedStatus ===
              "published"
                ? "bg-[#036661] text-white"
                : "border border-gray-300 bg-white text-gray-700"
            }`}
          >
            Publicate
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedStatus(
                "hidden"
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              selectedStatus ===
              "hidden"
                ? "bg-[#036661] text-white"
                : "border border-gray-300 bg-white text-gray-700"
            }`}
          >
            Ascunse
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedStatus(
                "removed"
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              selectedStatus ===
              "removed"
                ? "bg-[#036661] text-white"
                : "border border-gray-300 bg-white text-gray-700"
            }`}
          >
            Eliminate
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          Se încarcă recenziile...
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600 shadow-sm">
          Nu există recenzii în această categorie.
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map(
            (review) => {
              const isChanging =
                changingReviewId ===
                review.id;

              return (
                <article
                  key={review.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {
                          review.patient_name
                        }
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Pentru{" "}
                        {formatDoctorName(
                          review
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
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

                      <span className="text-sm font-semibold">
                        {review.rating}/5
                      </span>
                    </div>
                  </div>

                  <p className="mt-5 whitespace-pre-line text-sm leading-7 text-gray-700">
                    {review.review_text ??
                      "Fără comentariu."}
                  </p>

                  {review.moderation_reason && (
                    <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                      <span className="font-semibold">
                        Motiv moderare:
                      </span>{" "}
                      {
                        review.moderation_reason
                      }
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-5">
                    {review.status ===
                      "published" && (
                      <>
                        <Button
                          type="button"
                          disabled={
                            isChanging
                          }
                          onClick={() =>
                            moderateReview(
                              review.id,
                              "hide"
                            )
                          }
            variant="secondary"
            size="sm"
                        >
                          Ascunde
                        </Button>

                        <Button
                          type="button"
                          disabled={
                            isChanging
                          }
                          onClick={() =>
                            moderateReview(
                              review.id,
                              "remove"
                            )
                          }
            variant="danger-outline"
            size="sm"
                        >
                          Elimină
                        </Button>
                      </>
                    )}

                    {review.status !==
                      "published" && (
                      <Button
                        type="button"
                        disabled={
                          isChanging
                        }
                        onClick={() =>
                          moderateReview(
                            review.id,
                            "restore"
                          )
                        }
            size="sm"
                      >
                        Republică
                      </Button>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}