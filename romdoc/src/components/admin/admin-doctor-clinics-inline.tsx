"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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

type Clinic = {
  id: string;
  slug: string;
  status: string;
  formatted_address: string | null;
  clinic_translations: Array<{ locale: string; name: string }> | null;
  cities:
    | {
        id: string;
        slug: string;
        city_translations: Array<{ locale: string; name: string }> | null;
      }
    | Array<{
        id: string;
        slug: string;
        city_translations: Array<{ locale: string; name: string }> | null;
      }>
    | null;
};

type DoctorClinicLink = {
  doctor_id: string;
  clinic_id: string;
};

type AssociationResponse = PlatformOperatorClinicApiPayload & {
  clinics?: Clinic[];
  links?: DoctorClinicLink[];
};

type Props = {
  doctorId: string;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function AdminDoctorClinicsInline({ doctorId }: Props) {
  const locale = normalizeAppLocale(useLocale());
  const localeTag = PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS[locale];
  const copy = getPlatformOperatorClinics(locale);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [links, setLinks] = useState<DoctorClinicLink[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adminOnly, setAdminOnly] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [removingClinicId, setRemovingClinicId] = useState<string | null>(null);

  const clinicName = useCallback(
    (clinic: Clinic) =>
      selectTranslation(clinic.clinic_translations, locale)?.name ??
      clinic.slug,
    [locale]
  );

  const cityName = useCallback(
    (clinic: Clinic) => {
      const city = first(clinic.cities);
      return (
        selectTranslation(city?.city_translations, locale)?.name ??
        city?.slug ??
        copy.common.unknownCity
      );
    },
    [copy.common.unknownCity, locale]
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

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/admin/doctor-clinics", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as AssociationResponse;

      if (!response.ok && result.code === "admin_required") {
        setAdminOnly(true);
        setClinics([]);
        setLinks([]);
        return;
      }

      if (!response.ok) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.inline.loadFailed
          )
        );
      }

      setAdminOnly(false);
      setClinics(result.clinics ?? []);
      setLinks(result.links ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : copy.inline.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.inline.loadFailed, locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const linkedClinicIds = useMemo(
    () =>
      new Set(
        links
          .filter((link) => link.doctor_id === doctorId)
          .map((link) => link.clinic_id)
      ),
    [doctorId, links]
  );

  const associatedClinics = useMemo(
    () =>
      clinics
        .filter((clinic) => linkedClinicIds.has(clinic.id))
        .sort((a, b) => clinicName(a).localeCompare(clinicName(b), localeTag)),
    [clinicName, clinics, linkedClinicIds, localeTag]
  );

  const availableClinics = useMemo(() => {
    const query = normalize(clinicSearch);

    return clinics.filter((clinic) => {
      if (linkedClinicIds.has(clinic.id)) return false;
      if (!query) return true;

      return normalize(
        [clinicName(clinic), cityName(clinic), clinic.formatted_address, clinic.slug]
          .filter(Boolean)
          .join(" ")
      ).includes(query);
    });
  }, [cityName, clinicName, clinicSearch, clinics, linkedClinicIds, normalize]);

  function addClinic() {
    setError(null);
    setSuccess(null);

    if (!selectedClinicId) {
      setError(copy.inline.selectRequired);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/doctor-clinics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId, clinicId: selectedClinicId }),
        });
        const result = (await response.json()) as AssociationResponse;

        if (!response.ok) {
          throw new Error(
            getPlatformClinicApiMessage(
              locale,
              result.code,
              result.error ?? copy.inline.addFailed
            )
          );
        }

        setLinks((current) => [
          ...current,
          { doctor_id: doctorId, clinic_id: selectedClinicId },
        ]);
        setSelectedClinicId("");
        setSuccess(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.message ?? copy.inline.added
          )
        );
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : copy.inline.addFailed
        );
      }
    });
  }

  async function removeClinic(clinicId: string) {
    setError(null);
    setSuccess(null);
    setRemovingClinicId(clinicId);

    try {
      const response = await fetch("/api/admin/doctor-clinics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, clinicId }),
      });
      const result = (await response.json()) as AssociationResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.inline.removeFailed
          )
        );
      }

      setLinks((current) =>
        current.filter(
          (link) =>
            !(link.doctor_id === doctorId && link.clinic_id === clinicId)
        )
      );
      setSuccess(
        getPlatformClinicApiMessage(
          locale,
          result.code,
          result.message ?? copy.inline.removed
        )
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : copy.inline.removeFailed
      );
    } finally {
      setRemovingClinicId(null);
    }
  }

  return (
    <div className="mt-[21px] rounded-xl border border-gray-200 bg-gray-50 p-[21px]">
      <h3 className="font-semibold text-gray-900">{copy.inline.title}</h3>
      <p className="mt-[8px] text-sm leading-6 text-gray-600">
        {copy.inline.description}
      </p>

      {error ? (
        <p className="mt-[13px] rounded-lg border border-red-200 bg-red-50 px-[13px] py-[8px] text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {adminOnly ? (
        <p className="mt-[13px] rounded-lg border border-blue-200 bg-blue-50 px-[13px] py-[8px] text-sm text-blue-800">
          {copy.inline.adminOnly}
        </p>
      ) : null}
      {success ? (
        <p className="mt-[13px] rounded-lg border border-green-200 bg-green-50 px-[13px] py-[8px] text-sm text-green-800">
          {success}
        </p>
      ) : null}

      {adminOnly ? null : isLoading ? (
        <p className="mt-[13px] text-sm text-gray-600">{copy.inline.loading}</p>
      ) : (
        <>
          <div className="mt-[21px] grid gap-[13px] md:grid-cols-[1fr_1fr_auto]">
            <input
              type="search"
              value={clinicSearch}
              onChange={(event) => setClinicSearch(event.target.value)}
              placeholder={copy.inline.search}
              className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            />
            <select
              value={selectedClinicId}
              onChange={(event) => setSelectedClinicId(event.target.value)}
              className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-[13px] py-[13px] text-sm"
            >
              <option value="">{copy.inline.select}</option>
              {availableClinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinicName(clinic)} — {cityName(clinic)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              onClick={addClinic}
              disabled={isSaving || !selectedClinicId}
            >
              {isSaving ? copy.inline.adding : copy.inline.add}
            </Button>
          </div>

          <div className="mt-[21px] space-y-[13px]">
            {associatedClinics.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-600">
                {copy.inline.empty}
              </p>
            ) : (
              associatedClinics.map((clinic) => (
                <div
                  key={clinic.id}
                  className="flex flex-col gap-[13px] rounded-lg border border-gray-200 bg-white p-[13px] sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {clinicName(clinic)}
                    </p>
                    <p className="mt-[5px] text-sm text-gray-600">
                      {cityName(clinic)}
                    </p>
                    {clinic.formatted_address ? (
                      <p className="mt-[5px] text-xs text-gray-500">
                        {clinic.formatted_address}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeClinic(clinic.id)}
                    disabled={removingClinicId === clinic.id}
                    className="romdoc-focus-ring rounded-lg border border-red-200 px-[13px] py-[8px] text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {removingClinicId === clinic.id
                      ? copy.inline.removing
                      : copy.inline.remove}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
