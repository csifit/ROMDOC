"use client";

import Button from "@/components/ui/button";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type ClinicTranslation = {
  locale: string;
  name: string;
  description:
    | string
    | null;
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
  first_name:
    | string
    | null;

  last_name:
    | string
    | null;

  doctor_id:
    | string
    | null;

  doctor_slug:
    | string
    | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;

  email:
    | string
    | null;

  phone:
    | string
    | null;

  website:
    | string
    | null;

  street_address:
    | string
    | null;

  formatted_address:
    | string
    | null;

  address_line_1:
    | string
    | null;

  address_line_2:
    | string
    | null;

  postal_code:
    | string
    | null;

  county_name:
    | string
    | null;

  country_code:
    | string
    | null;

  latitude:
    | number
    | null;

  longitude:
    | number
    | null;

  google_place_id:
    | string
    | null;

  google_maps_uri:
    | string
    | null;

  address_verified_at:
    | string
    | null;

  approved_at:
    | string
    | null;

  rejected_at:
    | string
    | null;

  rejection_reason:
    | string
    | null;

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

type ClinicsResponse = {
  clinics?: Clinic[];
  message?: string;
  error?: string;
};

type ClinicStatus =
  | "pending"
  | "approved"
  | "rejected";

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
  const firstName =
    clinic.proposer
      ?.first_name ??
    "";

  const lastName =
    clinic.proposer
      ?.last_name ??
    "";

  const fullName = [
    firstName,
    lastName,
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

    default:
      return "bg-amber-100 text-amber-900";
  }
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
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

export default function ClinicManagementActions() {
  const [
    selectedStatus,
    setSelectedStatus,
  ] =
    useState<ClinicStatus>(
      "pending"
    );

  const [clinics, setClinics] =
    useState<Clinic[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    actionClinicId,
    setActionClinicId,
  ] = useState<string | null>(
    null
  );

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

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
          result.clinics ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Clinicile nu au putut fi încărcate."
        );
      } finally {
        setIsLoading(false);
      }
    }, [selectedStatus]);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  async function moderateClinic(
    clinicId: string,
    action:
      | "approve"
      | "reject"
  ) {
    setError(null);
    setSuccess(null);

    let rejectionReason = "";

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
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {(
            [
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
            ] as const
          ).map((filter) => (
            <button
              key={filter.value}
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
          ))}
        </div>
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
      ) : clinics.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-gray-600">
            Nu există clinici în această categorie.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {clinics.map(
            (clinic) => {
              const description =
                getClinicDescription(
                  clinic
                );

              const isUpdating =
                actionClinicId ===
                clinic.id;

              return (
                <article
                  key={clinic.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {getClinicName(
                          clinic
                        )}
                      </h2>

                      <p className="mt-1 text-sm text-gray-600">
                        Propusă de{" "}
                        <span className="font-semibold">
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

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        clinic.status
                      )}`}
                    >
                      {getStatusLabel(
                        clinic.status
                      )}
                    </span>
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
                        {getCityName(
                          clinic
                        )}
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
                    "pending" && (
                    <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-5">
                      <Button
                        type="button"
                        disabled={
                          isUpdating
                        }
                        onClick={() =>
                          moderateClinic(
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
                          moderateClinic(
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
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}