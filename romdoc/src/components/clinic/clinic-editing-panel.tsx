"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";

import GooglePlaceAutocomplete, {
  type GooglePlaceAutocompleteCopy,
} from "@/components/clinic/google-place-autocomplete";
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
import type { GoogleClinicAddress } from "@/lib/locations/google-address";

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

type Clinic = {
  id: string;
  slug: string;
  status: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  formatted_address: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  county_name: string | null;
  country_code: string | null;
  google_maps_uri: string | null;
  updated_at: string;
  clinic_translations: ClinicTranslation[] | null;
  cities: CityRelation | CityRelation[] | null;
};

type EditableClinicsResponse = PlatformOperatorClinicApiPayload & {
  clinics?: Clinic[];
  clinic?: Clinic;
  role?: string;
};

type Draft = {
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  addressLine2: string;
};

type ClinicEditingPanelProps = {
  title: string;
  description: string;
  emptyMessage: string;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function statusClasses(status: string) {
  switch (status) {
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

export default function ClinicEditingPanel({
  title,
  description,
  emptyMessage,
}: ClinicEditingPanelProps) {
  const locale = normalizeAppLocale(useLocale());
  const localeTag = PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS[locale];
  const copy = getPlatformOperatorClinics(locale);
  const googleCopy = copy.google as GooglePlaceAutocompleteCopy;

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedAddress, setSelectedAddress] =
    useState<GoogleClinicAddress | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getClinicName = useCallback(
    (clinic: Clinic) =>
      selectTranslation(clinic.clinic_translations, locale)?.name ??
      clinic.slug,
    [locale]
  );

  const getClinicDescription = useCallback(
    (clinic: Clinic) =>
      selectTranslation(clinic.clinic_translations, locale)?.description ??
      "",
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

  const getStatusLabel = useCallback(
    (status: string) => {
      switch (status) {
        case "approved":
          return copy.common.statusApproved;
        case "pending":
          return copy.common.statusPending;
        case "rejected":
          return copy.common.statusRejected;
        case "blocked":
          return copy.common.statusBlocked;
        default:
          return status;
      }
    },
    [copy]
  );

  const normalizeSearch = useCallback(
    (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase(localeTag)
        .trim(),
    [localeTag]
  );

  const loadClinics = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/clinics/editable", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as EditableClinicsResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.editing.states.loadFailed
          )
        );
      }

      setClinics(result.clinics ?? []);
      setRole(result.role ?? null);
    } catch (loadError) {
      setClinics([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.editing.states.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.editing.states.loadFailed, locale]);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  const visibleClinics = useMemo(() => {
    const query = normalizeSearch(search);

    return clinics.filter((clinic) => {
      if (statusFilter !== "all" && clinic.status !== statusFilter) return false;
      if (!query) return true;

      const haystack = [
        getClinicName(clinic),
        getCityName(clinic),
        clinic.formatted_address,
        clinic.phone,
        clinic.email,
        clinic.slug,
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeSearch(haystack).includes(query);
    });
  }, [
    clinics,
    getCityName,
    getClinicName,
    normalizeSearch,
    search,
    statusFilter,
  ]);

  function startEditing(clinic: Clinic) {
    setEditingClinicId(clinic.id);
    setDraft({
      name: getClinicName(clinic),
      description: getClinicDescription(clinic),
      phone: clinic.phone ?? "",
      email: clinic.email ?? "",
      website: clinic.website ?? "",
      addressLine2: clinic.address_line_2 ?? "",
    });
    setSelectedAddress(null);
    setError("");
    setSuccess("");
  }

  function stopEditing() {
    setEditingClinicId(null);
    setDraft(null);
    setSelectedAddress(null);
  }

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingClinicId || !draft) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/clinics/editable", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: editingClinicId,
          name: draft.name,
          description: draft.description,
          phone: draft.phone,
          email: draft.email,
          website: draft.website,
          addressLine2: draft.addressLine2,
          placeId: selectedAddress?.placeId ?? null,
        }),
      });
      const result = (await response.json()) as EditableClinicsResponse;

      if (!response.ok || !result.clinic) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.editing.states.saveFailed
          )
        );
      }

      setClinics((current) =>
        current.map((clinic) =>
          clinic.id === result.clinic?.id ? result.clinic : clinic
        )
      );
      setSuccess(
        getPlatformClinicApiMessage(
          locale,
          result.code,
          result.message ?? copy.editing.states.updated
        )
      );
      stopEditing();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : copy.editing.states.saveFailed
      );
    } finally {
      setIsSaving(false);
    }
  }

  const effectiveDescription =
    role === "admin"
      ? copy.editing.descriptionAdmin
      : role === "manager"
        ? copy.editing.descriptionManager
        : description || copy.editing.descriptionDefault;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {copy.editing.eyebrow}
          </p>
          <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
            {title || copy.editing.title}
          </h2>
          <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
            {effectiveDescription}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadClinics()}
          disabled={isLoading || isSaving}
          className="romdoc-focus-ring w-fit rounded-xl border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copy.common.reload}
        </button>
      </div>

      <div className="mt-[21px] grid gap-[13px] md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
        <label>
          <span className="text-sm font-medium text-gray-900">
            {copy.editing.search}
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.editing.searchPlaceholder}
            className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950"
          />
        </label>

        <label>
          <span className="text-sm font-medium text-gray-900">
            {copy.editing.status}
          </span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px] text-gray-950"
          >
            <option value="all">{copy.editing.allStatuses}</option>
            <option value="approved">{copy.common.statusApproved}</option>
            <option value="pending">{copy.common.statusPending}</option>
            <option value="rejected">{copy.common.statusRejected}</option>
            <option value="blocked">{copy.common.statusBlocked}</option>
          </select>
        </label>

        <button
          type="button"
          disabled={!search && statusFilter === "all"}
          onClick={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          className="romdoc-focus-ring min-h-[47px] rounded-xl border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {copy.common.reset}
        </button>
      </div>

      <p className="mt-[13px] text-sm text-gray-500">
        {interpolatePlatformClinicCopy(copy.common.showing, {
          filtered: visibleClinics.length,
          total: clinics.length,
        })}
      </p>

      {error ? (
        <div
          role="alert"
          className="mt-[21px] rounded-xl border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="mt-[21px] rounded-xl border border-green-200 bg-green-50 px-[13px] py-[13px] text-sm text-green-800"
        >
          {success}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-[21px] rounded-xl border border-gray-200 bg-gray-50 p-[21px] text-sm text-gray-600">
          {copy.editing.states.loading}
        </div>
      ) : visibleClinics.length === 0 ? (
        <div className="mt-[21px] rounded-xl border border-amber-200 bg-amber-50 p-[21px] text-sm leading-6 text-amber-900">
          {clinics.length === 0 ? emptyMessage : copy.editing.states.noResults}
        </div>
      ) : (
        <div className="mt-[21px] space-y-[13px]">
          {visibleClinics.map((clinic) => {
            const isEditing = editingClinicId === clinic.id;

            return (
              <article
                key={clinic.id}
                className="overflow-hidden rounded-2xl border border-gray-200"
              >
                <div className="flex flex-col justify-between gap-[13px] bg-gray-50 px-[21px] py-[13px] lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <h3 className="text-lg font-bold text-gray-900">
                        {getClinicName(clinic)}
                      </h3>
                      <span
                        className={`rounded-full px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                          clinic.status
                        )}`}
                      >
                        {getStatusLabel(clinic.status)}
                      </span>
                    </div>
                    <p className="mt-[5px] text-sm text-gray-600">
                      {getCityName(clinic)}
                      {clinic.formatted_address
                        ? ` — ${clinic.formatted_address}`
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => (isEditing ? stopEditing() : startEditing(clinic))}
                    disabled={isSaving}
                    className="romdoc-focus-ring w-fit rounded-xl bg-[#036661] px-[13px] py-[8px] text-sm font-semibold text-white hover:bg-[#02534f] disabled:opacity-60"
                  >
                    {isEditing ? copy.editing.actions.close : copy.editing.actions.edit}
                  </button>
                </div>

                <div className="grid gap-[13px] px-[21px] py-[13px] text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    [copy.editing.fields.phone, clinic.phone || copy.common.none],
                    [copy.editing.fields.email, clinic.email || copy.common.none],
                    [copy.editing.fields.website, clinic.website || copy.common.none],
                    [copy.editing.fields.addressLine2, clinic.address_line_2 || copy.common.none],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {label}
                      </p>
                      <p className="mt-[5px] break-all">{value}</p>
                    </div>
                  ))}
                </div>

                {isEditing && draft ? (
                  <form
                    onSubmit={submitEdit}
                    className="border-t border-gray-200 bg-white px-[21px] py-[21px]"
                  >
                    <div className="grid gap-[21px] lg:grid-cols-2">
                      <div className="lg:col-span-2">
                        <label className="text-sm font-medium text-gray-900">
                          {copy.editing.fields.name}
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={200}
                          value={draft.name}
                          onChange={(event) => updateDraft("name", event.target.value)}
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950 disabled:opacity-60"
                        />
                      </div>

                      {(["phone", "email"] as const).map((field) => (
                        <div key={field}>
                          <label className="text-sm font-medium text-gray-900">
                            {copy.editing.fields[field]}
                          </label>
                          <input
                            type={field === "email" ? "email" : "tel"}
                            maxLength={field === "email" ? 320 : 50}
                            value={draft[field]}
                            onChange={(event) => updateDraft(field, event.target.value)}
                            disabled={isSaving}
                            className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950 disabled:opacity-60"
                          />
                        </div>
                      ))}

                      <div className="lg:col-span-2">
                        <label className="text-sm font-medium text-gray-900">
                          {copy.editing.fields.website}
                        </label>
                        <input
                          type="url"
                          maxLength={500}
                          value={draft.website}
                          onChange={(event) => updateDraft("website", event.target.value)}
                          placeholder="https://"
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950 disabled:opacity-60"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="text-sm font-medium text-gray-900">
                          {copy.editing.fields.addressLine2}
                        </label>
                        <input
                          type="text"
                          maxLength={300}
                          value={draft.addressLine2}
                          onChange={(event) => updateDraft("addressLine2", event.target.value)}
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950 disabled:opacity-60"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <p className="text-sm font-medium text-gray-900">
                          {copy.editing.fields.newAddress}
                        </p>
                        <div className="mt-[8px]">
                          <GooglePlaceAutocomplete
                            onAddressSelected={setSelectedAddress}
                            disabled={isSaving}
                            locale={locale}
                            copy={googleCopy}
                          />
                        </div>
                        {selectedAddress ? (
                          <div className="mt-[13px] rounded-xl border border-green-200 bg-green-50 px-[13px] py-[13px] text-sm text-green-800">
                            <p className="font-semibold">
                              {copy.editing.fields.newAddressSelected}
                            </p>
                            <p className="mt-[5px]">
                              {selectedAddress.formattedAddress}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-[8px] text-xs leading-5 text-gray-500">
                            {copy.editing.fields.newAddressHelp}
                          </p>
                        )}
                      </div>

                      <div className="lg:col-span-2">
                        <label className="text-sm font-medium text-gray-900">
                          {copy.editing.fields.description}
                        </label>
                        <textarea
                          rows={5}
                          maxLength={3000}
                          value={draft.description}
                          onChange={(event) =>
                            updateDraft("description", event.target.value)
                          }
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950 disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="mt-[21px] flex flex-wrap gap-[13px]">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="romdoc-focus-ring rounded-xl bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white hover:bg-[#02534f] disabled:opacity-60"
                      >
                        {isSaving
                          ? copy.editing.actions.saving
                          : copy.editing.actions.save}
                      </button>
                      <button
                        type="button"
                        onClick={stopEditing}
                        disabled={isSaving}
                        className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-[21px] py-[13px] text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {copy.editing.actions.cancel}
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
