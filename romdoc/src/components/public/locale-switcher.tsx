"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useParams,
} from "next/navigation";

import {
  usePathname,
  useRouter,
} from "@/i18n/navigation";
import {
  type AppLocale,
} from "@/i18n/routing";

function getStringParam(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

export default function
LocaleSwitcher() {
  const locale =
    useLocale() as AppLocale;

  const t =
    useTranslations("Locale");

  const pathname =
    usePathname();

  const params =
    useParams();

  const router =
    useRouter();

  function changeLocale(
    nextLocale: AppLocale
  ) {
    if (nextLocale === locale) {
      return;
    }

    if (
      pathname ===
      "/medici/[specialty]"
    ) {
      router.replace(
        {
          pathname:
            "/medici/[specialty]",
          params: {
            specialty:
              getStringParam(
                params.specialty
              ),
          },
        },
        {
          locale: nextLocale,
        }
      );

      return;
    }

    if (
      pathname ===
      "/medici/[specialty]/[city]"
    ) {
      router.replace(
        {
          pathname:
            "/medici/[specialty]/[city]",
          params: {
            specialty:
              getStringParam(
                params.specialty
              ),
            city:
              getStringParam(
                params.city
              ),
          },
        },
        {
          locale: nextLocale,
        }
      );

      return;
    }

    if (
      pathname ===
      "/doctor/[slug]"
    ) {
      router.replace(
        {
          pathname:
            "/doctor/[slug]",
          params: {
            slug:
              getStringParam(
                params.slug
              ),
          },
        },
        {
          locale: nextLocale,
        }
      );

      return;
    }

    router.replace(
      pathname,
      {
        locale: nextLocale,
      }
    );
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
      <span className="sr-only">
        Limbă
      </span>

      <select
        value={locale}
        onChange={(event) =>
          changeLocale(
            event.target
              .value as AppLocale
          )
        }
        className="romdoc-focus-ring rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        aria-label="Selectează limba"
      >
        <option value="ro">
          {t("romanian")}
        </option>

        <option value="en">
          {t("english")}
        </option>
      </select>
    </label>
  );
}
