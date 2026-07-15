"use client";

import {
  useEffect,
  useId,
  useState,
} from "react";

type DoctorInvoicingSearchProps = {
  targetId: string;
};

export default function DoctorInvoicingSearch({
  targetId,
}: DoctorInvoicingSearchProps) {
  const inputId = useId();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    visibleCount,
    setVisibleCount,
  ] = useState<number | null>(
    null
  );

  useEffect(() => {
    const container =
      document.getElementById(
        targetId
      );

    if (!container) {
      setVisibleCount(0);
      return;
    }

    const rows =
      Array.from(
        container.querySelectorAll<HTMLElement>(
          "[data-doctor-invoicing-row]"
        )
      );

    const normalizedSearch =
      search
        .trim()
        .toLocaleLowerCase(
          "ro-RO"
        );

    let nextVisibleCount = 0;

    for (const row of rows) {
      const searchableText =
        (
          row.textContent ?? ""
        )
          .replace(/\s+/g, " ")
          .trim()
          .toLocaleLowerCase(
            "ro-RO"
          );

      const isVisible =
        normalizedSearch.length === 0 ||
        searchableText.includes(
          normalizedSearch
        );

      row.hidden = !isVisible;

      if (isVisible) {
        nextVisibleCount += 1;
      }
    }

    setVisibleCount(
      nextVisibleCount
    );
  }, [search, targetId]);

  return (
    <div className="mt-5">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-gray-800"
      >
        Caută medic
      </label>

      <div className="relative mt-2">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400"
        >
          ⌕
        </span>

        <input
          id={inputId}
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Caută după nume, e-mail, CUI, firmă, clinică sau status..."
          className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {search.trim() ? (
        <p
          className="mt-2 text-xs text-gray-500"
          aria-live="polite"
        >
          {visibleCount === 1
            ? "1 medic găsit"
            : `${visibleCount ?? 0} medici găsiți`}
        </p>
      ) : null}
    </div>
  );
}
