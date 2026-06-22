"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  useRouter,
} from "next/navigation";
import Button from "@/components/ui/button";

type FilterOption = {
  slug: string;
  name: string;
};

type HomepageDoctorFiltersProps = {
  specialties: FilterOption[];
  cities: FilterOption[];
};

export default function HomepageDoctorFilters({
  specialties,
  cities,
}: HomepageDoctorFiltersProps) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    specialtySlug,
    setSpecialtySlug,
  ] = useState("");

  const [
    citySlug,
    setCitySlug,
  ] = useState("");

  const [
    verifiedOnly,
    setVerifiedOnly,
  ] = useState(false);

  const [
    onlineOnly,
    setOnlineOnly,
  ] = useState(false);

  const canSearch =
    specialtySlug.length > 0 &&
    citySlug.length > 0;

  const selectedSpecialty =
    useMemo(
      () =>
        specialties.find(
          (specialty) =>
            specialty.slug ===
            specialtySlug
        ) ?? null,
      [
        specialties,
        specialtySlug,
      ]
    );

  const selectedCity =
    useMemo(
      () =>
        cities.find(
          (city) =>
            city.slug === citySlug
        ) ?? null,
      [cities, citySlug]
    );

  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canSearch) {
      return;
    }

    const searchParams =
      new URLSearchParams();

    if (verifiedOnly) {
      searchParams.set(
        "verified",
        "true"
      );
    }

    if (onlineOnly) {
      searchParams.set(
        "online",
        "true"
      );
    }

    const query =
      searchParams.toString();

    const target =
      `/medici/${encodeURIComponent(
        specialtySlug
      )}/${encodeURIComponent(
        citySlug
      )}${query ? `?${query}` : ""}`;

    startTransition(() => {
      router.push(target);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-800">
            Specialitate
          </span>

          <select
            value={specialtySlug}
            onChange={(event) =>
              setSpecialtySlug(
                event.target.value
              )
            }
            className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          >
            <option value="">
              Alege specialitatea
            </option>

            {specialties.map(
              (specialty) => (
                <option
                  key={
                    specialty.slug
                  }
                  value={
                    specialty.slug
                  }
                >
                  {specialty.name}
                </option>
              )
            )}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-800">
            Oraș
          </span>

          <select
            value={citySlug}
            onChange={(event) =>
              setCitySlug(
                event.target.value
              )
            }
            className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          >
            <option value="">
              Alege orașul
            </option>

            {cities.map(
              (city) => (
                <option
                  key={city.slug}
                  value={city.slug}
                >
                  {city.name}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-[#036661]/40 hover:bg-white">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(event) =>
              setVerifiedOnly(
                event.target.checked
              )
            }
            className="h-5 w-5 rounded border-gray-300 text-[#036661] focus:ring-[#036661]"
          />

          <span>
            <span className="block text-sm font-semibold text-gray-900">
              Doar medici verificați
            </span>

            <span className="mt-0.5 block text-xs leading-5 text-gray-500">
              Afișează medicii ale căror acreditări au fost verificate de RomDoc.
            </span>
          </span>
        </label>

        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-[#036661]/40 hover:bg-white">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(event) =>
              setOnlineOnly(
                event.target.checked
              )
            }
            className="h-5 w-5 rounded border-gray-300 text-[#036661] focus:ring-[#036661]"
          />

          <span>
            <span className="block text-sm font-semibold text-gray-900">
              Programări online disponibile
            </span>

            <span className="mt-0.5 block text-xs leading-5 text-gray-500">
              Include doar medicii care au configurat intervale de disponibilitate.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          {selectedSpecialty &&
          selectedCity
            ? `${selectedSpecialty.name} în ${selectedCity.name}`
            : "Selectează specialitatea și orașul pentru a continua."}
        </p>

        <Button
          type="submit"
          size="lg"
          isLoading={isPending}
          loadingText="Se caută..."
          disabled={!canSearch}
        >
          Caută medici
        </Button>
      </div>
    </form>
  );
}
