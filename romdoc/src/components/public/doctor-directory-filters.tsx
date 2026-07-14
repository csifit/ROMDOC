"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

type FilterOption = { slug: string; name: string };

type Props = {
  cities: FilterOption[];
  specialties: FilterOption[];
  initialCity: string;
  initialSpecialty: string;
  initialVerified: boolean;
  locale: "ro" | "en" | "de";
};

const labels = {
  ro: {
    city: "Oraș",
    allCities: "Toate orașele",
    specialty: "Specialitate",
    allSpecialties: "Toate specialitățile",
    verified: "Doar profesioniști medicali verificați",
    verifiedHelp: "Afișează medicii care au primit badge-ul de verificare RomDoc.",
    applying: "Se aplică...",
    apply: "Aplică filtrele",
    reset: "Resetează",
  },
  en: {
    city: "City",
    allCities: "All cities",
    specialty: "Specialty",
    allSpecialties: "All specialties",
    verified: "Verified medical professionals only",
    verifiedHelp: "Show doctors who have received the RomDoc verification badge.",
    applying: "Applying...",
    apply: "Apply filters",
    reset: "Reset",
  },
  de: {
    city: "Stadt",
    allCities: "Alle Städte",
    specialty: "Fachrichtung",
    allSpecialties: "Alle Fachrichtungen",
    verified: "Nur verifizierte medizinische Fachkräfte",
    verifiedHelp: "Zeigt Ärzte mit dem RomDoc-Verifizierungsabzeichen.",
    applying: "Wird angewendet...",
    apply: "Filter anwenden",
    reset: "Zurücksetzen",
  },
} as const;

export default function DoctorDirectoryFilters({ cities, specialties, initialCity, initialSpecialty, initialVerified, locale }: Props) {
  const router = useRouter();
  const t = labels[locale];
  const [isPending, startTransition] = useTransition();
  const [city, setCity] = useState(initialCity);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [verified, setVerified] = useState(initialVerified);

  function go(nextCity: string, nextSpecialty: string, nextVerified: boolean) {
    const query: Record<string, string> = {};

    if (nextCity) {
      query.city = nextCity;
    }

    if (nextSpecialty) {
      query.specialty = nextSpecialty;
    }

    if (nextVerified) {
      query.verified = "true";
    }

    startTransition(() => {
      router.push({
        pathname: "/medici",
        query,
      });
    });
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); go(city, specialty, verified); }} className="mt-7">
      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-gray-800">{t.city}</span>
          <select value={city} onChange={(event) => setCity(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20">
            <option value="">{t.allCities}</option>
            {cities.map((option) => <option key={option.slug} value={option.slug}>{option.name}</option>)}
          </select>
        </label>
        <label>
          <span className="text-sm font-semibold text-gray-800">{t.specialty}</span>
          <select value={specialty} onChange={(event) => setSpecialty(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20">
            <option value="">{t.allSpecialties}</option>
            {specialties.map((option) => <option key={option.slug} value={option.slug}>{option.name}</option>)}
          </select>
        </label>
      </div>

      <label className="mt-5 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-[#036661]/40 hover:bg-white">
        <input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} className="h-5 w-5 rounded border-gray-300 text-[#036661] focus:ring-[#036661]" />
        <span>
          <span className="block text-sm font-semibold text-gray-900">{t.verified}</span>
          <span className="mt-0.5 block text-xs leading-5 text-gray-500">{t.verifiedHelp}</span>
        </span>
      </label>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={isPending} className="rounded-xl bg-[#036661] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60">{isPending ? t.applying : t.apply}</button>
        <button type="button" disabled={isPending} onClick={() => { setCity(""); setSpecialty(""); setVerified(false); go("", "", false); }} className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60">{t.reset}</button>
      </div>
    </form>
  );
}
