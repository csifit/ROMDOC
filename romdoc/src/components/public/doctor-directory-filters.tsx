"use client";

import {
  useState,
  useTransition,
} from "react";
import {
  useRouter,
} from "next/navigation";

type FilterOption = {
  slug: string;
  name: string;
};

type DoctorDirectoryFiltersProps = {
  cities: FilterOption[];
  specialties:
    FilterOption[];
  initialCity: string;
  initialSpecialty:
    string;
  initialVerified:
    boolean;
};

export default function DoctorDirectoryFilters({
  cities,
  specialties,
  initialCity,
  initialSpecialty,
  initialVerified,
}: DoctorDirectoryFiltersProps) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [city, setCity] =
    useState(
      initialCity
    );

  const [
    specialty,
    setSpecialty,
  ] =
    useState(
      initialSpecialty
    );

  const [
    verified,
    setVerified,
  ] =
    useState(
      initialVerified
    );

  function applyFilters(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const searchParams =
      new URLSearchParams();

    if (city) {
      searchParams.set(
        "city",
        city
      );
    }

    if (specialty) {
      searchParams.set(
        "specialty",
        specialty
      );
    }

    if (verified) {
      searchParams.set(
        "verified",
        "true"
      );
    }

    const query =
      searchParams.toString();

    startTransition(() => {
      router.push(
        query
          ? `/medici?${query}`
          : "/medici"
      );
    });
  }

  function clearFilters() {
    setCity("");
    setSpecialty("");
    setVerified(
      false
    );

    startTransition(() => {
      router.push(
        "/medici"
      );
    });
  }

  return (
    <form
      onSubmit={
        applyFilters
      }
      className="mt-7"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-gray-800">
            Oraș
          </span>

          <select
            value={city}
            onChange={(
              event
            ) =>
              setCity(
                event.target.value
              )
            }
            className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          >
            <option value="">
              Toate orașele
            </option>

            {cities.map(
              (option) => (
                <option
                  key={
                    option.slug
                  }
                  value={
                    option.slug
                  }
                >
                  {option.name}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="text-sm font-semibold text-gray-800">
            Specialitate
          </span>

          <select
            value={
              specialty
            }
            onChange={(
              event
            ) =>
              setSpecialty(
                event.target.value
              )
            }
            className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          >
            <option value="">
              Toate specialitățile
            </option>

            {specialties.map(
              (option) => (
                <option
                  key={
                    option.slug
                  }
                  value={
                    option.slug
                  }
                >
                  {option.name}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      <label className="mt-5 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-[#036661]/40 hover:bg-white">
        <input
          type="checkbox"
          checked={
            verified
          }
          onChange={(
            event
          ) =>
            setVerified(
              event.target.checked
            )
          }
          className="h-5 w-5 rounded border-gray-300 text-[#036661] focus:ring-[#036661]"
        />

        <span>
          <span className="block text-sm font-semibold text-gray-900">
            Doar profesioniști medicali verificați
          </span>

          <span className="mt-0.5 block text-xs leading-5 text-gray-500">
            Afișează medicii care au primit badge-ul de verificare RomDoc.
          </span>
        </span>
      </label>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={
            isPending
          }
          className="rounded-xl bg-[#036661] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Se aplică..."
            : "Aplică filtrele"}
        </button>

        <button
          type="button"
          disabled={
            isPending
          }
          onClick={
            clearFilters
          }
          className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Resetează
        </button>
      </div>
    </form>
  );
}
