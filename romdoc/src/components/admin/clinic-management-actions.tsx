"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "@/components/ui/button";

type ClinicTranslation = {
  locale: string;
  name: string;
  description: string | null;
};

type CityTranslation = {
  locale: string;
  name: string;
};

type CityRelation = {
  id: string;
  slug: string;
  city_translations:
    | CityTranslation[]
    | null;
};

type ClinicProposer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  doctor_id: string | null;
  doctor_slug: string | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  street_address: string | null;
  formatted_address: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  county_name: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  google_maps_uri: string | null;
  address_verified_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
  clinic_translations:
    | ClinicTranslation[]
    | null;
  cities:
    | CityRelation
    | CityRelation[]
    | null;
  proposer:
    | ClinicProposer
    | null;
};

type ClinicCapabilities = {
  canManageClinics: boolean;
  canDeleteClinics: boolean;
  canBlockClinics: boolean;
};

type ClinicsResponse = {
  clinics?: Clinic[];
  capabilities?:
    Partial<ClinicCapabilities>;
  message?: string;
  error?: string;
};

type ClinicStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "blocked";

type ClinicAction =
  | "approve"
  | "reject"
  | "block"
  | "unblock";

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

function getClinicName(
  clinic: Clinic
) {
  return (
    clinic.clinic_translations
      ?.find(
        (translation) =>
          translation.locale ===
          "ro"
      )?.name ??
    clinic.clinic_translations?.[0]
      ?.name ??
    clinic.slug
  );
}

function getClinicDescription(
  clinic: Clinic
) {
  return (
    clinic.clinic_translations
      ?.find(
        (translation) =>
          translation.locale ===
          "ro"
      )?.description ??
    clinic.clinic_translations?.[0]
      ?.description ??
    null
  );
}

function getCityName(
  clinic: Clinic
) {
  const city =
    getFirstRelation(
      clinic.cities
    );

  return (
    city?.city_translations
      ?.find(
        (translation) =>
          translation.locale ===
          "ro"
      )?.name ??
    city?.city_translations?.[0]
      ?.name ??
    city?.slug ??
    "Oraș necunoscut"
  );
}

function getProposerName(
  clinic: Clinic
) {
  const fullName = [
    clinic.proposer?.first_name,
    clinic.proposer?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  if (
    clinic.proposer
      ?.doctor_slug
  ) {
    return clinic.proposer
      .doctor_slug
      .split("-")
      .map(
        (part) =>
          part
            .charAt(0)
            .toUpperCase() +
          part.slice(1)
      )
      .join(" ");
  }

  return "Medic necunoscut";
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "approved":
      return "Aprobată";

    case "rejected":
      return "Respinsă";

    case "blocked":
      return "Blocată";

    default:
      return "În așteptare";
  }
}

function getStatusClasses(
  status: string
) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";

    case "rejected":
      return "bg-red-100 text-red-800";

    case "blocked":
      return "bg-slate-200 text-slate-900";

    default:
      return "bg-amber-100 text-amber-900";
  }
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function normalizeForSearch(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "ro-RO"
    )
    .trim();
}

const statusFilters = [
  {
    value:
      "pending",
    label:
      "În așteptare",
  },
  {
    value:
      "approved",
    label:
      "Aprobate",
  },
  {
    value:
      "rejected",
    label:
      "Respinse",
  },
  {
    value:
      "blocked",
    label:
      "Blocate",
  },
] as const;

export default function ClinicManagementActions() {
  const [
    selectedStatus,
    setSelectedStatus,
  ] =
    useState<ClinicStatus>(
      "pending"
    );

  const [
    clinics,
    setClinics,
  ] =
    useState<Clinic[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    actionClinicId,
    setActionClinicId,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(null);

  const [
    nameFilter,
    setNameFilter,
  ] =
    useState("");

  const [
    cityFilter,
    setCityFilter,
  ] =
    useState("");

  const [
    capabilities,
    setCapabilities,
  ] =
    useState<ClinicCapabilities>({
      canManageClinics:
        true,
      canDeleteClinics:
        false,
      canBlockClinics:
        false,
    });

  const loadClinics =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const query =
          new URLSearchParams({
            status:
              selectedStatus,
          });

        const response =
          await fetch(
            `/api/admin/clinics?${query.toString()}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            ClinicsResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Clinicile nu au putut fi încărcate."
          );
        }

        setClinics(
          result.clinics ??
            []
        );

        setCapabilities({
          canManageClinics:
            result.capabilities
              ?.canManageClinics ??
            true,

          canDeleteClinics:
            result.capabilities
              ?.canDeleteClinics ??
            false,

          canBlockClinics:
            result.capabilities
              ?.canBlockClinics ??
            false,
        });
      } catch (loadError) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Clinicile nu au putut fi încărcate."
        );

        setClinics([]);
      } finally {
        setIsLoading(false);
      }
    }, [selectedStatus]);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  useEffect(() => {
    if (
      selectedStatus !==
      "approved"
    ) {
      setNameFilter("");
      setCityFilter("");
    }
  }, [selectedStatus]);

  const cityOptions =
    useMemo(() => {
      const uniqueCities =
        new Set(
          clinics.map(
            (clinic) =>
              getCityName(
                clinic
              )
          )
        );

      return Array.from(
        uniqueCities
      ).sort(
        (first, second) =>
          first.localeCompare(
            second,
            "ro"
          )
      );
    }, [clinics]);

  const visibleClinics =
    useMemo(() => {
      if (
        selectedStatus !==
        "approved"
      ) {
        return clinics;
      }

      const normalizedName =
        normalizeForSearch(
          nameFilter
        );

      return clinics.filter(
        (clinic) => {
          const nameMatches =
            !normalizedName ||
            normalizeForSearch(
              getClinicName(
                clinic
              )
            ).includes(
              normalizedName
            );

          const cityMatches =
            !cityFilter ||
            getCityName(
              clinic
            ) === cityFilter;

          return (
            nameMatches &&
            cityMatches
          );
        }
      );
    }, [
      cityFilter,
      clinics,
      nameFilter,
      selectedStatus,
    ]);

  const hasApprovedFilters =
    selectedStatus ===
      "approved" &&
    Boolean(
      nameFilter.trim() ||
      cityFilter
    );

  function resetApprovedFilters() {
    setNameFilter("");
    setCityFilter("");
  }

  async function updateClinic(
    clinicId: string,
    action: ClinicAction
  ) {
    setError(null);
    setSuccess(null);

    let rejectionReason = "";
    let blockReason = "";

    if (action === "reject") {
      const enteredReason =
        window.prompt(
          "Introdu motivul respingerii:"
        );

      if (
        !enteredReason ||
        enteredReason.trim()
          .length < 3
      ) {
        return;
      }

      rejectionReason =
        enteredReason.trim();
    }

    if (action === "block") {
      const enteredReason =
        window.prompt(
          "Introdu motivul blocării clinicii:"
        );

      if (
        !enteredReason ||
        enteredReason.trim()
          .length < 3
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Blochezi această clinică? Nu va mai apărea în zonele publice RomDoc."
        );

      if (!confirmed) {
        return;
      }

      blockReason =
        enteredReason.trim();
    }

    if (
      action === "approve"
    ) {
      const confirmed =
        window.confirm(
          "Aprobi această clinică și o asociezi medicului care a propus-o?"
        );

      if (!confirmed) {
        return;
      }
    }

    if (
      action === "unblock"
    ) {
      const confirmed =
        window.confirm(
          "Reactivezi această clinică? Va reveni la statutul Aprobată."
        );

      if (!confirmed) {
        return;
      }
    }

    setActionClinicId(
      clinicId
    );

    try {
      const response =
        await fetch(
          "/api/admin/clinics",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                clinicId,
                action,
                rejectionReason,
                blockReason,
              }),
          }
        );

      const result =
        (await response.json()) as
          ClinicsResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Clinica nu a putut fi actualizată."
        );
      }

      setSuccess(
        result.message ??
          "Clinica a fost actualizată."
      );

      await loadClinics();
    } catch (actionError) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : "Clinica nu a putut fi actualizată."
      );
    } finally {
      setActionClinicId(
        null
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap gap-3">
          {statusFilters.map(
            (filter) => (
              <button
                key={
                  filter.value
                }
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    filter.value
                  )
                }
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedStatus ===
                  filter.value
                    ? "bg-[#D97757] text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {filter.label}
              </button>
            )
          )}
        </div>

        {selectedStatus ===
          "approved" && (
          <div className="mt-5 grid gap-3 border-t border-gray-200 pt-5 md:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)_auto] md:items-end">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Numele clinicii
              </span>

              <input
                type="search"
                value={
                  nameFilter
                }
                onChange={(
                  event
                ) =>
                  setNameFilter(
                    event.target
                      .value
                  )
                }
                placeholder="Caută după nume"
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Oraș
              </span>

              <select
                value={
                  cityFilter
                }
                onChange={(
                  event
                ) =>
                  setCityFilter(
                    event.target
                      .value
                  )
                }
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900"
              >
                <option value="">
                  Toate orașele
                </option>

                {cityOptions.map(
                  (city) => (
                    <option
                      key={city}
                      value={city}
                    >
                      {city}
                    </option>
                  )
                )}
              </select>
            </label>

            <button
              type="button"
              onClick={
                resetApprovedFilters
              }
              disabled={
                !hasApprovedFilters
              }
              className="romdoc-focus-ring min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Resetează
            </button>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          {isLoading
            ? "Se încarcă..."
            : `${visibleClinics.length} ${
                visibleClinics.length ===
                1
                  ? "clinică"
                  : "clinici"
              } afișate`}
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {isLoading ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-gray-600">
            Se încarcă clinicile...
          </p>
        </section>
      ) : clinics.length ===
        0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-gray-600">
            Nu există clinici în această categorie.
          </p>
        </section>
      ) : visibleClinics.length ===
        0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Nu am găsit clinici
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Modifică numele căutat sau selectează alt oraș.
          </p>

          <button
            type="button"
            onClick={
              resetApprovedFilters
            }
            className="romdoc-focus-ring mt-4 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Șterge filtrele
          </button>
        </section>
      ) : (
        <div className="space-y-4">
          {visibleClinics.map(
            (clinic) => {
              const description =
                getClinicDescription(
                  clinic
                );

              const clinicName =
                getClinicName(
                  clinic
                );

              const cityName =
                getCityName(
                  clinic
                );

              const isUpdating =
                actionClinicId ===
                clinic.id;

              return (
                <details
                  key={clinic.id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-gray-50 sm:px-6 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                          {
                            clinicName
                          }
                        </h2>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            clinic.status
                          )}`}
                        >
                          {getStatusLabel(
                            clinic.status
                          )}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-sm text-gray-600">
                        {cityName}
                        {" · "}
                        {clinic.formatted_address ??
                          clinic.street_address ??
                          "Adresă indisponibilă"}
                      </p>
                    </div>

                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180"
                    >
                      <path
                        d="m5 7.5 5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </summary>

                  <div className="border-t border-gray-200 px-5 py-5 sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          Propusă de{" "}
                          <span className="font-semibold text-gray-900">
                            {getProposerName(
                              clinic
                            )}
                          </span>
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Trimisă la{" "}
                          {formatDate(
                            clinic.created_at
                          )}
                        </p>
                      </div>

                      {clinic.status ===
                        "approved" &&
                        clinic.approved_at && (
                        <p className="text-xs text-gray-500">
                          Aprobată la{" "}
                          {formatDate(
                            clinic.approved_at
                          )}
                        </p>
                      )}
                    </div>

                    <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div className="sm:col-span-2">
                        <dt className="font-semibold text-gray-500">
                          Adresă verificată
                        </dt>

                        <dd className="mt-1 text-gray-900">
                          {clinic.formatted_address ??
                            clinic.street_address ??
                            "Adresă indisponibilă"}
                        </dd>

                        {clinic.address_line_2 && (
                          <dd className="mt-1 text-gray-600">
                            {
                              clinic.address_line_2
                            }
                          </dd>
                        )}
                      </div>

                      <div>
                        <dt className="font-semibold text-gray-500">
                          Oraș intern RomDoc
                        </dt>

                        <dd className="mt-1 text-gray-900">
                          {cityName}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-gray-500">
                          Județ
                        </dt>

                        <dd className="mt-1 text-gray-900">
                          {clinic.county_name ??
                            "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-gray-500">
                          Cod poștal
                        </dt>

                        <dd className="mt-1 text-gray-900">
                          {clinic.postal_code ??
                            "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-gray-500">
                          Telefon
                        </dt>

                        <dd className="mt-1 text-gray-900">
                          {clinic.phone ??
                            "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-gray-500">
                          E-mail
                        </dt>

                        <dd className="mt-1 break-all text-gray-900">
                          {clinic.email ??
                            "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-gray-500">
                          Website
                        </dt>

                        <dd className="mt-1 break-all text-gray-900">
                          {clinic.website ? (
                            <a
                              href={
                                clinic.website
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-[#9A4F35] hover:underline"
                            >
                              Deschide website
                            </a>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-gray-500">
                          Adresă verificată la
                        </dt>

                        <dd className="mt-1 text-gray-900">
                          {formatDate(
                            clinic.address_verified_at
                          )}
                        </dd>
                      </div>
                    </dl>

                    {description && (
                      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                        {description}
                      </div>
                    )}

                    {clinic.google_maps_uri && (
                      <a
                        href={
                          clinic.google_maps_uri
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        Deschide în Google Maps
                      </a>
                    )}

                    {clinic.status ===
                      "rejected" &&
                      clinic.rejection_reason && (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        <span className="font-semibold">
                          Motivul respingerii:
                        </span>{" "}
                        {
                          clinic.rejection_reason
                        }
                      </div>
                    )}

                    {clinic.status ===
                      "blocked" && (
                      <div className="mt-5 rounded-xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-900">
                        <p>
                          <span className="font-semibold">
                            Motivul blocării:
                          </span>{" "}
                          {clinic.blocked_reason ??
                            "Motiv indisponibil"}
                        </p>

                        <p className="mt-2 text-xs text-slate-600">
                          Blocată la{" "}
                          {formatDate(
                            clinic.blocked_at
                          )}
                        </p>
                      </div>
                    )}

                    {clinic.status ===
                      "pending" &&
                      capabilities.canManageClinics && (
                      <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-5">
                        <Button
                          type="button"
                          disabled={
                            isUpdating
                          }
                          onClick={() =>
                            void updateClinic(
                              clinic.id,
                              "approve"
                            )
                          }
                          size="sm"
                        >
                          {isUpdating
                            ? "Se actualizează..."
                            : "Aprobă clinica"}
                        </Button>

                        <Button
                          type="button"
                          disabled={
                            isUpdating
                          }
                          onClick={() =>
                            void updateClinic(
                              clinic.id,
                              "reject"
                            )
                          }
                          variant="danger-outline"
                          size="sm"
                        >
                          Respinge
                        </Button>
                      </div>
                    )}

                    {clinic.status ===
                      "approved" &&
                      capabilities.canBlockClinics && (
                      <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-5">
                        <Button
                          type="button"
                          disabled={
                            isUpdating
                          }
                          onClick={() =>
                            void updateClinic(
                              clinic.id,
                              "block"
                            )
                          }
                          variant="danger-outline"
                          size="sm"
                        >
                          {isUpdating
                            ? "Se blochează..."
                            : "Blochează clinica"}
                        </Button>
                      </div>
                    )}

                    {clinic.status ===
                      "blocked" &&
                      capabilities.canBlockClinics && (
                      <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-5">
                        <Button
                          type="button"
                          disabled={
                            isUpdating
                          }
                          onClick={() =>
                            void updateClinic(
                              clinic.id,
                              "unblock"
                            )
                          }
                          size="sm"
                        >
                          {isUpdating
                            ? "Se reactivează..."
                            : "Reactivează clinica"}
                        </Button>
                      </div>
                    )}
                  </div>
                </details>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
