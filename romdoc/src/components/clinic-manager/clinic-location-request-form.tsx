"use client";

import {
  type FormEvent,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useRouter,
} from "next/navigation";

import GooglePlaceAutocomplete, {
  type GooglePlaceAutocompleteCopy,
} from "@/components/clinic/google-place-autocomplete";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import type {
  GoogleClinicAddress,
} from "@/lib/locations/google-address";

type ClinicOrganizationOption = {
  id: string;
  name: string;
  status: string;
};

type ClinicLocationRequestFormProps = {
  organizations:
    ClinicOrganizationOption[];
};

type LocationResponse = {
  message?: string;
  error?: string;
};

export default function ClinicLocationRequestForm({
  organizations,
}: ClinicLocationRequestFormProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "ClinicOrganisationDashboard.locationForm"
    );

  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const activeOrganizations =
    useMemo(
      () =>
        organizations.filter(
          (
            organization
          ) =>
            organization.status ===
            "active"
        ),
      [
        organizations,
      ]
    );

  const [
    organizationId,
    setOrganizationId,
  ] =
    useState(
      activeOrganizations[0]
        ?.id ??
      ""
    );

  const [
    name,
    setName,
  ] =
    useState(
      ""
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
    addressLine2,
    setAddressLine2,
  ] =
    useState(
      ""
    );

  const [
    phone,
    setPhone,
  ] =
    useState(
      ""
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      ""
    );

  const [
    website,
    setWebsite,
  ] =
    useState(
      ""
    );

  const [
    description,
    setDescription,
  ] =
    useState(
      ""
    );

  const [
    autocompleteVersion,
    setAutocompleteVersion,
  ] =
    useState(
      0
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(
      null
    );

  const googleCopy =
    useMemo<GooglePlaceAutocompleteCopy>(
      () => ({
        placeholder:
          t(
            "google.placeholder"
          ),

        importUnavailable:
          t(
            "google.importUnavailable"
          ),

        elementUnavailable:
          t(
            "google.elementUnavailable"
          ),

        predictionMissing:
          t(
            "google.predictionMissing"
          ),

        placeIdMissing:
          t(
            "google.placeIdMissing"
          ),

        verifyError:
          t(
            "google.verifyError"
          ),

        loadError:
          t(
            "google.loadError"
          ),

        label:
          t(
            "google.label"
          ),

        help:
          t(
            "google.help"
          ),

        loading:
          t(
            "google.loading"
          ),

        verifying:
          t(
            "google.verifying"
          ),

        selected:
          t(
            "google.selected"
          ),

        city:
          t(
            "google.city"
          ),

        region:
          t(
            "google.region"
          ),

        postalCode:
          t(
            "google.postalCode"
          ),

        country:
          t(
            "google.country"
          ),
      }),
      [
        t,
      ]
    );

  const handleAddressSelected =
    useCallback(
      (
        address:
          GoogleClinicAddress
      ) => {
        setSelectedAddress(
          address
        );

        setError(
          null
        );
      },
      []
    );

  function resetForm() {
    setName(
      ""
    );

    setSelectedAddress(
      null
    );

    setAddressLine2(
      ""
    );

    setPhone(
      ""
    );

    setEmail(
      ""
    );

    setWebsite(
      ""
    );

    setDescription(
      ""
    );

    setAutocompleteVersion(
      (
        current
      ) =>
        current +
        1
    );
  }

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

    setSuccess(
      null
    );

    if (
      !organizationId
    ) {
      setError(
        t(
          "validation.organization"
        )
      );

      return;
    }

    if (
      name.trim().length <
      2
    ) {
      setError(
        t(
          "validation.name"
        )
      );

      return;
    }

    if (
      !selectedAddress
    ) {
      setError(
        t(
          "validation.address"
        )
      );

      return;
    }

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/clinic-manager/locations",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    organizationId,

                    name:
                      name.trim(),

                    placeId:
                      selectedAddress.placeId,

                    addressLine2:
                      addressLine2.trim(),

                    phone:
                      phone.trim(),

                    email:
                      email.trim(),

                    website:
                      website.trim(),

                    description:
                      description.trim(),

                    locale,
                  }),
              }
            );

          const result =
            (await response.json()) as
              LocationResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              locale ===
                "ro" &&
              result.error
                ? result.error
                : t(
                    "error"
                  )
            );
          }

          setSuccess(
            locale ===
              "ro" &&
            result.message
              ? result.message
              : t(
                  "success"
                )
          );

          resetForm();

          router.refresh();
        } catch (
          submitError
        ) {
          setError(
            submitError instanceof
              Error
              ? submitError.message
              : t(
                  "error"
                )
          );
        }
      }
    );
  }

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <div>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {t(
            "eyebrow"
          )}
        </p>

        <h2 className="mt-[5px] text-xl font-bold text-gray-900">
          {t(
            "title"
          )}
        </h2>

        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>
      </div>

      {activeOrganizations.length ===
      0 ? (
        <div className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm leading-6 text-amber-900">
          {t(
            "noActiveOrganization"
          )}
        </div>
      ) : (
        <form
          onSubmit={
            handleSubmit
          }
          className="mt-[21px] space-y-[21px]"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "organization"
              )}
            </span>

            <select
              required
              value={
                organizationId
              }
              disabled={
                isPending
              }
              onChange={(
                event
              ) =>
                setOrganizationId(
                  event.target
                    .value
                )
              }
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-900"
            >
              {activeOrganizations.map(
                (
                  organization
                ) => (
                  <option
                    key={
                      organization.id
                    }
                    value={
                      organization.id
                    }
                  >
                    {
                      organization.name
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "locationName"
              )}
            </span>

            <input
              type="text"
              required
              minLength={
                2
              }
              maxLength={
                200
              }
              value={
                name
              }
              disabled={
                isPending
              }
              onChange={(
                event
              ) =>
                setName(
                  event.target
                    .value
                )
              }
              placeholder={t(
                "locationPlaceholder"
              )}
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
            />
          </label>

          <GooglePlaceAutocomplete
            key={
              autocompleteVersion
            }
            disabled={
              isPending
            }
            locale={
              locale
            }
            copy={
              googleCopy
            }
            onAddressSelected={
              handleAddressSelected
            }
          />

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "addressLine2"
              )}
            </span>

            <span className="ml-[8px] text-xs text-gray-500">
              {t(
                "optional"
              )}
            </span>

            <input
              type="text"
              maxLength={
                300
              }
              value={
                addressLine2
              }
              disabled={
                isPending
              }
              onChange={(
                event
              ) =>
                setAddressLine2(
                  event.target
                    .value
                )
              }
              placeholder={t(
                "addressLine2Placeholder"
              )}
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
            />
          </label>

          <div className="grid gap-[21px] sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {t(
                  "phone"
                )}
              </span>

              <span className="ml-[8px] text-xs text-gray-500">
                {t(
                  "optional"
                )}
              </span>

              <input
                type="tel"
                maxLength={
                  50
                }
                value={
                  phone
                }
                disabled={
                  isPending
                }
                onChange={(
                  event
                ) =>
                  setPhone(
                    event.target
                      .value
                  )
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {t(
                  "email"
                )}
              </span>

              <span className="ml-[8px] text-xs text-gray-500">
                {t(
                  "optional"
                )}
              </span>

              <input
                type="email"
                maxLength={
                  320
                }
                value={
                  email
                }
                disabled={
                  isPending
                }
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target
                      .value
                  )
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "website"
              )}
            </span>

            <span className="ml-[8px] text-xs text-gray-500">
              {t(
                "optional"
              )}
            </span>

            <input
              type="url"
              maxLength={
                500
              }
              value={
                website
              }
              disabled={
                isPending
              }
              onChange={(
                event
              ) =>
                setWebsite(
                  event.target
                    .value
                )
              }
              placeholder="https://..."
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "descriptionLabel"
              )}
            </span>

            <span className="ml-[8px] text-xs text-gray-500">
              {t(
                "optional"
              )}
            </span>

            <textarea
              rows={
                4
              }
              maxLength={
                3000
              }
              value={
                description
              }
              disabled={
                isPending
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event.target
                    .value
                )
              }
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm leading-6 text-red-800"
            >
              {
                error
              }
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm leading-6 text-green-800"
            >
              {
                success
              }
            </div>
          )}

          <button
            type="submit"
            disabled={
              isPending
            }
            className="romdoc-focus-ring rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? t(
                  "sending"
                )
              : t(
                  "submit"
                )}
          </button>
        </form>
      )}
    </section>
  );
}
