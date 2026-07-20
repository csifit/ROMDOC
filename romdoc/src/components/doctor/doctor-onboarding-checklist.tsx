import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";

import type {
  DoctorProfileCompletion,
  DoctorOnboardingItemKey,
} from "@/lib/doctors/get-doctor-profile-completion";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";

type DoctorOnboardingChecklistProps = {
  completion:
    DoctorProfileCompletion;
};

function verificationTone(
  status:
    string
) {
  switch (
    status
  ) {
    case "verified":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "rejected":
    case "expired":
      return "border-red-200 bg-red-50 text-red-800";

    case "submitted":
    case "under_review":
      return "border-blue-200 bg-blue-50 text-blue-800";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

export default async function DoctorOnboardingChecklist({
  completion,
}: DoctorOnboardingChecklistProps) {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "DoctorConfiguration.onboarding",
    });

  const publicProfileHref =
    locale === "de"
      ? `/de/arzt/${completion.doctorSlug}`
      : `/${locale}/doctor/${completion.doctorSlug}`;

  function verificationLabel(
    status:
      string
  ) {
    switch (
      status
    ) {
      case "verified":
        return t(
          "verificationStatuses.verified"
        );

      case "submitted":
      case "under_review":
        return t(
          "verificationStatuses.pending"
        );

      case "rejected":
        return t(
          "verificationStatuses.rejected"
        );

      case "expired":
        return t(
          "verificationStatuses.expired"
        );

      default:
        return t(
          "verificationStatuses.not_submitted"
        );
    }
  }

  function doctorStatusLabel(
    status:
      string
  ) {
    if (
      [
        "active",
        "pending",
        "suspended",
        "rejected",
        "draft",
      ].includes(
        status
      )
    ) {
      return t(
        `doctorStatuses.${status}`
      );
    }

    return status;
  }

  function itemCopy(
    key:
      DoctorOnboardingItemKey
  ) {
    return {
      title:
        t(
          `items.${key}.title`
        ),

      description:
        t(
          `items.${key}.description`
        ),

      action:
        t(
          `items.${key}.action`
        ),
    };
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#036661]">
            {t(
              "eyebrow"
            )}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">
              {t(
                "title"
              )}
            </h2>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                completion
                  .isReadyForPatients
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {completion
                .isReadyForPatients
                ? t(
                    "ready"
                  )
                : t(
                    "inProgress"
                  )}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            {t(
              "steps",
              {
                completed:
                  completion
                    .completedItems,

                total:
                  completion
                    .totalItems,
              }
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={
              publicProfileHref
            }
            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
          >
            {t(
              "publicProfile"
            )}
          </Link>

          {!completion
            .isComplete && (
            <Link
              href={
                completion
                  .items
                  .find(
                    (
                      item
                    ) =>
                      !item.completed
                  )?.href ??
                "/doctor-dashboard/profile"
              }
              className="romdoc-button romdoc-button-primary romdoc-button-sm"
            >
              {t(
                "continue"
              )}
            </Link>
          )}
        </div>
      </div>

      <div
        aria-label={t(
          "progressAria",
          {
            percentage:
              completion.percentage,
          }
        )}
        className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className="h-full rounded-full bg-[#036661] transition-[width]"
          style={{
            width:
              `${completion.percentage}%`,
          }}
        />
      </div>

      {completion.doctorStatus !==
        "active" && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t(
            "inactiveNotice",
            {
              status:
                completion
                  .doctorStatus,
            }
          )}
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {completion.items.map(
          (
            item
          ) => {
            const copy =
              itemCopy(
                item.key
              );

            return (
              <article
                key={
                  item.key
                }
                className={`rounded-2xl border p-4 ${
                  item.completed
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-gray-900">
                    {
                      copy.title
                    }
                  </h3>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      item.completed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-white text-gray-600"
                    }`}
                  >
                    {item.completed
                      ? t(
                          "complete"
                        )
                      : t(
                          "incomplete"
                        )}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {
                    copy.description
                  }
                </p>

                {!item.completed && (
                  <Link
                    href={
                      item.href
                    }
                    className="mt-4 inline-flex text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
                  >
                    {
                      copy.action
                    }
                  </Link>
                )}
              </article>
            );
          }
        )}
      </div>

      <div
        className={`mt-5 rounded-xl border p-4 ${verificationTone(
          completion
            .verificationStatus
        )}`}
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold">
              {t(
                "verification"
              )}
              :{" "}
              {verificationLabel(
                completion
                  .verificationStatus
              )}
            </p>

            <p className="mt-1 text-sm">
              {t(
                "verificationDescription"
              )}
            </p>
          </div>

          <Link
            href="/doctor-dashboard/verification"
            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
          >
            {t(
              "manage"
            )}
          </Link>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {t(
          "desktopHelp"
        )}
      </p>
    </section>
  );
}
