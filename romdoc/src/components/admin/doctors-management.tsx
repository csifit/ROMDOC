"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";

import AdminDoctorClinicsInline from "@/components/admin/admin-doctor-clinics-inline";
import Button from "@/components/ui/button";
import type { PlatformOperatorDoctorApiPayload } from "@/lib/api/platform-operator-doctor-codes";
import {
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  getPlatformDoctorApiMessage,
  getPlatformOperatorDoctors,
  interpolatePlatformDoctorCopy,
  PLATFORM_OPERATOR_DOCTOR_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-doctors";

type Translation = {
  locale: string;
  title: string | null;
  biography: string | null;
};

type SpecialtyTranslation = {
  locale: string;
  name: string;
};

type Specialty = {
  id: string;
  slug: string;
  specialty_translations: SpecialtyTranslation[] | null;
};

type DoctorSpecialty = {
  specialties: Specialty | Specialty[] | null;
};

type DoctorProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  account_status: string;
};

type Subscription = {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: string;
  billing_interval: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  last_payment_at: string | null;
};

type ComplimentaryAccess = {
  id: string;
  doctor_id: string;
  invitation_id: string | null;
  grant_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

type Doctor = {
  id: string;
  profile_id: string | null;
  slug: string;
  phone: string | null;
  email: string | null;
  years_experience: number | null;
  consultation_price: number | string | null;
  status: string;
  account_type: string | null;
  clinic_organization_id: string | null;
  clinic_organization_name: string | null;
  subscription_payer: "doctor" | "clinic";
  average_rating: number | string;
  review_count: number;
  verification_status: string;
  professional_registration_number: string | null;
  verified_at: string | null;
  verification_expires_at: string | null;
  created_at: string;
  updated_at: string;
  doctor_translations: Translation[] | null;
  doctor_specialties: DoctorSpecialty[] | null;
  profile: DoctorProfile | null;
  auth_email: string | null;
  email_verified: boolean;
  subscription: Subscription | null;
  complimentary_access: ComplimentaryAccess | null;
  clinic_count: number;
  active_staff_count: number;
};

type ApiResponse = PlatformOperatorDoctorApiPayload & {
  doctors?: Doctor[];
};

type DoctorStatusFilter =
  | "all"
  | "active"
  | "suspended";

type AccountStatusFilter =
  | "all"
  | "active"
  | "suspended"
  | "blocked";

type SubscriptionFilter =
  | "all"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "none";

type PayerFilter =
  | "all"
  | "doctor"
  | "clinic";

type VerificationFilter =
  | "all"
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

const COMMERCIAL_ACCESS_COPY = {
  ro: {
    accessType: "Tip acces",
    adminComplimentary: "Acces gratuit acordat de administrator",
    stripeSubscription: "Abonament Stripe",
    clinicCoverage: "Acoperire prin clinică",
    noCommercialAccess: "Fără acces comercial identificat",
    complimentaryStatus: "Statut acces gratuit",
    complimentaryStart: "Început acces gratuit",
    complimentaryEnd: "Sfârșit acces gratuit",
    stripeActivation: "Activare Stripe",
    stripeActivated: "Activat",
    stripeNotActivated: "Neactivat",
    stripePeriodStart: "Început perioadă Stripe",
    stripePeriodEnd: "Sfârșit perioadă Stripe",
    grantStatuses: {
      scheduled: "Programat",
      active: "Activ",
      expired: "Expirat",
      revoked: "Revocat",
      cancelled: "Anulat",
    },
  },
  en: {
    accessType: "Access type",
    adminComplimentary: "Admin complimentary access",
    stripeSubscription: "Stripe subscription",
    clinicCoverage: "Clinic-covered access",
    noCommercialAccess: "No commercial access identified",
    complimentaryStatus: "Complimentary status",
    complimentaryStart: "Complimentary starts",
    complimentaryEnd: "Complimentary ends",
    stripeActivation: "Stripe activation",
    stripeActivated: "Activated",
    stripeNotActivated: "Not activated",
    stripePeriodStart: "Stripe period starts",
    stripePeriodEnd: "Stripe period ends",
    grantStatuses: {
      scheduled: "Scheduled",
      active: "Active",
      expired: "Expired",
      revoked: "Revoked",
      cancelled: "Cancelled",
    },
  },
  de: {
    accessType: "Zugangsart",
    adminComplimentary: "Kostenloser Admin-Zugang",
    stripeSubscription: "Stripe-Abonnement",
    clinicCoverage: "Von der Klinik abgedeckt",
    noCommercialAccess: "Kein kommerzieller Zugang erkannt",
    complimentaryStatus: "Status des kostenlosen Zugangs",
    complimentaryStart: "Kostenloser Zugang beginnt",
    complimentaryEnd: "Kostenloser Zugang endet",
    stripeActivation: "Stripe-Aktivierung",
    stripeActivated: "Aktiviert",
    stripeNotActivated: "Nicht aktiviert",
    stripePeriodStart: "Stripe-Zeitraum beginnt",
    stripePeriodEnd: "Stripe-Zeitraum endet",
    grantStatuses: {
      scheduled: "Geplant",
      active: "Aktiv",
      expired: "Abgelaufen",
      revoked: "Widerrufen",
      cancelled: "Storniert",
    },
  },
} as const;

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

  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

function getDoctorName(
  doctor: Doctor
) {
  const fullName = [
    doctor.profile?.first_name,
    doctor.profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
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

function getStatusClasses(
  status: string
) {
  if (
    status === "active" ||
    status === "verified"
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (
    status === "blocked" ||
    status === "rejected" ||
    status === "past_due"
  ) {
    return "bg-red-100 text-red-800";
  }

  if (
    status === "suspended" ||
    status === "expired" ||
    status === "canceled" ||
    status === "cancelled" ||
    status === "revoked"
  ) {
    return "bg-gray-200 text-gray-700";
  }

  return "bg-amber-100 text-amber-900";
}

export default function DoctorsManagement() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const copy =
    getPlatformOperatorDoctors(
      locale
    );

  const commercialCopy =
    COMMERCIAL_ACCESS_COPY[
      locale
    ];

  const [
    doctors,
    setDoctors,
  ] =
    useState<Doctor[]>([]);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    doctorStatus,
    setDoctorStatus,
  ] =
    useState<DoctorStatusFilter>(
      "all"
    );

  const [
    accountStatus,
    setAccountStatus,
  ] =
    useState<AccountStatusFilter>(
      "all"
    );

  const [
    subscriptionStatus,
    setSubscriptionStatus,
  ] =
    useState<SubscriptionFilter>(
      "all"
    );

  const [
    payerFilter,
    setPayerFilter,
  ] =
    useState<PayerFilter>(
      "all"
    );

  const [
    verificationStatus,
    setVerificationStatus,
  ] =
    useState<VerificationFilter>(
      "all"
    );

  const [
    expandedDoctorId,
    setExpandedDoctorId,
  ] =
    useState<string | null>(
      null
    );

  const [
    changingDoctorId,
    setChangingDoctorId,
  ] =
    useState<string | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

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

  const formatDate =
    useCallback(
      (
        value:
          | string
          | null
      ) => {
        if (!value) {
          return copy.common.none;
        }

        const date =
          new Date(value);

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return copy.common.none;
        }

        return new Intl.DateTimeFormat(
          PLATFORM_OPERATOR_DOCTOR_LOCALE_TAGS[
            locale
          ],
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone:
              "Europe/Bucharest",
          }
        ).format(date);
      },
      [
        copy.common.none,
        locale,
      ]
    );

  const getDoctorTitle =
    useCallback(
      (
        doctor: Doctor
      ) =>
        selectTranslation(
          doctor.doctor_translations,
          locale
        )?.title ??
        copy.doctors.labels
          .titleFallback,
      [
        copy.doctors.labels
          .titleFallback,
        locale,
      ]
    );

  const getSpecialties =
    useCallback(
      (
        doctor: Doctor
      ) =>
        (
          doctor.doctor_specialties ??
          []
        )
          .map(
            (
              relation
            ) => {
              const specialty =
                getFirstRelation(
                  relation.specialties
                );

              return (
                selectTranslation(
                  specialty
                    ?.specialty_translations,
                  locale
                )?.name ??
                null
              );
            }
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          ),
      [locale]
    );

  const loadDoctors =
    useCallback(
      async () => {
        try {
          setIsLoading(true);
          setError(null);

          const response =
            await fetch(
              "/api/admin/doctors",
              {
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as
              ApiResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              getPlatformDoctorApiMessage(
                locale,
                result.code,
                result.error ??
                  copy.doctors
                    .states
                    .loadFailed
              )
            );
          }

          setDoctors(
            result.doctors ??
              []
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : copy.doctors
                  .states
                  .loadFailed
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        copy.doctors.states
          .loadFailed,
        locale,
      ]
    );

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  const filteredDoctors =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return doctors.filter(
        (doctor) => {
          if (
            doctorStatus !==
              "all" &&
            doctor.status !==
              doctorStatus
          ) {
            return false;
          }

          if (
            accountStatus !==
              "all" &&
            (
              doctor.profile
                ?.account_status ??
              "active"
            ) !==
              accountStatus
          ) {
            return false;
          }

          if (
            payerFilter !==
              "all" &&
            doctor.subscription_payer !==
              payerFilter
          ) {
            return false;
          }

          if (
            verificationStatus !==
              "all" &&
            doctor.verification_status !==
              verificationStatus
          ) {
            return false;
          }

          const subscription =
            doctor.subscription;

          if (
            subscriptionStatus ===
              "none" &&
            subscription
          ) {
            return false;
          }

          if (
            subscriptionStatus !==
              "all" &&
            subscriptionStatus !==
              "none" &&
            subscription?.status !==
              subscriptionStatus
          ) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          return [
            getDoctorName(
              doctor
            ),
            doctor.slug,
            doctor.auth_email,
            doctor.phone,
            doctor
              .clinic_organization_name,
            getDoctorTitle(
              doctor
            ),
            ...getSpecialties(
              doctor
            ),
          ]
            .filter(Boolean)
            .some(
              (
                value
              ) =>
                value
                  ?.toLowerCase()
                  .includes(
                    normalizedSearch
                  )
            );
        }
      );
    }, [
      accountStatus,
      doctorStatus,
      doctors,
      getDoctorTitle,
      getSpecialties,
      payerFilter,
      search,
      subscriptionStatus,
      verificationStatus,
    ]);

  const activeCount =
    doctors.filter(
      (doctor) =>
        doctor.status ===
        "active"
    ).length;

  const suspendedCount =
    doctors.filter(
      (doctor) =>
        doctor.status ===
        "suspended"
    ).length;

  const verifiedCount =
    doctors.filter(
      (doctor) =>
        doctor.verification_status ===
        "verified"
    ).length;

  const attentionCount =
    doctors.filter(
      (doctor) =>
        doctor.status !==
          "active" ||
        (
          doctor.profile
            ?.account_status ??
          "active"
        ) !== "active" ||
        [
          "pending",
          "rejected",
          "expired",
        ].includes(
          doctor.verification_status
        ) ||
        (
          doctor.subscription_payer ===
            "doctor" &&
          doctor.subscription
            ?.status ===
            "past_due"
        )
    ).length;

  const resolveActionMessage =
    useCallback(
      (
        result:
          PlatformOperatorDoctorApiPayload,
        fallback: string
      ) =>
        getPlatformDoctorApiMessage(
          locale,
          result.code,
          result.message ??
            result.error ??
            fallback
        ),
      [locale]
    );

  async function updateDoctorStatus(
    doctor: Doctor,
    nextStatus:
      | "active"
      | "suspended"
  ) {
    const statusLabel =
      copy.doctors
        .doctorStatuses[
          nextStatus
        ];

    const confirmed =
      window.confirm(
        interpolatePlatformDoctorCopy(
          copy.doctors.actions
            .statusConfirm,
          {
            name:
              getDoctorName(
                doctor
              ),
            status:
              statusLabel,
          }
        )
      );

    if (!confirmed) {
      return;
    }

    setChangingDoctorId(
      doctor.id
    );
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/admin/doctors",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                doctorId:
                  doctor.id,
                action:
                  "set_status",
                status:
                  nextStatus,
              }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      const message =
        resolveActionMessage(
          result,
          copy.doctors
            .states
            .actionFailed
        );

      if (!response.ok) {
        throw new Error(
          message
        );
      }

      setSuccess(message);
      await loadDoctors();
    } catch (
      actionError
    ) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : copy.doctors
              .states
              .actionFailed
      );
    } finally {
      setChangingDoctorId(
        null
      );
    }
  }

  async function updateAccountStatus(
    doctor: Doctor,
    nextStatus:
      | "active"
      | "suspended"
      | "blocked"
  ) {
    const statusLabel =
      copy.doctors
        .accountStatuses[
          nextStatus
        ];

    const confirmed =
      window.confirm(
        interpolatePlatformDoctorCopy(
          copy.doctors.actions
            .accountConfirm,
          {
            name:
              getDoctorName(
                doctor
              ),
            status:
              statusLabel,
          }
        )
      );

    if (!confirmed) {
      return;
    }

    setChangingDoctorId(
      doctor.id
    );
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/admin/doctors",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                doctorId:
                  doctor.id,
                action:
                  "set_account_status",
                accountStatus:
                  nextStatus,
              }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      const message =
        resolveActionMessage(
          result,
          copy.doctors
            .states
            .actionFailed
        );

      if (!response.ok) {
        throw new Error(
          message
        );
      }

      setSuccess(message);
      await loadDoctors();
    } catch (
      actionError
    ) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : copy.doctors
              .states
              .actionFailed
      );
    } finally {
      setChangingDoctorId(
        null
      );
    }
  }

  async function verifyDoctor(
    doctor: Doctor
  ) {
    const registrationNumber =
      window.prompt(
        copy.doctors.actions
          .registrationPrompt,
        doctor
          .professional_registration_number ??
          ""
      );

    if (
      !registrationNumber ||
      registrationNumber
        .trim().length <
        2
    ) {
      return;
    }

    const expiry =
      window.prompt(
        copy.doctors.actions
          .expiryPrompt,
        doctor
          .verification_expires_at
          ? doctor
              .verification_expires_at
              .slice(0, 10)
          : ""
      );

    setChangingDoctorId(
      doctor.id
    );
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/admin/doctors",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                doctorId:
                  doctor.id,
                action:
                  "set_verification",
                verificationStatus:
                  "verified",
                registrationNumber:
                  registrationNumber.trim(),
                verificationExpiresAt:
                  expiry?.trim() ??
                  "",
              }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      const message =
        resolveActionMessage(
          result,
          copy.doctors
            .states
            .actionFailed
        );

      if (!response.ok) {
        throw new Error(
          message
        );
      }

      setSuccess(message);
      await loadDoctors();
    } catch (
      actionError
    ) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : copy.doctors
              .states
              .actionFailed
      );
    } finally {
      setChangingDoctorId(
        null
      );
    }
  }

  async function removeVerification(
    doctor: Doctor
  ) {
    if (
      !window.confirm(
        copy.doctors.actions
          .removeVerificationConfirm
      )
    ) {
      return;
    }

    setChangingDoctorId(
      doctor.id
    );
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/admin/doctors",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                doctorId:
                  doctor.id,
                action:
                  "set_verification",
                verificationStatus:
                  "not_submitted",
              }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      const message =
        resolveActionMessage(
          result,
          copy.doctors
            .states
            .actionFailed
        );

      if (!response.ok) {
        throw new Error(
          message
        );
      }

      setSuccess(message);
      await loadDoctors();
    } catch (
      actionError
    ) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : copy.doctors
              .states
              .actionFailed
      );
    } finally {
      setChangingDoctorId(
        null
      );
    }
  }

  function resetFilters() {
    setSearch("");
    setDoctorStatus(
      "all"
    );
    setAccountStatus(
      "all"
    );
    setSubscriptionStatus(
      "all"
    );
    setPayerFilter(
      "all"
    );
    setVerificationStatus(
      "all"
    );
  }

  const getDoctorTypeLabel =
    (
      doctor: Doctor
    ) =>
      doctor.account_type ===
      "clinic_sub_account"
        ? copy.doctors
            .accountTypes
            .clinic
        : copy.doctors
            .accountTypes
            .independent;

  const getSubscriptionPayerLabel =
    (
      doctor: Doctor
    ) =>
      doctor.subscription_payer ===
      "clinic"
        ? copy.doctors.payers
            .clinic
        : copy.doctors.payers
            .doctor;

  const getVerificationLabel =
    (
      status: string
    ) =>
      (
        copy.doctors
          .verificationStatuses as
          Record<
            string,
            string
          >
      )[status] ??
      copy.common.unknown;

  const getSubscriptionLabel =
    (
      subscription:
        | Subscription
        | null,
      doctor: Doctor
    ) => {
      if (
        doctor.subscription_payer ===
        "clinic"
      ) {
        return copy.doctors
          .subscriptionStatuses
          .clinic;
      }

      if (!subscription) {
        return copy.doctors
          .subscriptionStatuses
          .none;
      }

      return (
        copy.doctors
          .subscriptionStatuses as
          Record<
            string,
            string
          >
      )[
        subscription.status
      ] ??
      subscription.status;
    };

  const getComplimentaryStatusLabel =
    (
      grant:
        | ComplimentaryAccess
        | null
    ) => {
      if (!grant) {
        return copy.common.none;
      }

      return (
        commercialCopy
          .grantStatuses as
          Record<
            string,
            string
          >
      )[grant.status] ??
      grant.status;
    };

  const getCommercialAccessType =
    (
      doctor: Doctor
    ) => {
      if (
        doctor.complimentary_access
      ) {
        return commercialCopy
          .adminComplimentary;
      }

      if (
        doctor.subscription_payer ===
        "clinic"
      ) {
        return commercialCopy
          .clinicCoverage;
      }

      if (
        doctor.subscription
          ?.stripe_subscription_id
      ) {
        return commercialCopy
          .stripeSubscription;
      }

      return commercialCopy
        .noCommercialAccess;
    };

  return (
    <div className="space-y-[21px]">
      <section className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label:
              copy.doctors.metrics
                .total,
            value:
              doctors.length,
            className:
              "text-gray-900",
          },
          {
            label:
              copy.doctors.metrics
                .active,
            value:
              activeCount,
            className:
              "text-emerald-700",
          },
          {
            label:
              copy.doctors.metrics
                .suspended,
            value:
              suspendedCount,
            className:
              "text-gray-700",
          },
          {
            label:
              copy.doctors.metrics
                .verified,
            value:
              verifiedCount,
            className:
              "text-blue-700",
          },
          {
            label:
              copy.doctors.metrics
                .attention,
            value:
              attentionCount,
            className:
              "text-amber-800",
          },
        ].map(
          (
            metric
          ) => (
            <div
              key={
                metric.label
              }
              className="rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm"
            >
              <p className="text-sm font-semibold text-gray-500">
                {
                  metric.label
                }
              </p>
              <p
                className={`mt-[8px] text-3xl font-bold ${metric.className}`}
              >
                {
                  metric.value
                }
              </p>
            </div>
          )
        )}
      </section>

      <details
        open
        className="group rounded-[13px] border border-gray-200 bg-white shadow-sm"
      >
        <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] rounded-[13px] p-[21px]">
          <div>
            <h2 className="text-lg font-bold text-gray-950">
              {
                copy.doctors.filters
                  .title
              }
            </h2>
            <p className="mt-[5px] text-sm text-gray-600">
              {
                copy.doctors.filters
                  .description
              }
            </p>
          </div>
          <span
            aria-hidden="true"
            className="text-xl text-gray-500 transition group-open:rotate-180"
          >
            ⌄
          </span>
        </summary>

        <div className="border-t border-gray-200 p-[21px]">
          <div className="grid gap-[13px] xl:grid-cols-[minmax(15rem,1fr)_repeat(5,minmax(9rem,12rem))]">
            <label>
              <span className="sr-only">
                {
                  copy.doctors.filters
                    .searchLabel
                }
              </span>
              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder={
                  copy.doctors.filters
                    .searchPlaceholder
                }
                className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
              />
            </label>

            <label>
              <span className="sr-only">
                {
                  copy.doctors.filters
                    .doctorStatus
                }
              </span>
              <select
                value={
                  doctorStatus
                }
                onChange={(
                  event
                ) =>
                  setDoctorStatus(
                    event.target
                      .value as
                      DoctorStatusFilter
                  )
                }
                className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="all">
                  {
                    copy.doctors.filters
                      .allProfiles
                  }
                </option>
                <option value="active">
                  {
                    copy.doctors.filters
                      .profileActive
                  }
                </option>
                <option value="suspended">
                  {
                    copy.doctors.filters
                      .profileSuspended
                  }
                </option>
              </select>
            </label>

            <label>
              <span className="sr-only">
                {
                  copy.doctors.filters
                    .accountStatus
                }
              </span>
              <select
                value={
                  accountStatus
                }
                onChange={(
                  event
                ) =>
                  setAccountStatus(
                    event.target
                      .value as
                      AccountStatusFilter
                  )
                }
                className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="all">
                  {
                    copy.doctors.filters
                      .allAccounts
                  }
                </option>
                <option value="active">
                  {
                    copy.doctors.filters
                      .accountActive
                  }
                </option>
                <option value="suspended">
                  {
                    copy.doctors.filters
                      .accountSuspended
                  }
                </option>
                <option value="blocked">
                  {
                    copy.doctors.filters
                      .accountBlocked
                  }
                </option>
              </select>
            </label>

            <label>
              <span className="sr-only">
                {
                  copy.doctors.filters
                    .subscriptionStatus
                }
              </span>
              <select
                value={
                  subscriptionStatus
                }
                onChange={(
                  event
                ) =>
                  setSubscriptionStatus(
                    event.target
                      .value as
                      SubscriptionFilter
                  )
                }
                className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="all">
                  {
                    copy.doctors.filters
                      .allSubscriptions
                  }
                </option>
                <option value="active">
                  {
                    copy.doctors.filters
                      .subscriptionActive
                  }
                </option>
                <option value="trialing">
                  {
                    copy.doctors.filters
                      .subscriptionTrialing
                  }
                </option>
                <option value="past_due">
                  {
                    copy.doctors.filters
                      .subscriptionPastDue
                  }
                </option>
                <option value="canceled">
                  {
                    copy.doctors.filters
                      .subscriptionCanceled
                  }
                </option>
                <option value="none">
                  {
                    copy.doctors.filters
                      .subscriptionNone
                  }
                </option>
              </select>
            </label>

            <label>
              <span className="sr-only">
                {
                  copy.doctors.filters
                    .payer
                }
              </span>
              <select
                value={
                  payerFilter
                }
                onChange={(
                  event
                ) =>
                  setPayerFilter(
                    event.target
                      .value as
                      PayerFilter
                  )
                }
                className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="all">
                  {
                    copy.doctors.filters
                      .allPayers
                  }
                </option>
                <option value="doctor">
                  {
                    copy.doctors.filters
                      .payerDoctor
                  }
                </option>
                <option value="clinic">
                  {
                    copy.doctors.filters
                      .payerClinic
                  }
                </option>
              </select>
            </label>

            <label>
              <span className="sr-only">
                {
                  copy.doctors.filters
                    .verification
                }
              </span>
              <select
                value={
                  verificationStatus
                }
                onChange={(
                  event
                ) =>
                  setVerificationStatus(
                    event.target
                      .value as
                      VerificationFilter
                  )
                }
                className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="all">
                  {
                    copy.doctors.filters
                      .allVerifications
                  }
                </option>
                <option value="verified">
                  {
                    copy.doctors.filters
                      .verificationVerified
                  }
                </option>
                <option value="pending">
                  {
                    copy.doctors.filters
                      .verificationPending
                  }
                </option>
                <option value="not_submitted">
                  {
                    copy.doctors.filters
                      .verificationNotSubmitted
                  }
                </option>
                <option value="rejected">
                  {
                    copy.doctors.filters
                      .verificationRejected
                  }
                </option>
                <option value="expired">
                  {
                    copy.doctors.filters
                      .verificationExpired
                  }
                </option>
              </select>
            </label>
          </div>

          <div className="mt-[13px] flex flex-wrap items-center justify-between gap-[13px]">
            <p className="text-xs text-gray-500">
              {interpolatePlatformDoctorCopy(
                copy.common.showing,
                {
                  filtered:
                    filteredDoctors.length,
                  total:
                    doctors.length,
                }
              )}
            </p>

            <button
              type="button"
              onClick={
                resetFilters
              }
              className="romdoc-focus-ring rounded-[8px] px-[13px] py-[8px] text-sm font-semibold text-[#036661] hover:bg-emerald-50"
            >
              {
                copy.common
                  .resetFilters
              }
            </button>
          </div>
        </div>
      </details>

      {error && (
        <div
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
        >
          {success}
        </div>
      )}

      <section className="overflow-hidden rounded-[13px] border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-[21px] text-sm text-gray-600">
            {
              copy.doctors.states
                .loading
            }
          </div>
        ) : filteredDoctors.length ===
          0 ? (
          <div className="p-[21px] text-sm text-gray-600">
            {
              copy.doctors.states
                .empty
            }
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDoctors.map(
              (
                doctor
              ) => {
                const expanded =
                  expandedDoctorId ===
                  doctor.id;

                const changing =
                  changingDoctorId ===
                  doctor.id;

                const specialties =
                  getSpecialties(
                    doctor
                  );

                const profileAccountStatus =
                  doctor.profile
                    ?.account_status ??
                  "active";

                const doctorStatusLabel =
                  (
                    copy.doctors
                      .doctorStatuses as
                      Record<
                        string,
                        string
                      >
                  )[
                    doctor.status
                  ] ??
                  copy.common
                    .unknown;

                const accountStatusLabel =
                  (
                    copy.doctors
                      .accountStatuses as
                      Record<
                        string,
                        string
                      >
                  )[
                    profileAccountStatus
                  ] ??
                  copy.common
                    .unknown;

                const complimentaryAccess =
                  doctor.complimentary_access;

                const stripeActivated =
                  Boolean(
                    doctor.subscription
                      ?.stripe_subscription_id
                  );

                return (
                  <article
                    key={
                      doctor.id
                    }
                    className="p-[21px]"
                  >
                    <div className="grid gap-[13px] lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_auto] lg:items-center">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {getDoctorName(
                            doctor
                          )}
                        </h2>

                        <p className="mt-[5px] text-sm text-gray-600">
                          {getDoctorTitle(
                            doctor
                          )}
                        </p>

                        <p className="mt-[5px] text-xs text-gray-500">
                          {doctor.auth_email ??
                            copy.doctors
                              .labels
                              .emailUnavailable}
                        </p>

                        <div className="mt-[8px] flex flex-wrap gap-[8px]">
                          <span className="rounded-full bg-teal-50 px-[13px] py-[5px] text-xs font-semibold text-[#036661]">
                            {getDoctorTypeLabel(
                              doctor
                            )}
                          </span>

                          {specialties.map(
                            (
                              specialty
                            ) => (
                              <span
                                key={
                                  specialty
                                }
                                className="rounded-full bg-gray-100 px-[13px] py-[5px] text-xs text-gray-700"
                              >
                                {
                                  specialty
                                }
                              </span>
                            )
                          )}
                        </div>

                        {doctor
                          .clinic_organization_name && (
                          <p className="mt-[8px] text-xs text-gray-600">
                            {
                              copy.doctors
                                .labels
                                .organization
                            }
                            :{" "}
                            {
                              doctor
                                .clinic_organization_name
                            }
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          {
                            copy.doctors
                              .labels
                              .doctorProfile
                          }
                        </p>
                        <span
                          className={`mt-[8px] inline-flex rounded-full px-[13px] py-[5px] text-xs font-semibold ${getStatusClasses(
                            doctor.status
                          )}`}
                        >
                          {
                            doctorStatusLabel
                          }
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          {
                            copy.doctors
                              .labels
                              .userAccount
                          }
                        </p>
                        <span
                          className={`mt-[8px] inline-flex rounded-full px-[13px] py-[5px] text-xs font-semibold ${getStatusClasses(
                            profileAccountStatus
                          )}`}
                        >
                          {
                            accountStatusLabel
                          }
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          {
                            copy.doctors
                              .labels
                              .payer
                          }
                        </p>
                        <p className="mt-[8px] font-semibold text-gray-900">
                          {getSubscriptionPayerLabel(
                            doctor
                          )}
                        </p>
                        <p className="mt-[5px] text-xs text-gray-500">
                          {getSubscriptionLabel(
                            doctor.subscription,
                            doctor
                          )}
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={() =>
                          setExpandedDoctorId(
                            expanded
                              ? null
                              : doctor.id
                          )
                        }
                        variant="secondary"
                        size="sm"
                      >
                        {expanded
                          ? copy.doctors
                              .actions
                              .hideDetails
                          : copy.doctors
                              .actions
                              .showDetails}
                      </Button>
                    </div>

                    {expanded && (
                      <div className="mt-[21px] border-t border-gray-200 pt-[21px]">
                        <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-[13px] bg-gray-50 p-[13px]">
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              {
                                copy.doctors
                                  .labels
                                  .verification
                              }
                            </p>
                            <p className="mt-[8px] font-semibold text-gray-900">
                              {getVerificationLabel(
                                doctor.verification_status
                              )}
                            </p>
                            <p className="mt-[5px] text-xs text-gray-500">
                              {
                                copy.doctors
                                  .labels
                                  .registrationNumber
                              }
                              :{" "}
                              {doctor
                                .professional_registration_number ??
                                copy.common
                                  .none}
                            </p>
                            <p className="mt-[5px] text-xs text-gray-500">
                              {
                                copy.doctors
                                  .labels
                                  .expires
                              }
                              :{" "}
                              {formatDate(
                                doctor.verification_expires_at
                              )}
                            </p>
                          </div>

                          <div className="rounded-[13px] bg-gray-50 p-[13px]">
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              {
                                copy.doctors
                                  .labels
                                  .clinics
                              }
                            </p>
                            <p className="mt-[8px] text-2xl font-bold text-gray-900">
                              {
                                doctor.clinic_count
                              }
                            </p>
                          </div>

                          <div className="rounded-[13px] bg-gray-50 p-[13px]">
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              {
                                copy.doctors
                                  .labels
                                  .activeStaff
                              }
                            </p>
                            <p className="mt-[8px] text-2xl font-bold text-gray-900">
                              {
                                doctor.active_staff_count
                              }
                            </p>
                          </div>

                          <div className="rounded-[13px] bg-gray-50 p-[13px]">
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              {
                                copy.doctors
                                  .labels
                                  .rating
                              }
                            </p>
                            <p className="mt-[8px] font-semibold text-gray-900">
                              {Number(
                                doctor.average_rating
                              ).toFixed(
                                1
                              )}{" "}
                              / 5
                            </p>
                            <p className="mt-[5px] text-xs text-gray-500">
                              {interpolatePlatformDoctorCopy(
                                copy.doctors
                                  .labels
                                  .reviews,
                                {
                                  count:
                                    doctor.review_count,
                                }
                              )}
                            </p>
                          </div>
                        </div>

                        <details className="group mt-[21px] rounded-[13px] border border-gray-200 bg-gray-50">
                          <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] rounded-[13px] p-[13px]">
                            <h3 className="font-semibold text-gray-900">
                              {
                                copy.doctors
                                  .labels
                                  .commercialDetails
                              }
                            </h3>
                            <span
                              aria-hidden="true"
                              className="text-lg text-gray-500 transition group-open:rotate-180"
                            >
                              ⌄
                            </span>
                          </summary>

                          <dl className="grid gap-[13px] border-t border-gray-200 p-[13px] sm:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  copy.doctors
                                    .labels
                                    .accountType
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {getDoctorTypeLabel(
                                  doctor
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  copy.doctors
                                    .labels
                                    .subscriptionPayer
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {getSubscriptionPayerLabel(
                                  doctor
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  copy.doctors
                                    .labels
                                    .clinicOrganization
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {doctor
                                  .clinic_organization_name ??
                                  copy.common
                                    .none}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  commercialCopy
                                    .accessType
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {getCommercialAccessType(
                                  doctor
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  commercialCopy
                                    .complimentaryStatus
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {getComplimentaryStatusLabel(
                                  complimentaryAccess
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  commercialCopy
                                    .complimentaryStart
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {formatDate(
                                  complimentaryAccess
                                    ?.starts_at ??
                                    null
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  commercialCopy
                                    .complimentaryEnd
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {formatDate(
                                  complimentaryAccess
                                    ?.ends_at ??
                                    null
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  copy.doctors
                                    .labels
                                    .plan
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {doctor
                                  .subscription
                                  ?.billing_interval ===
                                "yearly"
                                  ? copy
                                      .doctors
                                      .labels
                                      .annual
                                  : doctor.subscription
                                    ? copy
                                        .doctors
                                        .labels
                                        .monthly
                                    : doctor.subscription_payer ===
                                        "clinic"
                                      ? copy
                                          .doctors
                                          .labels
                                          .clinicCovered
                                      : copy
                                          .common
                                          .none}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  commercialCopy
                                    .stripeActivation
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {doctor.subscription_payer ===
                                "clinic"
                                  ? copy
                                      .doctors
                                      .labels
                                      .clinicNotApplicable
                                  : stripeActivated
                                    ? commercialCopy
                                        .stripeActivated
                                    : commercialCopy
                                        .stripeNotActivated}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  copy.doctors
                                    .labels
                                    .stripeStatus
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {doctor.subscription_payer ===
                                "clinic"
                                  ? copy
                                      .doctors
                                      .labels
                                      .clinicNotApplicable
                                  : doctor
                                      .subscription
                                      ?.status ??
                                    copy
                                      .common
                                      .none}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  commercialCopy
                                    .stripePeriodStart
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {formatDate(
                                  doctor
                                    .subscription
                                    ?.current_period_start ??
                                    null
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                {
                                  commercialCopy
                                    .stripePeriodEnd
                                }
                              </dt>
                              <dd className="mt-[5px] font-medium">
                                {formatDate(
                                  doctor
                                    .subscription
                                    ?.current_period_end ??
                                    null
                                )}
                              </dd>
                            </div>
                          </dl>
                        </details>

                        <div className="mt-[21px] rounded-[13px] border border-blue-100 bg-blue-50 p-[13px] text-sm leading-6 text-blue-900">
                          {
                            copy.doctors
                              .labels
                              .publicResponsibility
                          }
                        </div>

                        <details className="group mt-[21px] rounded-[13px] border border-gray-200 bg-white">
                          <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] rounded-[13px] p-[13px]">
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {
                                  copy.doctors
                                    .labels
                                    .clinicAssociations
                                }
                              </h3>
                              <p className="mt-[5px] text-xs text-gray-500">
                                {
                                  copy.doctors
                                    .labels
                                    .clinicAssociationsDeferred
                                }
                              </p>
                            </div>
                            <span
                              aria-hidden="true"
                              className="text-lg text-gray-500 transition group-open:rotate-180"
                            >
                              ⌄
                            </span>
                          </summary>

                          <div className="border-t border-gray-200 p-[13px]">
                            <AdminDoctorClinicsInline
                              doctorId={
                                doctor.id
                              }
                            />
                          </div>
                        </details>

                        <div className="mt-[21px] flex flex-wrap gap-[13px]">
                          <Link
                            href={`/doctor/${doctor.slug}`}
                            target="_blank"
                            className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[8px] text-sm font-semibold hover:bg-gray-50"
                          >
                            {
                              copy.common
                                .publicProfile
                            }
                          </Link>

                          {doctor.status ===
                          "active" ? (
                            <Button
                              type="button"
                              disabled={
                                changing
                              }
                              onClick={() =>
                                updateDoctorStatus(
                                  doctor,
                                  "suspended"
                                )
                              }
                              variant="secondary"
                              size="sm"
                            >
                              {
                                copy.doctors
                                  .actions
                                  .suspendProfile
                              }
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={
                                changing
                              }
                              onClick={() =>
                                updateDoctorStatus(
                                  doctor,
                                  "active"
                                )
                              }
                              size="sm"
                            >
                              {
                                copy.doctors
                                  .actions
                                  .reactivateProfile
                              }
                            </Button>
                          )}

                          {profileAccountStatus !==
                          "blocked" ? (
                            <Button
                              type="button"
                              disabled={
                                changing
                              }
                              onClick={() =>
                                updateAccountStatus(
                                  doctor,
                                  "blocked"
                                )
                              }
                              variant="danger-outline"
                              size="sm"
                            >
                              {
                                copy.doctors
                                  .actions
                                  .blockAccount
                              }
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={
                                changing
                              }
                              onClick={() =>
                                updateAccountStatus(
                                  doctor,
                                  "active"
                                )
                              }
                              size="sm"
                            >
                              {
                                copy.doctors
                                  .actions
                                  .unblockAccount
                              }
                            </Button>
                          )}

                          {doctor.verification_status !==
                          "verified" ? (
                            <Button
                              type="button"
                              disabled={
                                changing
                              }
                              onClick={() =>
                                verifyDoctor(
                                  doctor
                                )
                              }
                              size="sm"
                            >
                              {
                                copy.doctors
                                  .actions
                                  .verify
                              }
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={
                                changing
                              }
                              onClick={() =>
                                removeVerification(
                                  doctor
                                )
                              }
                              variant="danger-outline"
                              size="sm"
                            >
                              {
                                copy.doctors
                                  .actions
                                  .removeVerification
                              }
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}
