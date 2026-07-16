import { Link } from "@/i18n/navigation";

type Props = {
  currentPage: number;
  totalPages: number;
  selectedCity: string;
  selectedSpecialty: string;
  verifiedOnly: boolean;
  locale: "ro" | "en" | "de";
};

const labels = {
  ro: {
    navigation: "Navigare rezultate",
    previous: "Pagina anterioară",
    next: "Pagina următoare",
    page: "Pagina {page}",
    current: "Pagina curentă, {page}",
  },
  en: {
    navigation: "Results navigation",
    previous: "Previous page",
    next: "Next page",
    page: "Page {page}",
    current: "Current page, {page}",
  },
  de: {
    navigation: "Ergebnisnavigation",
    previous: "Vorherige Seite",
    next: "Nächste Seite",
    page: "Seite {page}",
    current: "Aktuelle Seite, {page}",
  },
} as const;

function pageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const values = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return [...values]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export default function DoctorDirectoryPagination({
  currentPage,
  totalPages,
  selectedCity,
  selectedSpecialty,
  verifiedOnly,
  locale,
}: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const t = labels[locale];
  const pages = pageNumbers(currentPage, totalPages);

  const buildQuery = (page: number) => ({
    ...(selectedCity ? { city: selectedCity } : {}),
    ...(selectedSpecialty ? { specialty: selectedSpecialty } : {}),
    ...(verifiedOnly ? { verified: "true" } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  });

  return (
    <nav
      aria-label={t.navigation}
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 ? (
        <Link
          href={{
            pathname: "/medici",
            query: buildQuery(currentPage - 1),
          }}
          scroll
          className="romdoc-button romdoc-button-secondary"
        >
          {t.previous}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="romdoc-button romdoc-button-secondary cursor-not-allowed opacity-50"
        >
          {t.previous}
        </span>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {pages.map((page, index) => {
          const previousPage = pages[index - 1];
          const showEllipsis =
            previousPage !== undefined && page - previousPage > 1;

          return (
            <div key={page} className="flex items-center gap-2">
              {showEllipsis && (
                <span aria-hidden="true" className="px-1 text-gray-500">
                  …
                </span>
              )}

              {page === currentPage ? (
                <span
                  aria-current="page"
                  aria-label={t.current.replace("{page}", String(page))}
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-[#036661] px-3 text-sm font-semibold text-white"
                >
                  {page}
                </span>
              ) : (
                <Link
                  href={{
                    pathname: "/medici",
                    query: buildQuery(page),
                  }}
                  scroll
                  aria-label={t.page.replace("{page}", String(page))}
                  className="romdoc-focus-ring inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:border-[#036661] hover:text-[#036661]"
                >
                  {page}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {currentPage < totalPages ? (
        <Link
          href={{
            pathname: "/medici",
            query: buildQuery(currentPage + 1),
          }}
          scroll
          className="romdoc-button romdoc-button-primary"
        >
          {t.next}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="romdoc-button romdoc-button-primary cursor-not-allowed opacity-50"
        >
          {t.next}
        </span>
      )}
    </nav>
  );
}
