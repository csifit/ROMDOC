"use client";

import Button from "@/components/ui/button";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

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
  specialty_translations:
    | SpecialtyTranslation[]
    | null;
};

type DoctorSpecialty = {
  specialties:
    | Specialty
    | Specialty[]
    | null;
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
  stripe_customer_id:
    | string
    | null;
  stripe_subscription_id:
    | string
    | null;
  stripe_price_id:
    | string
    | null;
  status: string;
  billing_interval: string;
  current_period_start:
    | string
    | null;
  current_period_end:
    | string
    | null;
  cancel_at_period_end: boolean;
  canceled_at:
    | string
    | null;
  last_payment_at:
    | string
    | null;
};

type Doctor = {
  id: string;
  profile_id: string | null;
  slug: string;
  phone: string | null;
  email: string | null;
  years_experience:
    | number
    | null;
  consultation_price:
    | number
    | string
    | null;
  status: string;
  average_rating:
    | number
    | string;
  review_count: number;
  verification_status: string;
  professional_registration_number:
    | string
    | null;
  verified_at:
    | string
    | null;
  verification_expires_at:
    | string
    | null;
  created_at: string;
  updated_at: string;
  doctor_translations:
    | Translation[]
    | null;
  doctor_specialties:
    | DoctorSpecialty[]
    | null;
  profile:
    | DoctorProfile
    | null;
  auth_email:
    | string
    | null;
  email_verified: boolean;
  subscription:
    | Subscription
    | null;
  clinic_count: number;
  active_staff_count: number;
};

type ApiResponse = {
  doctors?: Doctor[];
  message?: string;
  error?: string;
};

type DoctorStatusFilter =
  | "all"
  | "pending"
  | "active"
  | "suspended"
  | "rejected";

type SubscriptionFilter =
  | "all"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "none";

type VerificationFilter =
  | "all"
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

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

function getDoctorName(
  doctor: Doctor
) {
  const profile =
    doctor.profile;

  const fullName = [
    profile?.first_name,
    profile?.last_name,
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

function getRomanianTitle(
  doctor: Doctor
) {
  return (
    doctor.doctor_translations?.find(
      (translation) =>
        translation.locale === "ro"
    )?.title ??
    doctor.doctor_translations?.[0]
      ?.title ??
    "Medic"
  );
}

function getSpecialties(
  doctor: Doctor
) {
  return (
    doctor.doctor_specialties ??
    []
  )
    .map((relation) => {
      const specialty =
        getFirstRelation(
          relation.specialties
        );

      return (
        specialty?.specialty_translations?.find(
          (translation) =>
            translation.locale ===
            "ro"
        )?.name ??
        specialty?.specialty_translations?.[0]
          ?.name ??
        null
      );
    })
    .filter(
      (
        value
      ): value is string =>
        Boolean(value)
    );
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(new Date(value));
}

function getDoctorStatusLabel(
  status: string
) {
  switch (status) {
    case "active":
      return "Activ";

    case "suspended":
      return "Suspendat";

    case "rejected":
      return "Respins";

    default:
      return "În așteptare";
  }
}

function getVerificationLabel(
  status: string
) {
  switch (status) {
    case "verified":
      return "Verificat";

    case "pending":
      return "În verificare";

    case "rejected":
      return "Respins";

    case "expired":
      return "Expirat";

    default:
      return "Nedepus";
  }
}

function getSubscriptionLabel(
  subscription:
    | Subscription
    | null
) {
  if (!subscription) {
    return "Fără abonament";
  }

  switch (subscription.status) {
    case "active":
      return "Activ";

    case "trialing":
      return "Perioadă de probă";

    case "past_due":
      return "Plată restantă";

    case "canceled":
      return "Anulat";

    case "unpaid":
      return "Neplătit";

    case "paused":
      return "Suspendat";

    default:
      return subscription.status;
  }
}

export default function DoctorsManagement() {
  const [doctors, setDoctors] =
    useState<Doctor[]>([]);

  const [search, setSearch] =
    useState("");

  const [
    doctorStatus,
    setDoctorStatus,
  ] =
    useState<DoctorStatusFilter>(
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

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadDoctors =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/admin/doctors",
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
              "Medicii nu au putut fi încărcați."
          );
        }

        setDoctors(
          result.doctors ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Medicii nu au putut fi încărcați."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

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
            doctorStatus !== "all" &&
            doctor.status !==
              doctorStatus
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

          if (!normalizedSearch) {
            return true;
          }

          return [
            getDoctorName(doctor),
            doctor.slug,
            doctor.auth_email,
            doctor.phone,
            getRomanianTitle(doctor),
            ...getSpecialties(doctor),
          ]
            .filter(Boolean)
            .some((value) =>
              value
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                )
            );
        }
      );
    }, [
      doctors,
      search,
      doctorStatus,
      subscriptionStatus,
      verificationStatus,
    ]);

  async function updateDoctorStatus(
    doctor: Doctor,
    nextStatus: string
  ) {
    const confirmed =
      window.confirm(
        `Schimbi statutul medicului ${getDoctorName(
          doctor
        )} în „${getDoctorStatusLabel(
          nextStatus
        )}”?`
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
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
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

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Statutul medicului nu a putut fi actualizat."
        );
      }

      setSuccess(
        result.message ??
          "Statutul medicului a fost actualizat."
      );

      await loadDoctors();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Statutul medicului nu a putut fi actualizat."
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
        "Introdu numărul de înregistrare profesională:",
        doctor.professional_registration_number ??
          ""
      );

    if (
      !registrationNumber ||
      registrationNumber.trim()
        .length < 2
    ) {
      return;
    }

    const expiry =
      window.prompt(
        "Data expirării verificării, în format YYYY-MM-DD. Lasă necompletat dacă nu expiră:",
        doctor.verification_expires_at
          ? doctor.verification_expires_at.slice(
              0,
              10
            )
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
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              doctorId:
                doctor.id,
              action:
                "set_verification",
              verificationStatus:
                "verified",
              registrationNumber:
                registrationNumber.trim(),
              verificationExpiresAt:
                expiry?.trim() ?? "",
            }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Medicul nu a putut fi verificat."
        );
      }

      setSuccess(
        result.message ??
          "Medicul a fost verificat."
      );

      await loadDoctors();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Medicul nu a putut fi verificat."
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
    const confirmed =
      window.confirm(
        "Elimini verificarea profesională a acestui medic?"
      );

    if (!confirmed) {
      return;
    }

    setChangingDoctorId(
      doctor.id
    );

    try {
      const response =
        await fetch(
          "/api/admin/doctors",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
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

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Verificarea nu a putut fi eliminată."
        );
      }

      setSuccess(
        result.message ??
          "Verificarea a fost eliminată."
      );

      await loadDoctors();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Verificarea nu a putut fi eliminată."
      );
    } finally {
      setChangingDoctorId(
        null
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_13rem_15rem_15rem]">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Caută după nume, e-mail, specialitate sau slug..."
            className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />

          <select
            value={doctorStatus}
            onChange={(event) =>
              setDoctorStatus(
                event.target
                  .value as DoctorStatusFilter
              )
            }
            className="rounded-xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="all">
              Toate statuturile
            </option>
            <option value="active">
              Activi
            </option>
            <option value="pending">
              În așteptare
            </option>
            <option value="suspended">
              Suspendați
            </option>
            <option value="rejected">
              Respinși
            </option>
          </select>

          <select
            value={
              subscriptionStatus
            }
            onChange={(event) =>
              setSubscriptionStatus(
                event.target
                  .value as SubscriptionFilter
              )
            }
            className="rounded-xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="all">
              Toate abonamentele
            </option>
            <option value="active">
              Abonament activ
            </option>
            <option value="trialing">
              Perioadă de probă
            </option>
            <option value="past_due">
              Plată restantă
            </option>
            <option value="canceled">
              Anulat
            </option>
            <option value="none">
              Fără abonament
            </option>
          </select>

          <select
            value={
              verificationStatus
            }
            onChange={(event) =>
              setVerificationStatus(
                event.target
                  .value as VerificationFilter
              )
            }
            className="rounded-xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="all">
              Toate verificările
            </option>
            <option value="verified">
              Verificați
            </option>
            <option value="pending">
              În verificare
            </option>
            <option value="not_submitted">
              Nedepus
            </option>
            <option value="rejected">
              Respinși
            </option>
            <option value="expired">
              Expirați
            </option>
          </select>
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

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-sm text-gray-600">
            Se încarcă medicii...
          </div>
        ) : filteredDoctors.length ===
          0 ? (
          <div className="p-8 text-sm text-gray-600">
            Nu există medici care corespund filtrelor.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDoctors.map(
              (doctor) => {
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

                return (
                  <article
                    key={doctor.id}
                    className="p-5 sm:p-6"
                  >
                    <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto] lg:items-center">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {getDoctorName(
                            doctor
                          )}
                        </h2>

                        <p className="mt-1 text-sm text-gray-600">
                          {getRomanianTitle(
                            doctor
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {doctor.auth_email ??
                            "E-mail indisponibil"}
                        </p>

                        {specialties.length >
                          0 && (
                          <p className="mt-2 text-xs text-gray-600">
                            {specialties.join(
                              ", "
                            )}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Statut
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {getDoctorStatusLabel(
                            doctor.status
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Abonament
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {getSubscriptionLabel(
                            doctor.subscription
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {doctor.subscription
                            ?.billing_interval ===
                          "yearly"
                            ? "Anual"
                            : "Lunar"}
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
                          ? "Închide"
                          : "Detalii"}
                      </Button>
                    </div>

                    {expanded && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Verificare profesională
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                              {getVerificationLabel(
                                doctor.verification_status
                              )}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Număr:{" "}
                              {doctor.professional_registration_number ??
                                "—"}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Expiră:{" "}
                              {formatDate(
                                doctor.verification_expires_at
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Clinici
                            </p>

                            <p className="mt-1 text-2xl font-bold text-gray-900">
                              {
                                doctor.clinic_count
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Personal activ
                            </p>

                            <p className="mt-1 text-2xl font-bold text-gray-900">
                              {
                                doctor.active_staff_count
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Rating
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                              {Number(
                                doctor.average_rating
                              ).toFixed(
                                1
                              )}{" "}
                              din 5
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {
                                doctor.review_count
                              }{" "}
                              recenzii
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 rounded-xl bg-gray-50 p-5">
                          <h3 className="font-semibold text-gray-900">
                            Detalii abonament
                          </h3>

                          <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <dt className="text-xs text-gray-500">
                                Plan
                              </dt>
                              <dd className="mt-1 font-medium">
                                {doctor.subscription
                                  ?.billing_interval ===
                                "yearly"
                                  ? "Anual"
                                  : doctor.subscription
                                      ? "Lunar"
                                      : "—"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                Status Stripe
                              </dt>
                              <dd className="mt-1 font-medium">
                                {doctor.subscription
                                  ?.status ??
                                  "—"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                Sfârșit perioadă
                              </dt>
                              <dd className="mt-1 font-medium">
                                {formatDate(
                                  doctor.subscription
                                    ?.current_period_end ??
                                    null
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                Anulare la final
                              </dt>
                              <dd className="mt-1 font-medium">
                                {doctor.subscription
                                  ?.cancel_at_period_end
                                  ? "Da"
                                  : "Nu"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                Stripe Price ID
                              </dt>
                              <dd className="mt-1 break-all font-mono text-xs">
                                {doctor.subscription
                                  ?.stripe_price_id ??
                                  "—"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-gray-500">
                                Stripe Subscription ID
                              </dt>
                              <dd className="mt-1 break-all font-mono text-xs">
                                {doctor.subscription
                                  ?.stripe_subscription_id ??
                                  "—"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <Link
                            href={`/doctor/${doctor.slug}`}
                            target="_blank"
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                          >
                            Vezi profilul public
                          </Link>

                          {doctor.status !==
                            "active" && (
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
                              Activează
                            </Button>
                          )}

                          {doctor.status ===
                            "active" && (
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
                              Suspendă
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
                              Verifică profesional
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
                              Elimină verificarea
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