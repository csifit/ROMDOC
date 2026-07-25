"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";

type Props = {
  value: string;
  locale: AppLocale;
  basePath: string;
  maxMonth?: string | null;
  className?: string;
};

type Copy = {
  month: string;
  chooseMonth: string;
  previousMonth: string;
  nextMonth: string;
  previousYear: string;
  nextYear: string;
};

const INTL_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

const COPY: Record<AppLocale, Copy> = {
  ro: {
    month: "Lună",
    chooseMonth: "Alege luna",
    previousMonth: "Luna precedentă",
    nextMonth: "Luna următoare",
    previousYear: "Anul precedent",
    nextYear: "Anul următor",
  },
  en: {
    month: "Month",
    chooseMonth: "Choose month",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    previousYear: "Previous year",
    nextYear: "Next year",
  },
  de: {
    month: "Monat",
    chooseMonth: "Monat auswählen",
    previousMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    previousYear: "Vorheriges Jahr",
    nextYear: "Nächstes Jahr",
  },
};

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));

  return `${shifted.getUTCFullYear()}-${String(
    shifted.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function formatMonthLabel(value: string, locale: AppLocale) {
  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

export default function ClinicManagerMonthSelector({
  value,
  locale,
  basePath,
  maxMonth = null,
  className = "",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = COPY[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(Number(value.slice(0, 4)));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleYear(Number(value.slice(0, 4)));
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat(INTL_LOCALE[locale], {
          month: "short",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, index, 15)))
      ),
    [locale]
  );

  function navigate(nextMonth: string) {
    if (maxMonth && nextMonth > maxMonth) return;

    const parameters = new URLSearchParams(searchParams.toString());
    parameters.set("month", nextMonth);
    router.push(`${basePath}?${parameters.toString()}`);
    setIsOpen(false);
  }

  const previousValue = shiftMonth(value, -1);
  const nextValue = shiftMonth(value, 1);
  const nextDisabled = Boolean(maxMonth && nextValue > maxMonth);

  return (
    <div ref={containerRef} className={`relative ${className}`.trim()}>
      <span className="text-sm font-semibold text-gray-700">{copy.month}</span>

      <div className="mt-[5px] flex min-h-11 w-full overflow-hidden rounded-[10px] border border-gray-300 bg-white">
        <button
          type="button"
          onClick={() => navigate(previousValue)}
          aria-label={copy.previousMonth}
          title={copy.previousMonth}
          className="romdoc-focus-ring flex w-11 shrink-0 items-center justify-center border-r border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15 18-6-6 6-6"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={copy.chooseMonth}
          className="romdoc-focus-ring flex min-w-0 flex-1 items-center justify-between gap-3 px-[13px] text-left text-sm font-semibold capitalize text-gray-900 transition hover:bg-gray-50"
        >
          <span className="truncate">{formatMonthLabel(value, locale)}</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m6 9 6 6 6-6"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => navigate(nextValue)}
          disabled={nextDisabled}
          aria-label={copy.nextMonth}
          title={copy.nextMonth}
          className="romdoc-focus-ring flex w-11 shrink-0 items-center justify-center border-l border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-300"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m9 18 6-6-6-6"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-label={copy.chooseMonth}
          className="absolute left-0 top-full z-30 mt-[8px] w-full min-w-[280px] rounded-[16px] border border-gray-200 bg-white p-[13px] shadow-lg"
        >
          <div className="flex items-center justify-between gap-[8px]">
            <button
              type="button"
              onClick={() => setVisibleYear((year) => year - 1)}
              aria-label={copy.previousYear}
              title={copy.previousYear}
              className="romdoc-focus-ring flex h-9 w-9 items-center justify-center rounded-[9px] text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              ←
            </button>

            <p className="text-sm font-bold text-gray-900">{visibleYear}</p>

            <button
              type="button"
              onClick={() => setVisibleYear((year) => year + 1)}
              aria-label={copy.nextYear}
              title={copy.nextYear}
              className="romdoc-focus-ring flex h-9 w-9 items-center justify-center rounded-[9px] text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              →
            </button>
          </div>

          <div className="mt-[8px] grid grid-cols-3 gap-[5px]">
            {monthNames.map((monthName, index) => {
              const candidate = `${visibleYear}-${String(index + 1).padStart(
                2,
                "0"
              )}`;
              const selected = candidate === value;
              const disabled = Boolean(maxMonth && candidate > maxMonth);

              return (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => navigate(candidate)}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={`romdoc-focus-ring rounded-[9px] px-[8px] py-[8px] text-sm font-semibold capitalize transition disabled:cursor-not-allowed disabled:text-gray-300 ${
                    selected
                      ? "bg-[#036661] text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
