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
  PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-clinics";

type ClinicOrganization = {
  id: string;
  name: string;
  status: string;
  contact_email: string | null;
  contact_phone: string | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
  formatted_address: string | null;
  google_maps_uri: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  clinic_translations: Array<{ locale: string; name: string }> | null;
  cities:
    | {
        slug: string | null;
        city_translations: Array<{ locale: string; name: string }> | null;
      }
    | null;
};

type ClinicOrganizationLocation = {
  id: string;
  organization_id: string;
  clinic_id: string;
  status: LocationStatus;
  created_at: string;
  approved_at: string | null;
  clinic_organizations: ClinicOrganization | null;
  clinics: Clinic | null;
};

type LocationStatus = "pending" | "active" | "removed";
type LocationAction = "approve" | "reject";
type StatusCounts = Record<LocationStatus, number>;

type LocationsResponse = PlatformOperatorClinicApiPayload & {
  locations?: ClinicOrganizationLocation[];
  statusCounts?: Partial<StatusCounts>;
};

const EMPTY_COUNTS: StatusCounts = {
  pending: 0,
  active: 0,
  removed: 0,
};

function statusClasses(status: string) {
  switch (status) {
    case "active":
    case "approved":
      return "bg-green-100 text-green-800";
    case "removed":
    case "rejected":
    case "blocked":
      return "bg-red-100 text-red-800";
    default:
      return "bg-amber-100 text-amber-900";
  }
}

export default function ClinicOrganizationLocationApprovals() {
  const locale = normalizeAppLocale(useLocale());
  const localeTag = PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS[locale];
  const copy = getPlatformOperatorClinics(locale);

  const [selectedStatus, setSelectedStatus] =
    useState<LocationStatus>("pending");
  const [locations, setLocations] = useState<ClinicOrganizationLocation[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLocationId, setActionLocationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const clinicName = useCallback(
    (location: ClinicOrganizationLocation) => {
      const clinic = location.clinics;
      if (!clinic) return copy.common.addressUnavailable;
      return (
        selectTranslation(clinic.clinic_translations, locale)?.name ??
        clinic.slug
      );
    },
    [copy.common.addressUnavailable, locale]
  );

  const cityName = useCallback(
    (location: ClinicOrganizationLocation) => {
      const city = location.clinics?.cities;
      return (
        selectTranslation(city?.city_translations, locale)?.name ??
        city?.slug ??
        copy.common.unknownCity
      );
    },
    [copy.common.unknownCity, locale]
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

  const normalize = useCallback(
    (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase(localeTag)
        .trim(),
    [localeTag]
  );

  const loadLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const query = new URLSearchParams({ status: selectedStatus });
      const response = await fetch(
        `/api/admin/clinic-organization-locations?${query.toString()}`,
        { method: "GET", cache: "no-store" }
      );
      const result = (await response.json()) as LocationsResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.locations.states.loadFailed
          )
        );
      }

      setLocations(result.locations ?? []);
      setStatusCounts({
        pending: result.statusCounts?.pending ?? 0,
        active: result.statusCounts?.active ?? 0,
        removed: result.statusCounts?.removed ?? 0,
      });
    } catch (loadError) {
      setLocations([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.locations.states.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.locations.states.loadFailed, locale, selectedStatus]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  async function handleAction(
    organizationClinicId: string,
    action: LocationAction
  ) {
    if (actionLocationId) return;

    const confirmation =
      action === "approve"
        ? copy.locations.confirmations.approve
        : copy.locations.confirmations.reject;

    if (!window.confirm(confirmation)) return;

    try {
      setActionLocationId(organizationClinicId);
      setError(null);
      setSuccess(null);
      const response = await fetch("/api/admin/clinic-organization-locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationClinicId, action }),
      });
      const result = (await response.json()) as LocationsResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.locations.states.actionFailed
          )
        );
      }

      setSuccess(
        getPlatformClinicApiMessage(
          locale,
          result.code,
          result.message ?? copy.locations.states.success
        )
      );
      await loadLocations();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : copy.locations.states.actionFailed
      );
    } finally {
      setActionLocationId(null);
    }
  }

  const visibleLocations = useMemo(() => {
    const query = normalize(search);
    if (!query) return locations;

    return locations.filter((location) =>
      [
        clinicName(location),
        location.clinic_organizations?.name ?? "",
        cityName(location),
        location.clinics?.formatted_address ?? "",
      ].some((value) => normalize(value).includes(query))
    );
  }, [cityName, clinicName, locations, normalize, search]);

  const statusFilters = [
    { value: "pending" as const, label: copy.locations.metrics.pending },
    { value: "active" as const, label: copy.locations.metrics.active },
    { value: "removed" as const, label: copy.locations.metrics.removed },
  ];

  const locationStatusLabel = (status: LocationStatus) =>
    status === "active"
      ? copy.locations.labels.approvedForOrganization
      : status === "removed"
        ? copy.locations.labels.removed
        : copy.locations.labels.underReview;

  const publicStatusLabel = (status: string) =>
    status === "approved"
      ? copy.locations.labels.appearsOnMap
      : status === "blocked"
        ? copy.common.statusBlocked
        : status === "rejected"
          ? copy.common.statusRejected
          : copy.locations.labels.notOnMap;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{copy.locations.title}</h2>
        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.locations.description}
        </p>
      </div>

      <div className="mt-[21px] grid gap-[13px] sm:grid-cols-3">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setSelectedStatus(filter.value)}
            className={`romdoc-focus-ring rounded-2xl border p-[13px] text-left transition ${
              selectedStatus === filter.value
                ? "border-[#036661] bg-emerald-50"
                : "border-gray-200 bg-[#F0EEE9] hover:border-gray-300"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {filter.label}
            </p>
            <p className="mt-[8px] text-2xl font-bold text-gray-900">
              {statusCounts[filter.value]}
            </p>
          </button>
        ))}
      </div>

      <label className="mt-[21px] block">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {copy.locations.search}
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={copy.locations.searchPlaceholder}
          className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-900"
        />
      </label>

      {error ? (
        <div className="mt-[21px] rounded-xl border border-red-200 bg-red-50 p-[13px] text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-[21px] rounded-xl border border-green-200 bg-green-50 p-[13px] text-sm text-green-800">
          {success}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-[21px] rounded-xl border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm text-gray-600">
          {copy.locations.states.loading}
        </div>
      ) : visibleLocations.length === 0 ? (
        <div className="mt-[21px] rounded-xl border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm text-gray-600">
          {copy.locations.states.empty}
        </div>
      ) : (
        <div className="mt-[21px] space-y-[13px]">
          {visibleLocations.map((location) => {
            const clinic = location.clinics;
            const organization = location.clinic_organizations;
            const isRunning = actionLocationId === location.id;
            const hasCoordinates = Boolean(
              clinic && clinic.latitude !== null && clinic.longitude !== null
            );

            return (
              <details
                key={location.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white"
              >
                <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] px-[21px] py-[13px] hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                  <div>
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <h3 className="font-bold text-gray-900">
                        {clinicName(location)}
                      </h3>
                      <span
                        className={`rounded-full px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                          location.status
                        )}`}
                      >
                        {locationStatusLabel(location.status)}
                      </span>
                    </div>
                    <p className="mt-[5px] text-sm text-gray-600">
                      {organization?.name ?? copy.common.organizationUnavailable} · {cityName(location)}
                    </p>
                  </div>
                  <span className="text-xl text-gray-500 transition-transform group-open:rotate-180">
                    ⌄
                  </span>
                </summary>

                <div className="border-t border-gray-200 p-[21px]">
                  <div className="grid gap-[13px] sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-gray-50 p-[13px]">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {copy.locations.labels.location}
                      </p>
                      <p className="mt-[5px] text-sm text-gray-900">
                        {clinic?.formatted_address ?? copy.common.addressUnavailable}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-[13px]">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {copy.locations.labels.organization}
                      </p>
                      <p className="mt-[5px] text-sm font-medium text-gray-900">
                        {organization?.name ?? copy.common.organizationUnavailable}
                      </p>
                      <p className="mt-[5px] text-xs text-gray-500">
                        {organization?.contact_email ?? copy.common.emailUnavailable}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-[13px]">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {copy.locations.labels.publicMap}
                      </p>
                      <p className="mt-[5px] text-sm text-gray-900">
                        {publicStatusLabel(clinic?.status ?? "pending")}
                      </p>
                      <p className="mt-[5px] text-xs text-gray-500">
                        {hasCoordinates
                          ? copy.locations.labels.coordinatesAvailable
                          : copy.locations.labels.coordinatesMissing}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-[13px]">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {copy.locations.labels.requested}
                      </p>
                      <p className="mt-[5px] text-sm text-gray-900">
                        {formatDate(location.created_at)}
                      </p>
                    </div>
                  </div>

                  {clinic?.google_maps_uri ? (
                    <a
                      href={clinic.google_maps_uri}
                      target="_blank"
                      rel="noreferrer"
                      className="romdoc-focus-ring mt-[13px] inline-flex rounded-xl border border-gray-300 px-[13px] py-[8px] text-sm font-semibold text-[#036661] hover:bg-gray-50"
                    >
                      {copy.common.openGoogleMaps}
                    </a>
                  ) : null}

                  {location.status === "pending" ? (
                    <div className="mt-[21px] flex flex-wrap justify-end gap-[8px] border-t border-gray-200 pt-[21px]">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger-outline"
                        onClick={() => void handleAction(location.id, "reject")}
                        disabled={Boolean(actionLocationId)}
                      >
                        {isRunning
                          ? copy.locations.actions.processing
                          : copy.locations.actions.reject}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleAction(location.id, "approve")}
                        disabled={Boolean(actionLocationId)}
                      >
                        {isRunning
                          ? copy.locations.actions.processing
                          : copy.locations.actions.approve}
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
