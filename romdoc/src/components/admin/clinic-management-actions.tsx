"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import Button from "@/components/ui/button";
import type { PlatformOperatorClinicApiPayload } from "@/lib/api/platform-operator-clinic-codes";
import {
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  getPlatformClinicApiMessage,
  getPlatformOperatorClinics,
  interpolatePlatformClinicCopy,
  PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-clinics";

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
  city_translations: CityTranslation[] | null;
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
  status: ClinicStatus;
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
  clinic_translations: ClinicTranslation[] | null;
  cities: CityRelation | CityRelation[] | null;
  proposer: ClinicProposer | null;
};

type ClinicCapabilities = {
  canManageClinics: boolean;
  canDeleteClinics: boolean;
  canBlockClinics: boolean;
};

type StatusCounts = Record<ClinicStatus, number>;

type ClinicsResponse = PlatformOperatorClinicApiPayload & {
  clinics?: Clinic[];
  capabilities?: Partial<ClinicCapabilities>;
  statusCounts?: Partial<StatusCounts>;
};

type ClinicStatus = "pending" | "approved" | "rejected" | "blocked";
type ClinicAction = "approve" | "reject" | "block" | "unblock";

const EMPTY_COUNTS: StatusCounts = {
  pending: 0,
  approved: 0,
  rejected: 0,
  blocked: 0,
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function statusClasses(status: ClinicStatus) {
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

function normalizeSearch(value: string, localeTag: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(localeTag)
    .trim();
}

export default function ClinicManagementActions() {
  const locale = normalizeAppLocale(useLocale());
  const localeTag = PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS[locale];
  const copy = getPlatformOperatorClinics(locale);

  const [selectedStatus, setSelectedStatus] =
    useState<ClinicStatus>("pending");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [actionClinicId, setActionClinicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [capabilities, setCapabilities] = useState<ClinicCapabilities>({
    canManageClinics: true,
    canDeleteClinics: false,
    canBlockClinics: false,
  });

  const statusFilters = useMemo(
    () => [
      { value: "pending" as const, label: copy.moderation.filters.pending },
      { value: "approved" as const, label: copy.moderation.filters.approved },
      { value: "rejected" as const, label: copy.moderation.filters.rejected },
      { value: "blocked" as const, label: copy.moderation.filters.blocked },
    ],
    [copy]
  );

  const getClinicName = useCallback(
    (clinic: Clinic) =>
      selectTranslation(clinic.clinic_translations, locale)?.name ??
      clinic.slug,
    [locale]
  );

  const getClinicDescription = useCallback(
    (clinic: Clinic) =>
      selectTranslation(clinic.clinic_translations, locale)?.description ??
      null,
    [locale]
  );

  const getCityName = useCallback(
    (clinic: Clinic) => {
      const city = firstRelation(clinic.cities);
      return (
        selectTranslation(city?.city_translations, locale)?.name ??
        city?.slug ??
        copy.common.unknownCity
      );
    },
    [copy.common.unknownCity, locale]
  );

  const getProposerName = useCallback(
    (clinic: Clinic) => {
      const fullName = [
        clinic.proposer?.first_name,
        clinic.proposer?.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (fullName) return fullName;

      if (clinic.proposer?.doctor_slug) {
        return clinic.proposer.doctor_slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      }

      return copy.common.unknownDoctor;
    },
    [copy.common.unknownDoctor]
  );

  const getStatusLabel = useCallback(
    (status: ClinicStatus) => {
      switch (status) {
        case "approved":
          return copy.common.statusApproved;
        case "rejected":
          return copy.common.statusRejected;
        case "blocked":
          return copy.common.statusBlocked;
        default:
          return copy.common.statusPending;
      }
    },
    [copy]
  );

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return copy.common.none;
      return new Intl.DateTimeFormat(localeTag, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Bucharest",
      }).format(new Date(value));
    },
    [copy.common.none, localeTag]
  );

  const loadClinics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const query = new URLSearchParams({ status: selectedStatus });
      const response = await fetch(`/api/admin/clinics?${query.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as ClinicsResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.moderation.states.loadFailed
          )
        );
      }

      setClinics(result.clinics ?? []);
      setStatusCounts({
        pending: result.statusCounts?.pending ?? 0,
        approved: result.statusCounts?.approved ?? 0,
        rejected: result.statusCounts?.rejected ?? 0,
        blocked: result.statusCounts?.blocked ?? 0,
      });
      setCapabilities({
        canManageClinics: result.capabilities?.canManageClinics ?? true,
        canDeleteClinics: result.capabilities?.canDeleteClinics ?? false,
        canBlockClinics: result.capabilities?.canBlockClinics ?? false,
      });
    } catch (loadError) {
      setClinics([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.moderation.states.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.moderation.states.loadFailed, locale, selectedStatus]);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  useEffect(() => {
    setSearch("");
    setCityFilter("");
  }, [selectedStatus]);

  const cityOptions = useMemo(() => {
    const values = Array.from(new Set(clinics.map(getCityName)));
    return values.sort((a, b) => a.localeCompare(b, localeTag));
  }, [clinics, getCityName, localeTag]);

  const visibleClinics = useMemo(() => {
    const query = normalizeSearch(search, localeTag);

    return clinics.filter((clinic) => {
      if (cityFilter && getCityName(clinic) !== cityFilter) return false;
      if (!query) return true;

      const haystack = [
        getClinicName(clinic),
        getCityName(clinic),
        getProposerName(clinic),
        clinic.formatted_address,
        clinic.street_address,
        clinic.email,
        clinic.phone,
        clinic.slug,
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeSearch(haystack, localeTag).includes(query);
    });
  }, [
    cityFilter,
    clinics,
    getCityName,
    getClinicName,
    getProposerName,
    localeTag,
    search,
  ]);

  const totalClinics = Object.values(statusCounts).reduce(
    (total, count) => total + count,
    0
  );
  const filtersActive = Boolean(search.trim() || cityFilter);

  async function updateClinic(clinic: Clinic, action: ClinicAction) {
    setError(null);
    setSuccess(null);

    let rejectionReason = "";
    let blockReason = "";

    if (action === "reject") {
      const enteredReason = window.prompt(copy.moderation.prompts.reject);
      if (!enteredReason || enteredReason.trim().length < 3) return;
      rejectionReason = enteredReason.trim();
    }

    if (action === "block") {
      const enteredReason = window.prompt(copy.moderation.prompts.block);
      if (!enteredReason || enteredReason.trim().length < 3) return;
      if (!window.confirm(copy.moderation.confirmations.block)) return;
      blockReason = enteredReason.trim();
    }

    if (
      action === "approve" &&
      !window.confirm(copy.moderation.confirmations.approve)
    ) {
      return;
    }

    if (
      action === "unblock" &&
      !window.confirm(copy.moderation.confirmations.unblock)
    ) {
      return;
    }

    setActionClinicId(clinic.id);

    try {
      const response = await fetch("/api/admin/clinics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: clinic.id,
          action,
          rejectionReason,
          blockReason,
        }),
      });
      const result = (await response.json()) as ClinicsResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.moderation.states.updateFailed
          )
        );
      }

      setSuccess(
        getPlatformClinicApiMessage(
          locale,
          result.code,
          result.message ?? copy.moderation.states.updateFailed
        )
      );
      await loadClinics();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : copy.moderation.states.updateFailed
      );
    } finally {
      setActionClinicId(null);
    }
  }

  return (
    <section className="space-y-[21px]">
      <div className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {copy.moderation.title}
          </h2>
          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {copy.moderation.description}
          </p>
        </div>

        <div className="mt-[21px] grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
          {[
            [copy.moderation.metrics.total, totalClinics],
            [copy.moderation.metrics.pending, statusCounts.pending],
            [copy.moderation.metrics.approved, statusCounts.approved],
            [copy.moderation.metrics.blocked, statusCounts.blocked],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-gray-200 bg-[#F0EEE9] p-[13px]"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </p>
              <p className="mt-[8px] text-2xl font-bold text-gray-900">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-[21px] flex flex-wrap gap-[8px] border-t border-gray-200 pt-[21px]">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSelectedStatus(filter.value)}
              className={`romdoc-focus-ring rounded-xl px-[13px] py-[8px] text-sm font-semibold transition ${
                selectedStatus === filter.value
                  ? "bg-[#D97757] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {filter.label} ({statusCounts[filter.value]})
            </button>
          ))}
        </div>

        <div className="mt-[21px] grid gap-[13px] md:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)_auto] md:items-end">
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.moderation.filters.search}
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.moderation.filters.searchPlaceholder}
              className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[8px] text-sm text-gray-900"
            />
          </label>

          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.moderation.filters.city}
            </span>
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[8px] text-sm text-gray-900"
            >
              <option value="">{copy.moderation.filters.allCities}</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={!filtersActive}
            onClick={() => {
              setSearch("");
              setCityFilter("");
            }}
            className="romdoc-focus-ring min-h-[42px] rounded-xl border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.common.reset}
          </button>
        </div>

        <p className="mt-[13px] text-sm text-gray-500">
          {isLoading
            ? copy.common.loading
            : interpolatePlatformClinicCopy(copy.common.showing, {
                filtered: visibleClinics.length,
                total: clinics.length,
              })}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
        >
          {success}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-[34px] text-sm text-gray-600 shadow-sm">
          {copy.moderation.states.loading}
        </div>
      ) : clinics.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-[34px] text-sm text-gray-600 shadow-sm">
          {copy.moderation.states.empty}
        </div>
      ) : visibleClinics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-[34px] text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            {copy.moderation.states.noResultsTitle}
          </h3>
          <p className="mt-[8px] text-sm text-gray-600">
            {copy.moderation.states.noResultsDescription}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCityFilter("");
            }}
            className="romdoc-focus-ring mt-[13px] rounded-xl border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {copy.common.clearFilters}
          </button>
        </div>
      ) : (
        <div className="space-y-[13px]">
          {visibleClinics.map((clinic) => {
            const clinicName = getClinicName(clinic);
            const cityName = getCityName(clinic);
            const description = getClinicDescription(clinic);
            const isUpdating = actionClinicId === clinic.id;

            return (
              <details
                key={clinic.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] px-[21px] py-[13px] transition hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <h3 className="truncate text-lg font-bold text-gray-900">
                        {clinicName}
                      </h3>
                      <span
                        className={`rounded-full px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                          clinic.status
                        )}`}
                      >
                        {getStatusLabel(clinic.status)}
                      </span>
                    </div>
                    <p className="mt-[5px] truncate text-sm text-gray-600">
                      {cityName} · {clinic.formatted_address ?? clinic.street_address ?? copy.common.addressUnavailable}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-xl text-gray-500 transition-transform group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>

                <div className="border-t border-gray-200 px-[21px] py-[21px]">
                  <div className="flex flex-wrap items-start justify-between gap-[13px]">
                    <div>
                      <p className="text-sm text-gray-600">
                        {copy.moderation.labels.proposer}{" "}
                        <span className="font-semibold text-gray-900">
                          {getProposerName(clinic)}
                        </span>
                      </p>
                      <p className="mt-[5px] text-xs text-gray-500">
                        {interpolatePlatformClinicCopy(copy.common.submittedAt, {
                          date: formatDate(clinic.created_at),
                        })}
                      </p>
                    </div>

                    {clinic.approved_at ? (
                      <p className="text-xs text-gray-500">
                        {interpolatePlatformClinicCopy(copy.common.approvedAt, {
                          date: formatDate(clinic.approved_at),
                        })}
                      </p>
                    ) : null}
                  </div>

                  <dl className="mt-[21px] grid gap-[13px] text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      [copy.moderation.labels.verifiedAddress, clinic.formatted_address ?? clinic.street_address ?? copy.common.addressUnavailable],
                      [copy.moderation.labels.internalCity, cityName],
                      [copy.moderation.labels.county, clinic.county_name ?? copy.common.none],
                      [copy.moderation.labels.postalCode, clinic.postal_code ?? copy.common.none],
                      [copy.moderation.labels.phone, clinic.phone ?? copy.common.none],
                      [copy.moderation.labels.email, clinic.email ?? copy.common.none],
                      [copy.moderation.labels.addressVerifiedAt, formatDate(clinic.address_verified_at)],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl bg-gray-50 p-[13px]">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {label}
                        </dt>
                        <dd className="mt-[5px] break-words text-gray-900">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {description ? (
                    <p className="mt-[21px] rounded-xl bg-gray-50 p-[13px] text-sm leading-6 text-gray-700">
                      {description}
                    </p>
                  ) : null}

                  <div className="mt-[13px] flex flex-wrap gap-[8px]">
                    {clinic.website ? (
                      <a
                        href={clinic.website}
                        target="_blank"
                        rel="noreferrer"
                        className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        {copy.common.openWebsite}
                      </a>
                    ) : null}
                    {clinic.google_maps_uri ? (
                      <a
                        href={clinic.google_maps_uri}
                        target="_blank"
                        rel="noreferrer"
                        className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        {copy.common.openGoogleMaps}
                      </a>
                    ) : null}
                  </div>

                  {clinic.status === "rejected" && clinic.rejection_reason ? (
                    <div className="mt-[21px] rounded-xl border border-red-200 bg-red-50 p-[13px] text-sm text-red-800">
                      <span className="font-semibold">
                        {copy.moderation.labels.rejectionReason}:
                      </span>{" "}
                      {clinic.rejection_reason}
                    </div>
                  ) : null}

                  {clinic.status === "blocked" ? (
                    <div className="mt-[21px] rounded-xl border border-slate-300 bg-slate-100 p-[13px] text-sm text-slate-900">
                      <p>
                        <span className="font-semibold">
                          {copy.moderation.labels.blockReason}:
                        </span>{" "}
                        {clinic.blocked_reason ?? copy.common.none}
                      </p>
                      <p className="mt-[8px] text-xs text-slate-600">
                        {interpolatePlatformClinicCopy(copy.common.blockedAt, {
                          date: formatDate(clinic.blocked_at),
                        })}
                      </p>
                    </div>
                  ) : null}

                  {clinic.status === "pending" && capabilities.canManageClinics ? (
                    <div className="mt-[21px] flex flex-wrap gap-[8px] border-t border-gray-200 pt-[21px]">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => void updateClinic(clinic, "approve")}
                      >
                        {isUpdating
                          ? copy.moderation.actions.updating
                          : copy.moderation.actions.approve}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger-outline"
                        disabled={isUpdating}
                        onClick={() => void updateClinic(clinic, "reject")}
                      >
                        {copy.moderation.actions.reject}
                      </Button>
                    </div>
                  ) : null}

                  {clinic.status === "approved" && capabilities.canBlockClinics ? (
                    <div className="mt-[21px] border-t border-gray-200 pt-[21px]">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger-outline"
                        disabled={isUpdating}
                        onClick={() => void updateClinic(clinic, "block")}
                      >
                        {isUpdating
                          ? copy.moderation.actions.blocking
                          : copy.moderation.actions.block}
                      </Button>
                    </div>
                  ) : null}

                  {clinic.status === "blocked" && capabilities.canBlockClinics ? (
                    <div className="mt-[21px] border-t border-gray-200 pt-[21px]">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => void updateClinic(clinic, "unblock")}
                      >
                        {isUpdating
                          ? copy.moderation.actions.unblocking
                          : copy.moderation.actions.unblock}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
