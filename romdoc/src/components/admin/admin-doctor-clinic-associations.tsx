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

type Profile = {
  first_name: string | null;
  last_name: string | null;
  account_status: string | null;
};

type Doctor = {
  id: string;
  slug: string;
  status: string;
  email: string | null;
  profile: Profile | Profile[] | null;
  doctor_translations: Array<{
    locale: string;
    title: string | null;
  }> | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
  formatted_address: string | null;
  clinic_translations: Array<{
    locale: string;
    name: string;
  }> | null;
  cities:
    | {
        slug: string;
        city_translations: Array<{ locale: string; name: string }> | null;
      }
    | Array<{
        slug: string;
        city_translations: Array<{ locale: string; name: string }> | null;
      }>
    | null;
};

type DoctorClinicLink = {
  doctor_id: string;
  clinic_id: string;
};

type ApiResponse = PlatformOperatorClinicApiPayload & {
  doctors?: Doctor[];
  clinics?: Clinic[];
  links?: DoctorClinicLink[];
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default function AdminDoctorClinicAssociations() {
  const locale = normalizeAppLocale(useLocale());
  const localeTag = PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS[locale];
  const copy = getPlatformOperatorClinics(locale);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [links, setLinks] = useState<DoctorClinicLink[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const doctorName = useCallback((doctor: Doctor) => {
    const profile = first(doctor.profile);
    const name = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || doctor.slug;
  }, []);

  const doctorTitle = useCallback(
    (doctor: Doctor) =>
      selectTranslation(doctor.doctor_translations, locale)?.title ??
      copy.common.unknownDoctor,
    [copy.common.unknownDoctor, locale]
  );

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
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.associations.states.loadFailed
          )
        );
      }

      setDoctors(result.doctors ?? []);
      setClinics(result.clinics ?? []);
      setLinks(result.links ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : copy.associations.states.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.associations.states.loadFailed, locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredDoctors = useMemo(() => {
    const query = normalize(doctorSearch);
    if (!query) return doctors;

    return doctors.filter((doctor) =>
      normalize(
        [doctorName(doctor), doctorTitle(doctor), doctor.email, doctor.slug]
          .filter(Boolean)
          .join(" ")
      ).includes(query)
    );
  }, [doctorName, doctorSearch, doctorTitle, doctors, normalize]);

  const linkedClinicIds = useMemo(
    () =>
      new Set(
        links
          .filter((link) => link.doctor_id === doctorId)
          .map((link) => link.clinic_id)
      ),
    [doctorId, links]
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

  const associatedClinics = useMemo(
    () => clinics.filter((clinic) => linkedClinicIds.has(clinic.id)),
    [clinics, linkedClinicIds]
  );

  function associate() {
    setError(null);
    setSuccess(null);

    if (!doctorId || !clinicId) {
      setError(copy.associations.selectionRequired);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/doctor-clinics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId, clinicId }),
        });
        const result = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            getPlatformClinicApiMessage(
              locale,
              result.code,
              result.error ?? copy.associations.states.saveFailed
            )
          );
        }

        setLinks((current) =>
          current.some(
            (link) =>
              link.doctor_id === doctorId && link.clinic_id === clinicId
          )
            ? current
            : [...current, { doctor_id: doctorId, clinic_id: clinicId }]
        );
        setClinicId("");
        setSuccess(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.message ?? copy.associations.states.associated
          )
        );
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : copy.associations.states.saveFailed
        );
      }
    });
  }

  async function remove(clinicIdToRemove: string) {
    setError(null);
    setSuccess(null);
    setRemoving(clinicIdToRemove);

    try {
      const response = await fetch("/api/admin/doctor-clinics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, clinicId: clinicIdToRemove }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.error ?? copy.associations.states.removeFailed
          )
        );
      }

      setLinks((current) =>
        current.filter(
          (link) =>
            !(link.doctor_id === doctorId && link.clinic_id === clinicIdToRemove)
        )
      );
      setSuccess(
        getPlatformClinicApiMessage(
          locale,
          result.code,
          result.message ?? copy.associations.states.removed
        )
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : copy.associations.states.removeFailed
      );
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <p className="text-sm font-semibold text-[#9A4F35]">
        {copy.associations.eyebrow}
      </p>
      <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
        {copy.associations.title}
      </h2>
      <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
        {copy.associations.description}
      </p>

      {error ? (
        <p className="mt-[21px] rounded-xl border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-[21px] rounded-xl border border-green-200 bg-green-50 px-[13px] py-[13px] text-sm text-green-800">
          {success}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-[21px] text-sm text-gray-600">
          {copy.associations.states.loading}
        </p>
      ) : (
        <div className="mt-[21px] grid gap-[34px] xl:grid-cols-2">
          <div className="space-y-[13px]">
            <input
              type="search"
              value={doctorSearch}
              onChange={(event) => setDoctorSearch(event.target.value)}
              placeholder={copy.associations.doctorSearch}
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 px-[13px] py-[13px]"
            />

            <select
              value={doctorId}
              onChange={(event) => {
                setDoctorId(event.target.value);
                setClinicId("");
              }}
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px]"
            >
              <option value="">{copy.associations.selectDoctor}</option>
              {filteredDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctorName(doctor)} — {doctorTitle(doctor)}
                </option>
              ))}
            </select>

            <input
              type="search"
              value={clinicSearch}
              onChange={(event) => setClinicSearch(event.target.value)}
              placeholder={copy.associations.clinicSearch}
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 px-[13px] py-[13px]"
            />

            <select
              value={clinicId}
              onChange={(event) => setClinicId(event.target.value)}
              disabled={!doctorId}
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px] disabled:bg-gray-100"
            >
              <option value="">
                {doctorId
                  ? copy.associations.selectClinic
                  : copy.associations.selectDoctorFirst}
              </option>
              {availableClinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinicName(clinic)} — {cityName(clinic)}
                </option>
              ))}
            </select>

            <Button
              type="button"
              onClick={associate}
              disabled={isSaving || !doctorId || !clinicId}
            >
              {isSaving
                ? copy.associations.actions.associating
                : copy.associations.actions.associate}
            </Button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-[21px]">
            <h3 className="text-lg font-bold text-gray-900">
              {copy.associations.associated}
            </h3>
            {!doctorId ? (
              <p className="mt-[13px] text-sm text-gray-600">
                {copy.associations.selectDoctorHint}
              </p>
            ) : null}
            {doctorId && associatedClinics.length === 0 ? (
              <p className="mt-[13px] text-sm text-gray-600">
                {copy.associations.noClinics}
              </p>
            ) : null}

            <div className="mt-[13px] space-y-[13px]">
              {associatedClinics.map((clinic) => (
                <div
                  key={clinic.id}
                  className="rounded-xl border border-gray-200 bg-white p-[13px]"
                >
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
                  <button
                    type="button"
                    onClick={() => void remove(clinic.id)}
                    disabled={removing === clinic.id}
                    className="romdoc-focus-ring mt-[13px] rounded-lg border border-red-200 px-[13px] py-[8px] text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {removing === clinic.id
                      ? copy.associations.actions.removing
                      : copy.associations.actions.remove}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
