"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  type ReactNode,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type PatientDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  children: ReactNode;
  footer?: ReactNode;
};

type NavigationIcon =
  | "overview"
  | "appointments"
  | "folder"
  | "doctors"
  | "home";

type NavigationItem = {
  href: string;
  label: string;
  icon: NavigationIcon;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/patient-dashboard",
    label: "Prezentare generală",
    icon: "overview",
  },
  {
    href: "/patient-dashboard",
    label: "Programările mele",
    icon: "appointments",
  },
  {
    href: "/patient-dashboard/folder",
    label: "Dosarul medical",
    icon: "folder",
  },
  {
    href: "/medici",
    label: "Caută medici",
    icon: "doctors",
  },
  {
    href: "/",
    label: "Pagina principală",
    icon: "home",
  },
];

function Icon({
  type,
}: {
  type: NavigationIcon;
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    className:
      "h-5 w-5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
  };

  switch (type) {
    case "overview":
      return (
        <svg {...commonProps}>
          <rect
            x="4"
            y="4"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="14"
            y="4"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="4"
            y="14"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="14"
            y="14"
            width="6"
            height="6"
            rx="1"
          />
        </svg>
      );

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
  collapsed: boolean;
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
  const parts = name
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
  href: string,
  label: string
) {
  if (
    href ===
    "/patient-dashboard"
  ) {
    return (
      pathname ===
        "/patient-dashboard" &&
      label ===
        "Programările mele"
    );
  }

  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`
    )
  );
}

export default function PatientDashboardSidebar({
  userName,
  userEmail,
  children,
  footer,
}: PatientDashboardSidebarProps) {
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
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Patient sign-out failed:",
          error
        );
        return;
      }

      setIsMobileOpen(
        false
      );

      router.replace(
        "/login"
      );

      router.refresh();
    } finally {
      setIsSigningOut(
        false
      );
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
              setIsMobileOpen(
                false
              )
            }
            className="romdoc-focus-ring rounded-md text-2xl font-bold tracking-tight text-gray-900"
          >
            RomDoc Pacient
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
              ? "Extinde meniul"
              : "Restrânge meniul"
          }
          title={
            isCollapsed
              ? "Extinde meniul"
              : "Restrânge meniul"
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
                Pacient
              </span>
            </div>
          )}
        </div>
      </div>

      <nav
        aria-label="Navigare pacient"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {navigationItems.map(
          (item) => {
            if (
              item.label ===
              "Prezentare generală"
            ) {
              return null;
            }

            const active =
              isActiveRoute(
                pathname,
                item.href,
                item.label
              );

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
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
              ? "Deconectare"
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
                ? "Se deconectează..."
                : "Deconectare"}
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
          RomDoc Pacient
        </Link>

        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(
              true
            )
          }
          aria-label="Deschide meniul"
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
            aria-label="Închide meniul"
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
              aria-label="Închide meniul"
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
              Cont pacient
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-900">
              Bine ai venit, {userName}
            </p>
          </div>

          <Link
            href="/medici"
            className="rounded-xl bg-[#036661] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff2800]"
          >
            Caută un medic
          </Link>
        </div>

        <main className="flex-1">
          {children}
        </main>

        {footer}
      </div>
    </div>
  );
}
