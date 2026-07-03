"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";

type ClinicTranslation = {
  locale: string;
  name: string;
};

type CityTranslation = {
  locale: string;
  name: string;
};

type City = {
  id: string;
  slug: string;
  city_translations: CityTranslation[] | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
  formatted_address: string | null;
  clinic_translations: ClinicTranslation[] | null;
  cities: City | City[] | null;
};

type DoctorClinicLink = {
  doctor_id: string;
  clinic_id: string;
};

type AssociationResponse = {
  clinics?: Clinic[];
  links?: DoctorClinicLink[];
  message?: string;
  error?: string;
};

type Props = {
  doctorId: string;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getClinicName(clinic: Clinic) {
  return (
    clinic.clinic_translations?.find(
      (translation) => translation.locale === "ro"
    )?.name ??
    clinic.clinic_translations?.[0]?.name ??
    clinic.slug
  );
}

function getCityName(clinic: Clinic) {
  const city = firstRelation(clinic.cities);

  return (
    city?.city_translations?.find(
      (translation) => translation.locale === "ro"
    )?.name ??
    city?.city_translations?.[0]?.name ??
    city?.slug ??
    "Oraș necunoscut"
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .trim();
}

export default function AdminDoctorClinicsInline({ doctorId }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startTransition] = useTransition();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [links, setLinks] = useState<DoctorClinicLink[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removingClinicId, setRemovingClinicId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/admin/doctor-clinics", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as AssociationResponse;

      if (!response.ok) {
        throw new Error(
          result.error ?? "Clinicile medicului nu au putut fi încărcate."
        );
      }

      setClinics(result.clinics ?? []);
      setLinks(result.links ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Clinicile medicului nu au putut fi încărcate."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    [links, doctorId]
  );

  const associatedClinics = useMemo(
    () =>
      clinics
        .filter((clinic) => linkedClinicIds.has(clinic.id))
        .sort((a, b) =>
          getClinicName(a).localeCompare(getClinicName(b), "ro")
        ),
    [clinics, linkedClinicIds]
  );

  const availableClinics = useMemo(() => {
    const query = normalizeSearch(clinicSearch);

    return clinics.filter((clinic) => {
      if (linkedClinicIds.has(clinic.id)) return false;
      if (!query) return true;

      const haystack = normalizeSearch(
        [
          getClinicName(clinic),
          getCityName(clinic),
          clinic.formatted_address,
          clinic.slug,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return haystack.includes(query);
    });
  }, [clinics, clinicSearch, linkedClinicIds]);

  function addClinic() {
    setError(null);
    setSuccess(null);

    if (!selectedClinicId) {
      setError("Selectează o clinică.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/doctor-clinics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            doctorId,
            clinicId: selectedClinicId,
          }),
        });

        const result = (await response.json()) as AssociationResponse;

        if (!response.ok) {
          throw new Error(
            result.error ?? "Clinica nu a putut fi asociată."
          );
        }

        setLinks((current) => [
          ...current,
          {
            doctor_id: doctorId,
            clinic_id: selectedClinicId,
          },
        ]);

        setSelectedClinicId("");
        setSuccess(
          result.message ?? "Clinica a fost asociată medicului."
        );
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Clinica nu a putut fi asociată."
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId,
          clinicId,
        }),
      });

      const result = (await response.json()) as AssociationResponse;

      if (!response.ok) {
        throw new Error(
          result.error ?? "Asocierea nu a putut fi eliminată."
        );
      }

      setLinks((current) =>
        current.filter(
          (link) =>
            !(
              link.doctor_id === doctorId &&
              link.clinic_id === clinicId
            )
        )
      );

      setSuccess(result.message ?? "Asocierea a fost eliminată.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Asocierea nu a putut fi eliminată."
      );
    } finally {
      setRemovingClinicId(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
      <h3 className="font-semibold text-gray-900">
        Clinici asociate
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Adaugă sau elimină clinicile acestui medic. Sunt disponibile numai clinicile aprobate.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-600">
          Se încarcă clinicile...
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              type="search"
              value={clinicSearch}
              onChange={(event) => setClinicSearch(event.target.value)}
              className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
              placeholder="Caută clinică, oraș sau adresă"
            />

            <select
              value={selectedClinicId}
              onChange={(event) => setSelectedClinicId(event.target.value)}
              className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
            >
              <option value="">Selectează clinica</option>

              {availableClinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {getClinicName(clinic)} — {getCityName(clinic)}
                </option>
              ))}
            </select>

            <Button
              type="button"
              size="sm"
              onClick={addClinic}
              disabled={isSaving || !selectedClinicId}
            >
              {isSaving ? "Se adaugă..." : "Adaugă"}
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {associatedClinics.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-600">
                Medicul nu este asociat încă niciunei clinici.
              </p>
            ) : (
              associatedClinics.map((clinic) => (
                <div
                  key={clinic.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {getClinicName(clinic)}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {getCityName(clinic)}
                    </p>

                    {clinic.formatted_address ? (
                      <p className="mt-1 text-xs text-gray-500">
                        {clinic.formatted_address}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeClinic(clinic.id)}
                    disabled={removingClinicId === clinic.id}
                    className="romdoc-focus-ring rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {removingClinicId === clinic.id
                      ? "Se elimină..."
                      : "Elimină"}
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
