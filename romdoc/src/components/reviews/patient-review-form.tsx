"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useState,
} from "react";

import RatingStars from "@/components/reviews/rating-stars";
import Button from "@/components/ui/button";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type PatientReviewFormProps = {
  appointmentId: string;
  doctorName: string;
  onSubmitted?: () => void;
};

type ReviewResponse = {
  message?: string;
  error?: string;
};

export default function PatientReviewForm({
  appointmentId,
  doctorName,
  onSubmitted,
}: PatientReviewFormProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientDashboard.review"
    );

  const [rating, setRating] =
    useState(0);

  const [
    reviewText,
    setReviewText,
  ] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (
      rating < 1 ||
      rating > 5
    ) {
      setError(
        t("invalidRating")
      );
      return;
    }

    if (
      reviewText
        .trim()
        .length < 10
    ) {
      setError(
        t("tooShort")
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/patient/reviews",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                appointmentId,
                rating,

                reviewText:
                  reviewText
                    .trim(),
              }),
          }
        );

      const result =
        (await response.json()) as
          ReviewResponse;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          result.error
            ? result.error
            : t(
                "publishFailed"
              )
        );
      }

      setSuccess(
        locale === "ro" &&
        result.message
          ? result.message
          : t("published")
      );

      setRating(0);
      setReviewText("");

      onSubmitted?.();
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : t(
              "publishFailed"
            )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-gray-50 p-5"
    >
      <h3 className="font-semibold text-gray-900">
        {t(
          "title",
          {
            doctorName,
          }
        )}
      </h3>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-gray-700">
          {t("rating")}
        </p>

        <RatingStars
          rating={rating}
          size="large"
          interactive
          onChange={setRating}
          label={t(
            "ratingSummary",
            {
              rating,
              maximum: 5,
            }
          )}
          starUnitLabel={t(
            "starUnit"
          )}
        />
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-medium text-gray-700">
          {t("yourReview")}
        </span>

        <textarea
          required
          rows={4}
          minLength={10}
          maxLength={3000}
          value={reviewText}
          disabled={isSubmitting}
          onChange={(event) =>
            setReviewText(
              event.target.value
            )
          }
          placeholder={t(
            "placeholder"
          )}
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
        />
      </label>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      <Button
        type="submit"
        disabled={
          isSubmitting ||
          rating === 0
        }
        className="mt-5"
      >
        {isSubmitting
          ? t("publishing")
          : t("publish")}
      </Button>
    </form>
  );
}
