"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import RatingStars from "@/components/reviews/rating-stars";
import Button from "@/components/ui/button";
import type { PlatformOperatorDirectoryApiPayload } from "@/lib/api/platform-operator-directory-codes";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformDirectoryApiMessage,
  getPlatformOperatorDirectory,
  interpolatePlatformDirectoryCopy,
  PLATFORM_OPERATOR_DIRECTORY_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-directory";

type DoctorTranslation = {
  locale: string;
  title: string | null;
};

type DoctorRelation = {
  id: string;
  slug: string;
  public_name: string | null;
  doctor_translations: DoctorTranslation[] | null;
};

type ReviewStatus = "published" | "hidden" | "removed";
type ReviewAction = "hide" | "restore" | "remove";

type Review = {
  id: string;
  patient_name: string;
  rating: number;
  review_text: string | null;
  status: ReviewStatus;
  moderation_reason: string | null;
  created_at: string;
  doctors: DoctorRelation | DoctorRelation[] | null;
};

type StatusCounts = Record<ReviewStatus, number>;

type ReviewsResponse = PlatformOperatorDirectoryApiPayload & {
  reviews?: Review[];
  statusCounts?: Partial<StatusCounts>;
  capabilities?: {
    canModerateReviews?: boolean;
  };
};

const EMPTY_COUNTS: StatusCounts = {
  published: 0,
  hidden: 0,
  removed: 0,
};

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function doctorNameFromSlug(slug: string) {
  return decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSearch(value: string, localeTag: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(localeTag)
    .trim();
}

function statusClasses(status: ReviewStatus) {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800";
    case "hidden":
      return "bg-amber-100 text-amber-900";
    case "removed":
      return "bg-red-100 text-red-800";
  }
}

export default function ReviewsManagement() {
  const locale = normalizeAppLocale(useLocale());
  const localeTag = PLATFORM_OPERATOR_DIRECTORY_LOCALE_TAGS[locale];
  const copy = getPlatformOperatorDirectory(locale);

  const [selectedStatus, setSelectedStatus] =
    useState<ReviewStatus>("published");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [statusCounts, setStatusCounts] =
    useState<StatusCounts>(EMPTY_COUNTS);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [changingReviewId, setChangingReviewId] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canModerateReviews, setCanModerateReviews] = useState(true);

  const formatDoctorName = useCallback(
    (review: Review) => {
      const doctor = firstRelation(review.doctors);

      if (!doctor) {
        return copy.reviews.labels.doctorUnavailable;
      }

      return doctor.public_name?.trim() || doctorNameFromSlug(doctor.slug);
    },
    [copy.reviews.labels.doctorUnavailable]
  );

  const formatDate = useCallback(
    (value: string) =>
      new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value)),
    [localeTag]
  );

  const loadReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/reviews?status=${selectedStatus}`,
        { cache: "no-store" }
      );
      const result = (await response.json()) as ReviewsResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformDirectoryApiMessage(
            locale,
            result.code,
            result.error ?? copy.reviews.states.loadFailed
          )
        );
      }

      setReviews(result.reviews ?? []);
      setStatusCounts({
        published: result.statusCounts?.published ?? 0,
        hidden: result.statusCounts?.hidden ?? 0,
        removed: result.statusCounts?.removed ?? 0,
      });
      setCanModerateReviews(
        result.capabilities?.canModerateReviews ?? true
      );
    } catch (loadError) {
      setReviews([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.reviews.states.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.reviews.states.loadFailed, locale, selectedStatus]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const filteredReviews = useMemo(() => {
    const normalized = normalizeSearch(search, localeTag);

    if (!normalized) return reviews;

    return reviews.filter((review) => {
      const values = [
        review.patient_name,
        formatDoctorName(review),
        review.review_text,
        review.moderation_reason,
      ];

      return values
        .filter((value): value is string => Boolean(value))
        .some((value) =>
          normalizeSearch(value, localeTag).includes(normalized)
        );
    });
  }, [formatDoctorName, localeTag, reviews, search]);

  const totalReviews =
    statusCounts.published + statusCounts.hidden + statusCounts.removed;

  async function moderateReview(
    reviewId: string,
    action: ReviewAction
  ) {
    setError(null);
    setSuccess(null);

    let moderationReason = "";

    if (action === "hide" || action === "remove") {
      const enteredReason = window.prompt(
        action === "hide"
          ? copy.reviews.prompts.hide
          : copy.reviews.prompts.remove
      );

      if (!enteredReason || enteredReason.trim().length < 3) {
        return;
      }

      moderationReason = enteredReason.trim();
    }

    if (
      action === "restore" &&
      !window.confirm(copy.reviews.confirmations.restore)
    ) {
      return;
    }

    setChangingReviewId(reviewId);

    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewId,
          action,
          moderationReason,
        }),
      });
      const result = (await response.json()) as ReviewsResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformDirectoryApiMessage(
            locale,
            result.code,
            result.error ?? copy.reviews.states.updateFailed
          )
        );
      }

      setSuccess(
        getPlatformDirectoryApiMessage(
          locale,
          result.code,
          result.message ?? copy.reviews.states.updated
        )
      );
      await loadReviews();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : copy.reviews.states.updateFailed
      );
    } finally {
      setChangingReviewId(null);
    }
  }

  const filters: Array<{
    value: ReviewStatus;
    label: string;
    count: number;
  }> = [
    {
      value: "published",
      label: copy.reviews.filters.published,
      count: statusCounts.published,
    },
    {
      value: "hidden",
      label: copy.reviews.filters.hidden,
      count: statusCounts.hidden,
    },
    {
      value: "removed",
      label: copy.reviews.filters.removed,
      count: statusCounts.removed,
    },
  ];

  return (
    <div className="space-y-[21px]">
      <section className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: copy.reviews.metrics.published,
            value: statusCounts.published,
          },
          {
            label: copy.reviews.metrics.hidden,
            value: statusCounts.hidden,
          },
          {
            label: copy.reviews.metrics.removed,
            value: statusCounts.removed,
          },
          {
            label: copy.reviews.metrics.total,
            value: totalReviews,
          },
        ].map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {metric.label}
            </p>
            <p className="mt-[8px] text-3xl font-bold text-gray-900">
              {metric.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col gap-[13px] lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-[8px]">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSelectedStatus(filter.value)}
                className={`romdoc-focus-ring inline-flex min-h-[42px] items-center gap-[8px] rounded-xl px-[13px] py-[8px] text-sm font-semibold transition ${
                  selectedStatus === filter.value
                    ? "bg-[#036661] text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`rounded-full px-[8px] py-[2px] text-xs ${
                    selectedStatus === filter.value
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          <label className="w-full lg:max-w-sm">
            <span className="sr-only">
              {copy.reviews.filters.searchLabel}
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.reviews.filters.searchPlaceholder}
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-sm"
            />
          </label>
        </div>

        <p className="mt-[13px] text-xs text-gray-500">
          {interpolatePlatformDirectoryCopy(copy.common.showing, {
            filtered: filteredReviews.length,
            total: reviews.length,
          })}
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-[34px] text-sm text-gray-600 shadow-sm">
          {copy.reviews.states.loading}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-[34px] text-sm text-gray-600 shadow-sm">
          {copy.reviews.states.empty}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-[34px] text-sm text-gray-600 shadow-sm">
          {copy.reviews.states.noSearchResults}
        </div>
      ) : (
        <div className="space-y-[13px]">
          {filteredReviews.map((review) => {
            const isChanging = changingReviewId === review.id;
            const doctorName = formatDoctorName(review);

            return (
              <article
                key={review.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-[13px] p-[21px] sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <h2 className="font-semibold text-gray-900">
                        {review.patient_name}
                      </h2>
                      <span
                        className={`rounded-full px-[8px] py-[3px] text-xs font-semibold ${statusClasses(
                          review.status
                        )}`}
                      >
                        {review.status === "published"
                          ? copy.reviews.labels.statusPublished
                          : review.status === "hidden"
                            ? copy.reviews.labels.statusHidden
                            : copy.reviews.labels.statusRemoved}
                      </span>
                    </div>

                    <p className="mt-[8px] text-sm text-gray-600">
                      {interpolatePlatformDirectoryCopy(
                        copy.reviews.labels.forDoctor,
                        { doctor: doctorName }
                      )}
                    </p>
                    <p className="mt-[5px] text-xs text-gray-500">
                      {interpolatePlatformDirectoryCopy(copy.reviews.labels.date, {
                        date: formatDate(review.created_at),
                      })}
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-[8px]"
                    aria-label={`${copy.reviews.labels.rating}: ${review.rating}/5`}
                  >
                    <RatingStars rating={review.rating} size="small" />
                    <span className="text-sm font-semibold text-gray-900">
                      {review.rating}/5
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 px-[21px] py-[13px]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {copy.reviews.labels.comment}
                  </p>
                  <p className="mt-[8px] whitespace-pre-line text-sm leading-7 text-gray-700">
                    {review.review_text ?? copy.reviews.labels.noComment}
                  </p>
                </div>

                {review.moderation_reason && (
                  <div className="border-t border-amber-100 bg-amber-50 px-[21px] py-[13px] text-sm text-amber-900">
                    <span className="font-semibold">
                      {copy.reviews.labels.moderationReason}:
                    </span>{" "}
                    {review.moderation_reason}
                  </div>
                )}

                {canModerateReviews && (
                  <div className="flex flex-wrap gap-[8px] border-t border-gray-200 px-[21px] py-[13px]">
                    {review.status === "published" ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isChanging}
                          onClick={() =>
                            void moderateReview(review.id, "hide")
                          }
                        >
                          {isChanging
                            ? copy.reviews.actions.processing
                            : copy.reviews.actions.hide}
                        </Button>
                        <Button
                          type="button"
                          variant="danger-outline"
                          size="sm"
                          disabled={isChanging}
                          onClick={() =>
                            void moderateReview(review.id, "remove")
                          }
                        >
                          {isChanging
                            ? copy.reviews.actions.processing
                            : copy.reviews.actions.remove}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isChanging}
                        onClick={() =>
                          void moderateReview(review.id, "restore")
                        }
                      >
                        {isChanging
                          ? copy.reviews.actions.processing
                          : copy.reviews.actions.restore}
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
