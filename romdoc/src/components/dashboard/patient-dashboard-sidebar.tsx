"use client";

import Link from "next/link";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/client";

type PatientDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  accountStatus: string;
  children: ReactNode;
  footer?: ReactNode;
};

type NavigationIcon =
  | "appointments"
  | "folder"
  | "doctors"
  | "savedDoctors"
  | "settings"
  | "home";

type NavigationItem = {
  id: string;
  href: string;
  label: string;
  icon: NavigationIcon;
};

function getDirectoryHref(
  locale:
    | "ro"
    | "en"
    | "de"
) {
  if (locale === "de") {
    return "/de/aerzte";
  }

  if (locale === "en") {
    return "/en/doctors";
  }

  return "/ro/medici";
}

function Icon({
  type,
}: {
  type:
    NavigationIcon;
}) {
  const commonProps = {
    viewBox:
      "0 0 24 24",
    "aria-hidden":
      true,
    className:
      "h-5 w-5 shrink-0",
    fill:
      "none",
    stroke:
      "currentColor",
    strokeWidth:
      1.8,
  };

  switch (type) {
    case "appointments":
      return (
        <svg {...commonProps}>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
          />

          <path
            strokeLinecap="round"
            d="M8 3v4M16 3v4M3 10h18"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.5 15 2 2 5-5"
          />
        </svg>
      );

    case "folder":
      return (
        <svg {...commonProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
          />

          <path
            strokeLinecap="round"
            d="M8 13h8M8 16h5"
          />
        </svg>
      );

    case "doctors":
      return (
        <svg {...commonProps}>
          <circle
            cx="12"
            cy="8"
            r="4"
          />

          <path
            strokeLinecap="round"
            d="M5 21c.7-4 3.1-6 7-6s6.3 2 7 6"
          />

          <path
            strokeLinecap="round"
            d="M18 5v4M16 7h4"
          />
        </svg>
      );

    case "savedDoctors":
      return (
        <svg {...commonProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
          />
        </svg>
      );

    case "settings":
      return (
        <svg {...commonProps}>
          <circle
            cx="12"
            cy="12"
            r="3"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
          />
        </svg>
      );

    default:
      return (
        <svg {...commonProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m3 11 9-8 9 8"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 10v10h14V10M9 20v-6h6v6"
          />
        </svg>
      );
  }
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        d="M4 7h16M4 12h16M4 17h16"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        d="M6 6l12 12M18 6 6 18"
      />
    </svg>
  );
}

function CollapseIcon({
  collapsed,
}: {
  collapsed:
    boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          collapsed
            ? "m9 6 6 6-6 6"
            : "m15 6-6 6 6 6"
        }
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15 8 4 4-4 4M19 12H9"
      />
    </svg>
  );
}

function getInitials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 0) {
    return "P";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

function isActiveRoute(
  pathname: string,
  item:
    NavigationItem
) {
  if (
    item.id ===
    "appointments"
  ) {
    return (
      pathname ===
      "/patient-dashboard"
    );
  }

  if (
    item.href.startsWith(
      "/patient-dashboard"
    )
  ) {
    return (
      pathname ===
        item.href ||
      pathname.startsWith(
        `${item.href}/`
      )
    );
  }

  return (
    pathname ===
    item.href
  );
}

export default function PatientDashboardSidebar({
  userName,
  userEmail,
  accountStatus,
  children,
  footer,
}: PatientDashboardSidebarProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientDashboard.sidebar"
    );

  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    isCollapsed,
    setIsCollapsed,
  ] =
    useState(false);

  const [
    isMobileOpen,
    setIsMobileOpen,
  ] =
    useState(false);

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  const isClosurePending =
    accountStatus ===
    "closure_requested";

  const directoryHref =
    getDirectoryHref(
      locale
    );

  const navigationItems =
    useMemo<
      NavigationItem[]
    >(
      () => [
        {
          id: "appointments",
          href:
            "/patient-dashboard",
          label:
            t("appointments"),
          icon:
            "appointments",
        },
        {
          id: "folder",
          href:
            "/patient-dashboard/folder",
          label:
            t("folder"),
          icon:
            "folder",
        },
        {
          id: "account",
          href:
            "/patient-dashboard/account",
          label:
            t("account"),
          icon:
            "settings",
        },
        {
          id: "findDoctors",
          href:
            directoryHref,
          label:
            t("findDoctors"),
          icon:
            "doctors",
        },
        {
          id: "savedDoctors",
          href:
            "/patient-dashboard/saved-doctors",
          label:
            t("savedDoctors"),
          icon:
            "savedDoctors",
        },
        {
          id: "home",
          href:
            `/${locale}`,
          label:
            t("home"),
          icon:
            "home",
        },
      ],
      [
        directoryHref,
        locale,
        t,
      ]
    );

  useEffect(() => {
    if (
      isClosurePending &&
      pathname !==
        "/patient-dashboard/account"
    ) {
      router.replace(
        "/patient-dashboard/account"
      );
    }
  }, [
    isClosurePending,
    pathname,
    router,
  ]);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      const supabase =
        createClient();

      const {
        error,
      } =
        await supabase.auth
          .signOut();

      if (error) {
        console.error(
          "Patient sign-out failed:",
          error
        );
        return;
      }

      setIsMobileOpen(false);

      router.replace(
        `/login?locale=${locale}`
      );

      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const desktopWidth =
    isCollapsed
      ? "lg:w-20"
      : "lg:w-72";

  const contentPadding =
    isCollapsed
      ? "lg:pl-20"
      : "lg:pl-72";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div
        className={`flex min-h-20 items-center border-b border-gray-200 px-4 ${
          isCollapsed
            ? "justify-center"
            : "justify-between"
        }`}
      >
        {!isCollapsed && (
          <Link
            href="/patient-dashboard"
            onClick={() =>
              setIsMobileOpen(false)
            }
            className="romdoc-focus-ring rounded-md text-2xl font-bold tracking-tight text-gray-900"
          >
            {t("brand")}
          </Link>
        )}

        <button
          type="button"
          onClick={() =>
            setIsCollapsed(
              (current) =>
                !current
            )
          }
          aria-label={
            isCollapsed
              ? t("expandMenu")
              : t("collapseMenu")
          }
          title={
            isCollapsed
              ? t("expandMenu")
              : t("collapseMenu")
          }
          className="romdoc-focus-ring hidden rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:inline-flex"
        >
          <CollapseIcon
            collapsed={
              isCollapsed
            }
          />
        </button>
      </div>

      <div className="border-b border-gray-200 p-4">
        <div
          className={`flex items-center ${
            isCollapsed
              ? "justify-center"
              : "gap-3"
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#036661] text-sm font-bold text-white">
            {getInitials(
              userName
            )}
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {userName}
              </p>

              <p className="truncate text-xs text-gray-500">
                {userEmail}
              </p>

              <span className="mt-1 inline-flex rounded-full bg-[#036661]/10 px-2.5 py-1 text-xs font-semibold text-[#036661]">
                {t("role")}
              </span>

              {isClosurePending && (
                <span className="ml-1 mt-1 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {t(
                    "closureRequested"
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <nav
        aria-label={t(
          "navigationAria"
        )}
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {navigationItems.map(
          (item) => {
            if (
              isClosurePending &&
              item.id !==
                "account"
            ) {
              return null;
            }

            const active =
              isActiveRoute(
                pathname,
                item
              );

            return (
              <Link
                key={
                  item.id
                }
                href={
                  item.href
                }
                onClick={() =>
                  setIsMobileOpen(
                    false
                  )
                }
                title={
                  isCollapsed
                    ? item.label
                    : undefined
                }
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={`romdoc-focus-ring flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isCollapsed
                    ? "justify-center"
                    : "gap-3"
                } ${
                  active
                    ? "bg-[#036661]/10 text-[#036661]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon
                  type={
                    item.icon
                  }
                />

                {!isCollapsed && (
                  <span>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          }
        )}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <button
          type="button"
          onClick={
            handleSignOut
          }
          disabled={
            isSigningOut
          }
          title={
            isCollapsed
              ? t("signOut")
              : undefined
          }
          className={`romdoc-focus-ring flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${
            isCollapsed
              ? "justify-center"
              : "gap-3"
          }`}
        >
          <LogoutIcon />

          {!isCollapsed && (
            <span>
              {isSigningOut
                ? t("signingOut")
                : t("signOut")}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0EEE9]">
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
        <Link
          href="/patient-dashboard"
          className="romdoc-focus-ring rounded-md text-xl font-bold text-gray-900"
        >
          {t("brand")}
        </Link>

        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(true)
          }
          aria-label={t(
            "openMenu"
          )}
          className="romdoc-focus-ring rounded-lg p-2 text-gray-700 transition hover:bg-gray-100"
        >
          <MenuIcon />
        </button>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-gray-200 bg-white transition-[width] duration-200 lg:block ${desktopWidth}`}
      >
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t(
              "closeMenu"
            )}
            onClick={() =>
              setIsMobileOpen(
                false
              )
            }
            className="absolute inset-0 bg-black/40"
          />

          <aside className="relative h-full w-[min(20rem,88vw)] bg-white shadow-xl">
            <button
              type="button"
              onClick={() =>
                setIsMobileOpen(
                  false
                )
              }
              aria-label={t(
                "closeMenu"
              )}
              className="romdoc-focus-ring absolute right-3 top-3 z-10 rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
            >
              <CloseIcon />
            </button>

            {sidebarContent}
          </aside>
        </div>
      )}

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ${contentPadding}`}
      >
        <div className="hidden min-h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t(
                "accountEyebrow"
              )}
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-900">
              {t(
                "welcome",
                {
                  name:
                    userName,
                }
              )}
            </p>
          </div>

          {isClosurePending ? (
            <span className="rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-900">
              {t(
                "closurePending"
              )}
            </span>
          ) : (
            <Link
              href={
                directoryHref
              }
              className="rounded-xl bg-[#036661] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff2800]"
            >
              {t(
                "findDoctor"
              )}
            </Link>
          )}
        </div>

        <main className="flex-1">
          {children}
        </main>

        {footer}
      </div>
    </div>
  );
}
