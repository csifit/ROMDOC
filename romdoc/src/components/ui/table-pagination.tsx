"use client";

import type { ChangeEvent } from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";

type Props = {
  locale: AppLocale;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

const COPY = {
  ro: {
    navigation: "Paginare tabel",
    previous: "Pagina precedentă",
    next: "Pagina următoare",
    page: "Pagina",
    of: "din",
    rowsPerPage: "Rânduri pe pagină",
    showing: "Se afișează {start}–{end} din {total}",
  },
  en: {
    navigation: "Table pagination",
    previous: "Previous page",
    next: "Next page",
    page: "Page",
    of: "of",
    rowsPerPage: "Rows per page",
    showing: "Showing {start}–{end} of {total}",
  },
  de: {
    navigation: "Tabellennavigation",
    previous: "Vorherige Seite",
    next: "Nächste Seite",
    page: "Seite",
    of: "von",
    rowsPerPage: "Zeilen pro Seite",
    showing: "{start}–{end} von {total} werden angezeigt",
  },
} as const;

function interpolate(
  template: string,
  values: Record<string, number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export default function TablePagination({
  locale,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: Props) {
  const copy = COPY[locale];
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return (
    <nav
      aria-label={copy.navigation}
      className="flex flex-col gap-[13px] border-t border-gray-200 bg-gray-50 px-[13px] py-[13px] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap items-center gap-[13px]">
        <p className="text-xs font-medium text-gray-600">
          {interpolate(copy.showing, {
            start,
            end,
            total: totalItems,
          })}
        </p>

        <label className="flex items-center gap-[8px] text-xs font-semibold text-gray-600">
          <span>{copy.rowsPerPage}</span>
          <select
            value={pageSize}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onPageSizeChange(Number(event.target.value))
            }
            className="romdoc-focus-ring min-h-[34px] rounded-[8px] border border-gray-300 bg-white px-[8px] text-sm text-gray-900"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="romdoc-focus-ring min-h-[34px] rounded-[8px] border border-gray-300 bg-white px-[13px] text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← {copy.previous}
        </button>

        <span className="min-w-[92px] text-center text-xs font-semibold text-gray-600">
          {copy.page} {safePage} {copy.of} {totalPages}
        </span>

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="romdoc-focus-ring min-h-[34px] rounded-[8px] border border-gray-300 bg-white px-[13px] text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copy.next} →
        </button>
      </div>
    </nav>
  );
}
