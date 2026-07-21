"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import Button from "@/components/ui/button";
import type { PlatformOperatorDirectoryApiPayload } from "@/lib/api/platform-operator-directory-codes";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformDirectoryApiMessage,
  getPlatformOperatorDirectory,
  interpolatePlatformDirectoryCopy,
} from "@/lib/i18n/platform-operator-directory";
import { createLocationSlug } from "@/lib/locations/create-location-slug";

type CityTranslation = {
  id: string;
  locale: string;
  name: string;
};

type City = {
  id: string;
  slug: string;
  country_code: string;
  latitude: number | string | null;
  longitude: number | string | null;
  is_active: boolean;
  clinic_count: number;
  created_at: string;
  updated_at: string;
  city_translations: CityTranslation[] | null;
};

type CityCapabilities = {
  canCreateCities: boolean;
  canUpdateCities: boolean;
  canDeleteCities: boolean;
};

type ApiResponse = PlatformOperatorDirectoryApiPayload & {
  cities?: City[];
  operatorRole?: "admin" | "manager";
  capabilities?: Partial<CityCapabilities>;
};

type StatusFilter = "all" | "active" | "inactive";

type CityFormState = {
  cityId: string;
  nameRo: string;
  nameEn: string;
  slug: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
};

const EMPTY_FORM: CityFormState = {
  cityId: "",
  nameRo: "",
  nameEn: "",
  slug: "",
  countryCode: "RO",
  latitude: "",
  longitude: "",
  isActive: true,
};

function getTranslation(city: City, locale: string) {
  return (
    city.city_translations?.find(
      (translation) => translation.locale === locale
    ) ?? null
  );
}

function coordinateToString(value: number | string | null) {
  return value === null || value === undefined ? "" : String(value);
}

function metricCard(label: string, value: number) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-[13px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-[5px] text-2xl font-bold text-gray-900">{value}</p>
    </article>
  );
}

export default function CitiesManagement() {
  const locale = normalizeAppLocale(useLocale());
  const copy = getPlatformOperatorDirectory(locale);

  const [cities, setCities] = useState<City[]>([]);
  const [form, setForm] = useState<CityFormState>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changingCityId, setChangingCityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<CityCapabilities>({
    canCreateCities: false,
    canUpdateCities: true,
    canDeleteCities: false,
  });

  const isEditing = Boolean(form.cityId);

  const loadCities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/admin/cities", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformDirectoryApiMessage(
            locale,
            result.code,
            result.error ?? copy.cities.states.loadFailed
          )
        );
      }

      setCities(result.cities ?? []);
      setCapabilities((current) => ({
        ...current,
        ...result.capabilities,
      }));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : copy.cities.states.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.cities.states.loadFailed, locale]);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  const metrics = useMemo(() => {
    const active = cities.filter((city) => city.is_active).length;
    const withCoordinates = cities.filter(
      (city) => city.latitude !== null && city.longitude !== null
    ).length;

    return {
      total: cities.length,
      active,
      inactive: cities.length - active,
      withCoordinates,
    };
  }, [cities]);

  const filteredCities = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(locale);

    return cities.filter((city) => {
      if (statusFilter === "active" && !city.is_active) return false;
      if (statusFilter === "inactive" && city.is_active) return false;
      if (!normalizedSearch) return true;

      const values = [
        city.slug,
        city.country_code,
        getTranslation(city, "ro")?.name,
        getTranslation(city, "en")?.name,
      ];

      return values
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase(locale).includes(normalizedSearch));
    });
  }, [cities, locale, search, statusFilter]);

  function updateForm<Key extends keyof CityFormState>(
    key: Key,
    value: CityFormState[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
  }

  function beginEditing(city: City) {
    const ro = getTranslation(city, "ro");
    const en = getTranslation(city, "en");

    setForm({
      cityId: city.id,
      nameRo: ro?.name ?? "",
      nameEn: en?.name ?? "",
      slug: city.slug,
      countryCode: city.country_code,
      latitude: coordinateToString(city.latitude),
      longitude: coordinateToString(city.longitude),
      isActive: city.is_active,
    });
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitCity(
    payload: CityFormState,
    method: "POST" | "PATCH"
  ) {
    const response = await fetch("/api/admin/cities", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        countryCode: payload.countryCode.trim().toUpperCase(),
        latitude: payload.latitude.trim(),
        longitude: payload.longitude.trim(),
      }),
    });
    const result = (await response.json()) as ApiResponse;

    if (!response.ok) {
      throw new Error(
        getPlatformDirectoryApiMessage(
          locale,
          result.code,
          result.error ?? copy.cities.states.saveFailed
        )
      );
    }

    return result;
  }

  async function saveCity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.nameRo.trim().length < 2) {
      setError(copy.cities.form.nameRoRequired);
      return;
    }
    if (form.nameEn.trim().length < 2) {
      setError(copy.cities.form.nameEnRequired);
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(form.countryCode.trim())) {
      setError(copy.cities.form.countryInvalid);
      return;
    }
    if (!isEditing && !capabilities.canCreateCities) {
      setError(copy.cities.form.adminOnlyDescription);
      return;
    }

    setIsSaving(true);

    try {
      const result = await submitCity(form, isEditing ? "PATCH" : "POST");
      setSuccess(
        getPlatformDirectoryApiMessage(
          locale,
          result.code,
          result.message ??
            (isEditing ? copy.cities.states.updated : copy.cities.states.created)
        )
      );
      setForm(EMPTY_FORM);
      await loadCities();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : copy.cities.states.saveFailed
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleCity(city: City) {
    const nextActive = !city.is_active;

    if (!nextActive && city.clinic_count > 0) {
      setError(copy.cities.list.inUse);
      return;
    }

    const confirmed = window.confirm(
      nextActive
        ? copy.cities.list.confirmActivate
        : copy.cities.list.confirmDeactivate
    );
    if (!confirmed) return;

    const ro = getTranslation(city, "ro");
    const en = getTranslation(city, "en");

    setError(null);
    setSuccess(null);
    setChangingCityId(city.id);

    try {
      const result = await submitCity(
        {
          cityId: city.id,
          nameRo: ro?.name ?? "",
          nameEn: en?.name ?? "",
          slug: city.slug,
          countryCode: city.country_code,
          latitude: coordinateToString(city.latitude),
          longitude: coordinateToString(city.longitude),
          isActive: nextActive,
        },
        "PATCH"
      );

      setSuccess(
        getPlatformDirectoryApiMessage(
          locale,
          result.code,
          result.message ??
            (nextActive ? copy.cities.states.updated : copy.cities.states.deactivated)
        )
      );
      await loadCities();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : copy.cities.states.statusFailed
      );
    } finally {
      setChangingCityId(null);
    }
  }

  const showForm = capabilities.canCreateCities || isEditing;

  return (
    <div className="space-y-[34px]">
      <section className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        {metricCard(copy.cities.metrics.total, metrics.total)}
        {metricCard(copy.cities.metrics.active, metrics.active)}
        {metricCard(copy.cities.metrics.inactive, metrics.inactive)}
        {metricCard(copy.cities.metrics.coordinates, metrics.withCoordinates)}
      </section>

      {showForm ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
          <div className="flex flex-wrap items-start justify-between gap-[13px]">
            <div>
              <p className="text-sm font-semibold text-[#036661]">
                {isEditing ? copy.cities.form.editEyebrow : copy.cities.form.newEyebrow}
              </p>
              <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
                {isEditing ? copy.cities.form.editTitle : copy.cities.form.newTitle}
              </h2>
              <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
                {copy.cities.form.description}
              </p>
            </div>

            {isEditing && (
              <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                {copy.cities.form.cancelEdit}
              </Button>
            )}
          </div>

          <form onSubmit={saveCity} className="mt-[21px] space-y-[21px]">
            <div className="grid gap-[13px] md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {copy.cities.form.nameRo}
                </span>
                <input
                  required
                  type="text"
                  maxLength={200}
                  value={form.nameRo}
                  disabled={isSaving}
                  onChange={(event) => {
                    const name = event.target.value;
                    updateForm("nameRo", name);
                    if (!isEditing || !form.slug) {
                      updateForm("slug", createLocationSlug(name));
                    }
                  }}
                  placeholder="Timișoara"
                  className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {copy.cities.form.nameEn}
                </span>
                <input
                  required
                  type="text"
                  maxLength={200}
                  value={form.nameEn}
                  disabled={isSaving}
                  onChange={(event) => updateForm("nameEn", event.target.value)}
                  placeholder="Timisoara"
                  className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px]"
                />
              </label>
            </div>

            <div className="grid gap-[13px] md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {copy.common.slug}
                </span>
                <input
                  required
                  type="text"
                  maxLength={200}
                  value={form.slug}
                  disabled={isSaving}
                  onChange={(event) =>
                    updateForm("slug", createLocationSlug(event.target.value))
                  }
                  placeholder="timisoara"
                  className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] font-mono text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {copy.cities.form.countryCode}
                </span>
                <input
                  required
                  type="text"
                  minLength={2}
                  maxLength={2}
                  value={form.countryCode}
                  disabled={isSaving}
                  onChange={(event) =>
                    updateForm(
                      "countryCode",
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "")
                        .slice(0, 2)
                    )
                  }
                  placeholder="RO"
                  className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] uppercase"
                />
                <p className="mt-[8px] text-xs text-gray-500">
                  {copy.cities.form.countryHelp}
                </p>
              </label>
            </div>

            <div className="grid gap-[13px] md:grid-cols-2">
              <CoordinateField
                label={copy.cities.form.latitude}
                optionalLabel={copy.common.optional}
                value={form.latitude}
                disabled={isSaving}
                minimum={-90}
                maximum={90}
                placeholder="45.7488716"
                onChange={(value) => updateForm("latitude", value)}
              />
              <CoordinateField
                label={copy.cities.form.longitude}
                optionalLabel={copy.common.optional}
                value={form.longitude}
                disabled={isSaving}
                minimum={-180}
                maximum={180}
                placeholder="21.2086793"
                onChange={(value) => updateForm("longitude", value)}
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-[13px] text-sm text-red-800">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-[13px] text-sm text-green-800">
                {success}
              </div>
            )}

            <Button
              type="submit"
              isLoading={isSaving}
              loadingText={copy.cities.form.saving}
              disabled={isEditing ? !capabilities.canUpdateCities : !capabilities.canCreateCities}
            >
              {isEditing ? copy.cities.form.save : copy.cities.form.create}
            </Button>
          </form>
        </section>
      ) : (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-[21px] text-blue-950 shadow-sm">
          <h2 className="text-lg font-bold">{copy.cities.form.adminOnlyTitle}</h2>
          <p className="mt-[8px] text-sm leading-6">
            {copy.cities.form.adminOnlyDescription}
          </p>
        </section>
      )}

      {!showForm && error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-[13px] text-sm text-red-800">
          {error}
        </div>
      )}
      {!showForm && success && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-[13px] text-sm text-green-800">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <div className="flex flex-wrap items-end justify-between gap-[13px]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{copy.cities.list.title}</h2>
            <p className="mt-[8px] text-sm text-gray-600">
              {interpolatePlatformDirectoryCopy(copy.cities.list.count, {
                count: cities.length,
              })}
            </p>
          </div>

          <div className="flex w-full flex-col gap-[8px] sm:w-auto sm:flex-row">
            <label className="w-full sm:w-52">
              <span className="sr-only">{copy.cities.list.statusLabel}</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="all">{copy.cities.list.allStatuses}</option>
                <option value="active">{copy.cities.list.active}</option>
                <option value="inactive">{copy.cities.list.inactive}</option>
              </select>
            </label>

            <label className="w-full sm:w-80">
              <span className="sr-only">{copy.cities.list.searchLabel}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.cities.list.searchPlaceholder}
                className="romdoc-focus-ring w-full rounded-xl border border-gray-300 px-[13px] py-[13px]"
              />
            </label>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-[21px] text-sm text-gray-600">{copy.cities.list.loading}</p>
        ) : filteredCities.length === 0 ? (
          <p className="mt-[21px] rounded-xl bg-gray-50 p-[21px] text-sm text-gray-600">
            {copy.cities.list.empty}
          </p>
        ) : (
          <div className="mt-[21px] overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="px-[13px] py-[13px] font-semibold">{copy.cities.list.city}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.cities.list.english}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.common.slug}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.cities.list.country}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.cities.list.coordinates}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.cities.list.clinics}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.common.status}</th>
                  <th className="px-[13px] py-[13px] text-right font-semibold">{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCities.map((city) => {
                  const ro = getTranslation(city, "ro");
                  const en = getTranslation(city, "en");
                  const isChanging = changingCityId === city.id;

                  return (
                    <tr key={city.id} className="align-top">
                      <td className="px-[13px] py-[13px] font-semibold text-gray-900">
                        {ro?.name ?? copy.common.none}
                      </td>
                      <td className="px-[13px] py-[13px] text-gray-700">
                        {en?.name ?? copy.common.none}
                      </td>
                      <td className="px-[13px] py-[13px] font-mono text-xs text-gray-600">
                        {city.slug}
                      </td>
                      <td className="px-[13px] py-[13px] font-semibold text-gray-700">
                        {city.country_code}
                      </td>
                      <td className="px-[13px] py-[13px] text-xs text-gray-600">
                        {city.latitude !== null && city.longitude !== null ? (
                          <>
                            <span className="block">
                              {copy.cities.list.latitudeShort}: {city.latitude}
                            </span>
                            <span className="mt-[5px] block">
                              {copy.cities.list.longitudeShort}: {city.longitude}
                            </span>
                          </>
                        ) : (
                          copy.common.none
                        )}
                      </td>
                      <td className="px-[13px] py-[13px] text-gray-700">
                        {city.clinic_count}
                      </td>
                      <td className="px-[13px] py-[13px]">
                        <span className={`rounded-full px-[13px] py-[5px] text-xs font-semibold ${
                          city.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-700"
                        }`}>
                          {city.is_active ? copy.common.active : copy.common.inactive}
                        </span>
                      </td>
                      <td className="px-[13px] py-[13px]">
                        <div className="flex justify-end gap-[8px]">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!capabilities.canUpdateCities}
                            onClick={() => beginEditing(city)}
                          >
                            {copy.cities.list.edit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={city.is_active ? "secondary" : "primary"}
                            isLoading={isChanging}
                            loadingText={copy.cities.list.updating}
                            disabled={!capabilities.canUpdateCities}
                            onClick={() => void toggleCity(city)}
                          >
                            {city.is_active
                              ? copy.cities.list.deactivate
                              : copy.cities.list.activate}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CoordinateField({
  label,
  optionalLabel,
  value,
  disabled,
  minimum,
  maximum,
  placeholder,
  onChange,
}: {
  label: string;
  optionalLabel: string;
  value: string;
  disabled: boolean;
  minimum: number;
  maximum: number;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="ml-[8px] text-xs text-gray-500">{optionalLabel}</span>
      <input
        type="number"
        step="0.0000001"
        min={minimum}
        max={maximum}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px]"
      />
    </label>
  );
}
