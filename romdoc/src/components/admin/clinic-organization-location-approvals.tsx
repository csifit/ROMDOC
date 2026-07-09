"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/button";

type ClinicTranslation = {
  locale: string;
  name: string;
};

type CityTranslation = {
  locale: string;
  name: string;
};

type ClinicOrganization = {
  id: string;
  name: string;
  status: string;
  contact_email: string | null;
  contact_phone: string | null;
};

type ClinicCity = {
  slug: string | null;
  city_translations: CityTranslation[] | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
  formatted_address: string | null;
  google_maps_uri: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  clinic_translations: ClinicTranslation[] | null;
  cities: ClinicCity | null;
};

type ClinicOrganizationLocation = {
  id: string;
  organization_id: string;
  clinic_id: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  clinic_organizations: ClinicOrganization | null;
  clinics: Clinic | null;
};

type LocationsResponse = {
  locations?: ClinicOrganizationLocation[];
  error?: string;
};

type ActionResponse = {
  message?: string;
  error?: string;
};

type LocationStatus = "pending" | "active" | "removed";

type LocationAction = "approve" | "reject";

const statusFilters: Array<{ value: LocationStatus; label: string }> = [
  {
    value: "pending",
    label: "În verificare",
  },
  {
    value: "active",
    label: "Aprobate",
  },
  {
    value: "removed",
    label: "Respinse / eliminate",
  },
];

function getRomanianName(translations: ClinicTranslation[] | CityTranslation[] | null) {
  return (
    translations?.find((translation) => translation.locale === "ro")?.name ??
    translations?.[0]?.name ??
    null
  );
}

function getClinicName(location: ClinicOrganizationLocation) {
  const clinic = location.clinics;

  if (!clinic) {
    return "Locație indisponibilă";
  }

  return getRomanianName(clinic.clinic_translations) ?? clinic.slug;
}

function getCityName(location: ClinicOrganizationLocation) {
  const city = location.clinics?.cities;

  if (!city) {
    return "Oraș indisponibil";
  }

  return getRomanianName(city.city_translations) ?? city.slug ?? "Oraș indisponibil";
}

function getLocationStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Aprobată pentru organizație";

    case "removed":
      return "Respinsă / eliminată";

    default:
      return "În verificare";
  }
}

function getClinicPublicStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "Apare pe hartă";

    case "blocked":
      return "Blocată";

    case "rejected":
      return "Respinsă";

    default:
      return "Nu apare încă pe hartă";
  }
}

function getStatusClasses(status: string) {
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

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .trim();
}

export default function ClinicOrganizationLocationApprovals() {
  const [selectedStatus, setSelectedStatus] =
    useState<LocationStatus>("pending");
  const [locations, setLocations] = useState<ClinicOrganizationLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLocationId, setActionLocationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const query = new URLSearchParams({
        status: selectedStatus,
      });

      const response = await fetch(
        `/api/admin/clinic-organization-locations?${query.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = (await response.json()) as LocationsResponse;

      if (!response.ok) {
        throw new Error(
          result.error ?? "Locațiile organizațiilor nu au putut fi încărcate."
        );
      }

      setLocations(result.locations ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Locațiile organizațiilor nu au putut fi încărcate."
      );
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  async function handleAction(
    organizationClinicId: string,
    action: LocationAction
  ) {
    if (actionLocationId) {
      return;
    }

    const confirmation =
      action === "approve"
        ? "Aprobi această locație pentru organizația clinicii? Clinica va deveni eligibilă pentru harta publică dacă are coordonate valide."
        : "Respinge această locație pentru organizația clinicii?";

    if (!window.confirm(confirmation)) {
      return;
    }

    try {
      setActionLocationId(organizationClinicId);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/clinic-organization-locations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationClinicId,
          action,
        }),
      });

      const result = (await response.json()) as ActionResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Acțiunea nu a putut fi finalizată.");
      }

      setSuccess(result.message ?? "Acțiunea a fost finalizată.");
      await loadLocations();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Acțiunea nu a putut fi finalizată."
      );
    } finally {
      setActionLocationId(null);
    }
  }

  const visibleLocations = useMemo(() => {
    const normalizedSearch = normalizeForSearch(search);

    if (!normalizedSearch) {
      return locations;
    }

    return locations.filter((location) => {
      const clinicName = getClinicName(location);
      const organizationName = location.clinic_organizations?.name ?? "";
      const cityName = getCityName(location);
      const address = location.clinics?.formatted_address ?? "";

      return [clinicName, organizationName, cityName, address]
        .map(normalizeForSearch)
        .some((value) => value.includes(normalizedSearch));
    });
  }, [locations, search]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Locații organizații clinică
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Aprobă punctele de lucru cerute de Clinic Manager. După aprobare,
            locația aparține organizației, poate fi folosită la asocierea
            medicilor clinicii și devine eligibilă pentru afișarea pe harta
            publică RomDoc.
          </p>
        </div>

        <span className="rounded-full bg-[#F0EEE9] px-3 py-1 text-sm font-semibold text-gray-700">
          {locations.length} locații
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Caută
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Caută clinică, organizație, oraș sau adresă"
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSelectedStatus(filter.value)}
              className={`romdoc-focus-ring rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedStatus === filter.value
                  ? "bg-[#036661] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
          Se încarcă locațiile...
        </div>
      ) : visibleLocations.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm leading-6 text-gray-600">
          Nu există locații în această categorie.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Locație</th>
                  <th className="px-4 py-3">Organizație</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Hartă publică</th>
                  <th className="px-4 py-3">Cerută</th>
                  <th className="px-4 py-3 text-right">Acțiuni</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {visibleLocations.map((location) => {
                  const clinic = location.clinics;
                  const organization = location.clinic_organizations;
                  const isActionRunning = actionLocationId === location.id;
                  const clinicCoordinates = Boolean(
                    clinic && clinic.latitude !== null && clinic.longitude !== null
                  );

                  return (
                    <tr key={location.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold text-gray-900">
                          {getClinicName(location)}
                        </p>
                        <p className="mt-1 text-gray-600">{getCityName(location)}</p>
                        <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500">
                          {clinic?.formatted_address ?? "Adresă indisponibilă"}
                        </p>
                        {clinic?.google_maps_uri && (
                          <a
                            href={clinic.google_maps_uri}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-semibold text-[#036661] hover:underline"
                          >
                            Deschide în Google Maps
                          </a>
                        )}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">
                          {organization?.name ?? "Organizație indisponibilă"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {organization?.contact_email ?? "E-mail indisponibil"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {organization?.contact_phone ?? "Telefon indisponibil"}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            location.status
                          )}`}
                        >
                          {getLocationStatusLabel(location.status)}
                        </span>
                        <p className="mt-2 text-xs text-gray-500">
                          Aprobată: {formatDate(location.approved_at)}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            clinic?.status ?? "pending"
                          )}`}
                        >
                          {getClinicPublicStatusLabel(clinic?.status ?? "pending")}
                        </span>
                        <p className="mt-2 text-xs text-gray-500">
                          {clinicCoordinates
                            ? "Coordonate disponibile"
                            : "Coordonate lipsă"}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top text-gray-700">
                        {formatDate(location.created_at)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        {location.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              onClick={() => handleAction(location.id, "reject")}
                              disabled={Boolean(actionLocationId)}
                              variant="secondary"
                              className="border-red-200 text-red-700 hover:bg-red-50"
                            >
                              {isActionRunning ? "Se procesează..." : "Respinge"}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleAction(location.id, "approve")}
                              disabled={Boolean(actionLocationId)}
                            >
                              {isActionRunning ? "Se procesează..." : "Aprobă"}
                            </Button>
                          </div>
                        ) : (
                          <p className="text-right text-xs text-gray-500">
                            Fără acțiuni
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
