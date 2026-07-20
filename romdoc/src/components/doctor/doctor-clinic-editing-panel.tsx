"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import GooglePlaceAutocomplete from "@/components/clinic/google-place-autocomplete";
import useDoctorGooglePlaceCopy from "@/components/doctor/use-doctor-google-place-copy";
import {
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import type {
  GoogleClinicAddress,
} from "@/lib/locations/google-address";

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

  google_maps_uri:
    | string
    | null;

  updated_at:
    string;

  clinic_translations:
    | ClinicTranslation[]
    | null;

  cities:
    | CityRelation
    | CityRelation[]
    | null;
};

type EditableClinicsResponse = {
  clinics?:
    Clinic[];

  clinic?:
    Clinic;

  message?: string;
  error?: string;
};

type Draft = {
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  addressLine2: string;
};

type DoctorClinicEditingPanelProps = {
  title: string;
  description: string;
  emptyMessage: string;
};

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

  return Array.isArray(
    relation
  )
    ? relation[0] ??
        null
    : relation;
}

function getRomanianTranslation(
  clinic:
    Clinic
) {
  return (
    clinic
      .clinic_translations
      ?.find(
        (
          translation
        ) =>
          translation.locale ===
          "ro"
      ) ??
    clinic
      .clinic_translations
      ?.[0] ??
    null
  );
}

function getEditableName(
  clinic:
    Clinic
) {
  return (
    getRomanianTranslation(
      clinic
    )?.name ??
    clinic.slug
  );
}

function getEditableDescription(
  clinic:
    Clinic
) {
  return (
    getRomanianTranslation(
      clinic
    )?.description ??
    ""
  );
}

function getStatusClasses(
  status:
    string
) {
  switch (
    status
  ) {
    case "approved":
      return "bg-green-100 text-green-800";

    case "pending":
      return "bg-amber-100 text-amber-900";

    case "rejected":
      return "bg-red-100 text-red-800";

    case "blocked":
      return "bg-slate-200 text-slate-900";

    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function DoctorClinicEditingPanel({
  title,
  description,
  emptyMessage,
}: DoctorClinicEditingPanelProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorConfiguration.clinicEditor"
    );

  const placeCopy =
    useDoctorGooglePlaceCopy();

  const [
    clinics,
    setClinics,
  ] =
    useState<
      Clinic[]
    >(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    success,
    setSuccess,
  ] =
    useState(
      ""
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const [
    editingClinicId,
    setEditingClinicId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    draft,
    setDraft,
  ] =
    useState<
      Draft | null
    >(
      null
    );

  const [
    selectedAddress,
    setSelectedAddress,
  ] =
    useState<
      GoogleClinicAddress | null
    >(
      null
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(
      false
    );

  function displayClinicName(
    clinic:
      Clinic
  ) {
    return (
      selectTranslation(
        clinic
          .clinic_translations,
        locale
      )?.name ??
      clinic.slug
    );
  }

  function cityName(
    clinic:
      Clinic
  ) {
    const city =
      getFirstRelation(
        clinic.cities
      );

    return (
      selectTranslation(
        city
          ?.city_translations,
        locale
      )?.name ??
      city?.slug ??
      t(
        "unknownCity"
      )
    );
  }

  function statusLabel(
    status:
      string
  ) {
    if (
      [
        "approved",
        "pending",
        "rejected",
        "blocked",
      ].includes(
        status
      )
    ) {
      return t(
        `statuses.${status}`
      );
    }

    return status;
  }

  const loadClinics =
    useCallback(
      async () => {
        setIsLoading(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await fetch(
              "/api/clinics/editable",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as
              EditableClinicsResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              locale ===
                "ro" &&
              result.error
                ? result.error
                : t(
                    "loadError"
                  )
            );
          }

          setClinics(
            result.clinics ??
            []
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : t(
                  "loadError"
                )
          );

          setClinics(
            []
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        locale,
        t,
      ]
    );

  useEffect(() => {
    void loadClinics();
  }, [
    loadClinics,
  ]);

  const visibleClinics =
    useMemo(
      () => {
        const normalizedSearch =
          search
            .normalize(
              "NFD"
            )
            .replace(
              /[\u0300-\u036f]/g,
              ""
            )
            .toLocaleLowerCase(
              locale
            )
            .trim();

        if (
          !normalizedSearch
        ) {
          return clinics;
        }

        return clinics.filter(
          (
            clinic
          ) => {
            const haystack =
              [
                displayClinicName(
                  clinic
                ),
                cityName(
                  clinic
                ),
                clinic
                  .formatted_address ??
                  "",
                clinic.phone ??
                  "",
                clinic.email ??
                  "",
              ]
                .join(
                  " "
                )
                .normalize(
                  "NFD"
                )
                .replace(
                  /[\u0300-\u036f]/g,
                  ""
                )
                .toLocaleLowerCase(
                  locale
                );

            return haystack.includes(
              normalizedSearch
            );
          }
        );
      },
      [
        clinics,
        locale,
        search,
      ]
    );

  function startEditing(
    clinic:
      Clinic
  ) {
    setEditingClinicId(
      clinic.id
    );

    setDraft({
      name:
        getEditableName(
          clinic
        ),

      description:
        getEditableDescription(
          clinic
        ),

      phone:
        clinic.phone ??
        "",

      email:
        clinic.email ??
        "",

      website:
        clinic.website ??
        "",

      addressLine2:
        clinic
          .address_line_2 ??
        "",
    });

    setSelectedAddress(
      null
    );

    setError(
      ""
    );

    setSuccess(
      ""
    );
  }

  function stopEditing() {
    setEditingClinicId(
      null
    );

    setDraft(
      null
    );

    setSelectedAddress(
      null
    );
  }

  function updateDraft(
    field:
      keyof Draft,
    value:
      string
  ) {
    setDraft(
      (
        current
      ) =>
        current
          ? {
              ...current,
              [field]:
                value,
            }
          : current
    );
  }

  async function submitEdit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !editingClinicId ||
      !draft
    ) {
      return;
    }

    setIsSaving(
      true
    );

    setError(
      ""
    );

    setSuccess(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/clinics/editable",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                clinicId:
                  editingClinicId,

                name:
                  draft.name,

                description:
                  draft.description,

                phone:
                  draft.phone,

                email:
                  draft.email,

                website:
                  draft.website,

                addressLine2:
                  draft
                    .addressLine2,

                placeId:
                  selectedAddress
                    ?.placeId ??
                  null,
              }),
          }
        );

      const result =
        (await response.json()) as
          EditableClinicsResponse;

      if (
        !response.ok ||
        !result.clinic
      ) {
        throw new Error(
          locale ===
            "ro" &&
          result.error
            ? result.error
            : t(
                "saveError"
              )
        );
      }

      const updatedClinic =
        result.clinic;

      setClinics(
        (
          current
        ) =>
          current.map(
            (
              clinic
            ) =>
              clinic.id ===
              updatedClinic.id
                ? updatedClinic
                : clinic
          )
      );

      setSuccess(
        locale ===
          "ro" &&
        result.message
          ? result.message
          : t(
              "saved"
            )
      );

      stopEditing();
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : t(
              "saveError"
            )
      );
    } finally {
      setIsSaving(
        false
      );
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {t(
              "eyebrow"
            )}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {title}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            {
              description
            }
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadClinics()
          }
          disabled={
            isLoading ||
            isSaving
          }
          className="romdoc-focus-ring w-fit rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t(
            "reload"
          )}
        </button>
      </div>

      <div className="mt-6">
        <label
          htmlFor="doctor-clinic-editor-search"
          className="text-sm font-medium text-gray-900"
        >
          {t(
            "search"
          )}
        </label>

        <input
          id="doctor-clinic-editor-search"
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
          placeholder={t(
            "searchPlaceholder"
          )}
          className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
          {t(
            "loading"
          )}
        </div>
      ) : visibleClinics
          .length ===
        0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          {clinics.length ===
          0
            ? emptyMessage
            : t(
                "noSearchResults"
              )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleClinics.map(
            (
              clinic
            ) => {
              const isEditing =
                editingClinicId ===
                clinic.id;

              return (
                <article
                  key={
                    clinic.id
                  }
                  className="overflow-hidden rounded-2xl border border-gray-200"
                >
                  <div className="flex flex-col justify-between gap-4 bg-gray-50 px-5 py-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {displayClinicName(
                            clinic
                          )}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            clinic.status
                          )}`}
                        >
                          {statusLabel(
                            clinic.status
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-600">
                        {cityName(
                          clinic
                        )}

                        {clinic
                          .formatted_address
                          ? ` — ${clinic.formatted_address}`
                          : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        isEditing
                          ? stopEditing()
                          : startEditing(
                              clinic
                            )
                      }
                      disabled={
                        isSaving
                      }
                      className="romdoc-focus-ring w-fit rounded-xl bg-[#036661] px-4 py-2 text-sm font-semibold text-white hover:bg-[#02534f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isEditing
                        ? t(
                            "close"
                          )
                        : t(
                            "edit"
                          )}
                    </button>
                  </div>

                  <div className="grid gap-4 px-5 py-4 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      [
                        t(
                          "phone"
                        ),
                        clinic.phone ??
                          "—",
                      ],
                      [
                        t(
                          "email"
                        ),
                        clinic.email ??
                          "—",
                      ],
                      [
                        t(
                          "website"
                        ),
                        clinic.website ??
                          "—",
                      ],
                      [
                        t(
                          "addressDetails"
                        ),
                        clinic
                          .address_line_2 ??
                          "—",
                      ],
                    ].map(
                      ([
                        label,
                        value,
                      ]) => (
                        <div
                          key={
                            label
                          }
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {
                              label
                            }
                          </p>

                          <p className="mt-1 break-all">
                            {
                              value
                            }
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  {isEditing &&
                    draft && (
                    <form
                      onSubmit={
                        submitEdit
                      }
                      className="border-t border-gray-200 bg-white px-5 py-5"
                    >
                      <div className="grid gap-5 lg:grid-cols-2">
                        <label className="lg:col-span-2">
                          <span className="text-sm font-medium text-gray-900">
                            {t(
                              "clinicName"
                            )}
                          </span>

                          <span className="ml-2 text-xs text-gray-500">
                            {t(
                              "clinicNameHelp"
                            )}
                          </span>

                          <input
                            type="text"
                            required
                            maxLength={
                              200
                            }
                            value={
                              draft.name
                            }
                            onChange={(
                              event
                            ) =>
                              updateDraft(
                                "name",
                                event.target
                                  .value
                              )
                            }
                            disabled={
                              isSaving
                            }
                            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </label>

                        <label>
                          <span className="text-sm font-medium text-gray-900">
                            {t(
                              "phone"
                            )}
                          </span>

                          <input
                            type="tel"
                            maxLength={
                              50
                            }
                            value={
                              draft.phone
                            }
                            onChange={(
                              event
                            ) =>
                              updateDraft(
                                "phone",
                                event.target
                                  .value
                              )
                            }
                            disabled={
                              isSaving
                            }
                            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </label>

                        <label>
                          <span className="text-sm font-medium text-gray-900">
                            {t(
                              "email"
                            )}
                          </span>

                          <input
                            type="email"
                            maxLength={
                              320
                            }
                            value={
                              draft.email
                            }
                            onChange={(
                              event
                            ) =>
                              updateDraft(
                                "email",
                                event.target
                                  .value
                              )
                            }
                            disabled={
                              isSaving
                            }
                            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </label>

                        <label className="lg:col-span-2">
                          <span className="text-sm font-medium text-gray-900">
                            {t(
                              "website"
                            )}
                          </span>

                          <input
                            type="url"
                            maxLength={
                              500
                            }
                            value={
                              draft.website
                            }
                            onChange={(
                              event
                            ) =>
                              updateDraft(
                                "website",
                                event.target
                                  .value
                              )
                            }
                            placeholder="https://"
                            disabled={
                              isSaving
                            }
                            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </label>

                        <label className="lg:col-span-2">
                          <span className="text-sm font-medium text-gray-900">
                            {t(
                              "additionalAddress"
                            )}
                          </span>

                          <input
                            type="text"
                            maxLength={
                              300
                            }
                            value={
                              draft
                                .addressLine2
                            }
                            onChange={(
                              event
                            ) =>
                              updateDraft(
                                "addressLine2",
                                event.target
                                  .value
                              )
                            }
                            placeholder={t(
                              "additionalAddressPlaceholder"
                            )}
                            disabled={
                              isSaving
                            }
                            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </label>

                        <div className="lg:col-span-2">
                          <p className="text-sm font-medium text-gray-900">
                            {t(
                              "changeGoogleAddress"
                            )}
                          </p>

                          <div className="mt-2">
                            <GooglePlaceAutocomplete
                              onAddressSelected={
                                setSelectedAddress
                              }
                              disabled={
                                isSaving
                              }
                              locale={
                                locale
                              }
                              copy={
                                placeCopy
                              }
                            />
                          </div>

                          {selectedAddress ? (
                            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                              <p className="font-semibold">
                                {t(
                                  "newAddress"
                                )}
                              </p>

                              <p className="mt-1">
                                {
                                  selectedAddress
                                    .formattedAddress
                                }
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs leading-5 text-gray-500">
                              {t(
                                "keepAddress"
                              )}
                            </p>
                          )}
                        </div>

                        <label className="lg:col-span-2">
                          <span className="text-sm font-medium text-gray-900">
                            {t(
                              "description"
                            )}
                          </span>

                          <textarea
                            rows={
                              5
                            }
                            maxLength={
                              3000
                            }
                            value={
                              draft.description
                            }
                            onChange={(
                              event
                            ) =>
                              updateDraft(
                                "description",
                                event.target
                                  .value
                              )
                            }
                            disabled={
                              isSaving
                            }
                            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </label>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={
                            isSaving
                          }
                          className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white hover:bg-[#02534f] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving
                            ? t(
                                "saving"
                              )
                            : t(
                                "save"
                              )}
                        </button>

                        <button
                          type="button"
                          onClick={
                            stopEditing
                          }
                          disabled={
                            isSaving
                          }
                          className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {t(
                            "cancel"
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
