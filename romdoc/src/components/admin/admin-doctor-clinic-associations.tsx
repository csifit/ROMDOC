"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Button from "@/components/ui/button";

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
  doctor_translations: { locale: string; title: string | null }[] | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
  formatted_address: string | null;
  clinic_translations: { locale: string; name: string }[] | null;
  cities:
    | {
        slug: string;
        city_translations: { locale: string; name: string }[] | null;
      }
    | {
        slug: string;
        city_translations: { locale: string; name: string }[] | null;
      }[]
    | null;
};

type Link = { doctor_id: string; clinic_id: string };

type ApiResponse = {
  doctors?: Doctor[];
  clinics?: Clinic[];
  links?: Link[];
  message?: string;
  error?: string;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function doctorName(doctor: Doctor) {
  const profile = first(doctor.profile);
  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || doctor.slug;
}

function doctorTitle(doctor: Doctor) {
  return (
    doctor.doctor_translations?.find((item) => item.locale === "ro")?.title ??
    doctor.doctor_translations?.[0]?.title ??
    "Medic"
  );
}

function clinicName(clinic: Clinic) {
  return (
    clinic.clinic_translations?.find((item) => item.locale === "ro")?.name ??
    clinic.clinic_translations?.[0]?.name ??
    clinic.slug
  );
}

function cityName(clinic: Clinic) {
  const city = first(clinic.cities);
  return (
    city?.city_translations?.find((item) => item.locale === "ro")?.name ??
    city?.city_translations?.[0]?.name ??
    city?.slug ??
    "Oraș necunoscut"
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .trim();
}

export default function AdminDoctorClinicAssociations() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/admin/doctor-clinics", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(result.error ?? "Datele nu au putut fi încărcate.");
      setDoctors(result.doctors ?? []);
      setClinics(result.clinics ?? []);
      setLinks(result.links ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Datele nu au putut fi încărcate.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredDoctors = useMemo(() => {
    const query = normalize(doctorSearch);
    if (!query) return doctors;
    return doctors.filter((doctor) =>
      normalize([doctorName(doctor), doctorTitle(doctor), doctor.email, doctor.slug].filter(Boolean).join(" ")).includes(query)
    );
  }, [doctorSearch, doctors]);

  const linkedClinicIds = useMemo(
    () => new Set(links.filter((link) => link.doctor_id === doctorId).map((link) => link.clinic_id)),
    [doctorId, links]
  );

  const availableClinics = useMemo(() => {
    const query = normalize(clinicSearch);
    return clinics.filter((clinic) => {
      if (linkedClinicIds.has(clinic.id)) return false;
      if (!query) return true;
      return normalize([clinicName(clinic), cityName(clinic), clinic.formatted_address, clinic.slug].filter(Boolean).join(" ")).includes(query);
    });
  }, [clinicSearch, clinics, linkedClinicIds]);

  const associatedClinics = useMemo(
    () => clinics.filter((clinic) => linkedClinicIds.has(clinic.id)),
    [clinics, linkedClinicIds]
  );

  function associate() {
    setError(null);
    setSuccess(null);

    if (!doctorId || !clinicId) {
      setError("Selectează un medic și o clinică.");
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
        if (!response.ok) throw new Error(result.error ?? "Asocierea nu a putut fi salvată.");
        setLinks((current) =>
          current.some((link) => link.doctor_id === doctorId && link.clinic_id === clinicId)
            ? current
            : [...current, { doctor_id: doctorId, clinic_id: clinicId }]
        );
        setClinicId("");
        setSuccess(result.message ?? "Medicul a fost asociat clinicii.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Asocierea nu a putut fi salvată.");
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
      if (!response.ok) throw new Error(result.error ?? "Asocierea nu a putut fi eliminată.");
      setLinks((current) =>
        current.filter((link) => !(link.doctor_id === doctorId && link.clinic_id === clinicIdToRemove))
      );
      setSuccess(result.message ?? "Asocierea a fost eliminată.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Asocierea nu a putut fi eliminată.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-[#9A4F35]">Asocieri</p>
      <h2 className="mt-2 text-2xl font-bold text-gray-900">Asociază medici cu clinici</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
        Un medic poate lucra în mai multe clinici, iar o clinică poate avea mai mulți medici.
      </p>

      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</p> : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-gray-600">Se încarcă...</p>
      ) : (
        <div className="mt-7 grid gap-7 xl:grid-cols-2">
          <div className="space-y-5">
            <input
              type="search"
              value={doctorSearch}
              onChange={(event) => setDoctorSearch(event.target.value)}
              placeholder="Caută medicul"
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 px-4 py-3"
            />

            <select
              value={doctorId}
              onChange={(event) => {
                setDoctorId(event.target.value);
                setClinicId("");
              }}
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
            >
              <option value="">Selectează medicul</option>
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
              placeholder="Caută clinica după nume, oraș sau adresă"
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 px-4 py-3"
            />

            <select
              value={clinicId}
              onChange={(event) => setClinicId(event.target.value)}
              disabled={!doctorId}
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-4 py-3 disabled:bg-gray-100"
            >
              <option value="">{doctorId ? "Selectează clinica" : "Selectează mai întâi medicul"}</option>
              {availableClinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinicName(clinic)} — {cityName(clinic)}
                </option>
              ))}
            </select>

            <Button type="button" onClick={associate} disabled={isSaving || !doctorId || !clinicId}>
              {isSaving ? "Se asociază..." : "Asociază medicul cu clinica"}
            </Button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="text-lg font-bold text-gray-900">Clinici asociate</h3>
            {!doctorId ? <p className="mt-3 text-sm text-gray-600">Selectează un medic.</p> : null}
            {doctorId && associatedClinics.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">Medicul nu are clinici asociate.</p>
            ) : null}

            <div className="mt-4 space-y-3">
              {associatedClinics.map((clinic) => (
                <div key={clinic.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="font-semibold text-gray-900">{clinicName(clinic)}</p>
                  <p className="mt-1 text-sm text-gray-600">{cityName(clinic)}</p>
                  {clinic.formatted_address ? <p className="mt-1 text-xs text-gray-500">{clinic.formatted_address}</p> : null}
                  <button
                    type="button"
                    onClick={() => void remove(clinic.id)}
                    disabled={removing === clinic.id}
                    className="romdoc-focus-ring mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {removing === clinic.id ? "Se elimină..." : "Elimină asocierea"}
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
