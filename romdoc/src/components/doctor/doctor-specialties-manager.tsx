"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/button";

export type DoctorSpecialtyOption = {
  id: string;
  slug: string;
  name: string;
};

type DoctorSpecialtiesManagerProps = {
  specialties: DoctorSpecialtyOption[];
  initialSpecialtyIds: string[];
};

type ApiResponse = {
  success?: boolean;
  specialtyIds?: string[];
  error?: string;
};

export default function DoctorSpecialtiesManager({
  specialties,
  initialSpecialtyIds,
}: DoctorSpecialtiesManagerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSpecialtyIds
  );
  const [savedIds, setSavedIds] = useState<string[]>(
    initialSpecialtyIds
  );
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredSpecialties = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ro-RO");

    if (!query) {
      return specialties;
    }

    return specialties.filter((specialty) =>
      specialty.name.toLocaleLowerCase("ro-RO").includes(query)
    );
  }, [search, specialties]);

  const hasChanges =
    [...selectedIds].sort().join(",") !==
    [...savedIds].sort().join(",");

  function toggleSpecialty(specialtyId: string) {
    setMessage("");
    setError("");

    setSelectedIds((current) => {
      if (current.includes(specialtyId)) {
        return current.filter((id) => id !== specialtyId);
      }

      if (current.length >= 5) {
        setError("Poți selecta cel mult cinci specialități.");
        return current;
      }

      return [...current, specialtyId];
    });
  }

  async function saveSpecialties() {
    if (selectedIds.length === 0) {
      setError("Selectează cel puțin o specialitate.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/doctor/specialties", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          specialtyIds: selectedIds,
        }),
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Specialitățile nu au putut fi salvate."
        );
      }

      const nextSavedIds = payload.specialtyIds ?? selectedIds;
      setSelectedIds(nextSavedIds);
      setSavedIds(nextSavedIds);
      setMessage("Specialitățile au fost salvate.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Specialitățile nu au putut fi salvate."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            Domenii medicale
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Specialitățile mele
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Selectează între una și cinci specialități care descriu
            activitatea ta medicală. Acestea sunt folosite în director,
            filtre și paginile SEO RomDoc.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-[#F0EEE9] px-3 py-1.5 text-sm font-semibold text-gray-700">
          {selectedIds.length} / 5 selectate
        </span>
      </div>

      <div className="mt-6">
        <label
          htmlFor="specialty-search"
          className="text-sm font-semibold text-gray-800"
        >
          Caută specialitatea
        </label>

        <input
          id="specialty-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Exemplu: Cardiologie"
          className="romdoc-focus-ring mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900"
        />
      </div>

      <div className="mt-5 grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSpecialties.map((specialty) => {
          const selected = selectedIds.includes(specialty.id);

          return (
            <label
              key={specialty.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                selected
                  ? "border-[#036661] bg-emerald-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleSpecialty(specialty.id)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#036661] focus:ring-[#036661]"
              />

              <span className="text-sm font-medium text-gray-900">
                {specialty.name}
              </span>
            </label>
          );
        })}
      </div>

      {filteredSpecialties.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-600">
          Nu am găsit o specialitate care să corespundă căutării.
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => void saveSpecialties()}
          disabled={isSaving || !hasChanges || selectedIds.length === 0}
        >
          {isSaving ? "Se salvează..." : "Salvează specialitățile"}
        </Button>

        {hasChanges && (
          <button
            type="button"
            onClick={() => {
              setSelectedIds(savedIds);
              setMessage("");
              setError("");
            }}
            disabled={isSaving}
            className="romdoc-focus-ring rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Renunță la modificări
          </button>
        )}
      </div>
    </section>
  );
}
