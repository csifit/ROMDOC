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
import GlobalGooglePlaceAutocomplete from "@/components/public/global-google-place-autocomplete";
import type {
  GoogleClinicAddress,
} from "@/lib/locations/google-address";

type FilterOption = {
  slug: string;
  name: string;
};

type HomepageDoctorFiltersProps = {
  specialties: FilterOption[];
};

type RadiusOption = 10 | 50;

export default function HomepageDoctorFilters({
  specialties,
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
    selectedLocation,
    setSelectedLocation,
  ] =
    useState<GoogleClinicAddress | null>(
      null
    );

  const [
    radius,
    setRadius,
  ] = useState<RadiusOption>(
    10
  );

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
    selectedLocation !== null;

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

  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !canSearch ||
      !selectedLocation
    ) {
      return;
    }

    const searchParams =
      new URLSearchParams({
        specialty:
          specialtySlug,

        lat:
          selectedLocation
            .latitude
            .toString(),

        lng:
          selectedLocation
            .longitude
            .toString(),

        radius:
          radius.toString(),

        placeId:
          selectedLocation
            .placeId,

        location:
          selectedLocation
            .formattedAddress,

        country:
          selectedLocation
            .countryCode,
      });

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

    startTransition(() => {
      router.push(
        `/medici/cautare?${searchParams.toString()}`
      );
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

        <GlobalGooglePlaceAutocomplete
          onPlaceSelected={
            setSelectedLocation
          }
          onClear={() =>
            setSelectedLocation(
              null
            )
          }
          disabled={isPending}
        />
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-gray-800">
          Raza de căutare
        </legend>

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(
            [10, 50] as const
          ).map(
            (option) => (
              <label
                key={option}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  radius === option
                    ? "border-[#036661] bg-[#036661]/5"
                    : "border-gray-200 bg-gray-50 hover:border-[#036661]/40 hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="radius"
                  value={option}
                  checked={
                    radius ===
                    option
                  }
                  onChange={() =>
                    setRadius(
                      option
                    )
                  }
                  className="h-4 w-4 border-gray-300 text-[#036661] focus:ring-[#036661]"
                />

                <span className="text-sm font-semibold text-gray-900">
                  {option} km
                </span>
              </label>
            )
          )}
        </div>
      </fieldset>

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
          selectedLocation
            ? `${selectedSpecialty.name} la maximum ${radius} km de ${selectedLocation.formattedAddress}`
            : "Selectează specialitatea și o locație Google pentru a continua."}
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
