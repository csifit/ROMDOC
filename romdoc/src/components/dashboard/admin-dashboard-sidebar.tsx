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
import {
  createClient,
} from "@/lib/supabase/client";

type AdminDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
  children: ReactNode;
};

type NavigationIcon =
  | "overview"
  | "doctors"
  | "clinics"
  | "specialties"
  | "cities"
  | "reviews"
  | "home";

type NavigationItem = {
  href: string;
  label: string;
  icon: NavigationIcon;
  available: boolean;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/admin",
    label:
      "Prezentare generală",
    icon: "overview",
    available: true,
  },
  {
    href:
      "/admin/doctors",
    label: "Medici",
    icon: "doctors",
    available: true,
  },
  {
    href:
      "/admin/clinics",
    label: "Clinici",
    icon: "clinics",
    available: true,
  },
  {
    href:
      "/admin/specialties",
    label: "Specialități",
    icon: "specialties",
    available: false,
  },
  {
    href:
      "/admin/cities",
    label: "Orașe",
    icon: "cities",
    available: false,
  },
  {
    href:
      "/admin/reviews",
    label: "Recenzii",
    icon: "reviews",
    available: false,
  },
  {
    href: "/",
    label:
      "Pagina principală",
    icon: "home",
    available: true,
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

    case "clinics":
      return (
        <svg {...commonProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 21V5h14v16M3 21h18"
          />

          <path
            strokeLinecap="round"
            d="M9 9h6M12 6v6M8 15h2M14 15h2M8 18h2M14 18h2"
          />
        </svg>
      );

    case "specialties":
      return (
        <svg {...commonProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"
          />

          <path
            strokeLinecap="round"
            d="M9 12h6M12 9v6"
          />
        </svg>
      );

    case "cities":
      return (
        <svg {...commonProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 21V9l6-4v16M10 21V3l10 5v13M2 21h20"
          />

          <path
            strokeLinecap="round"
            d="M7 12h1M7 16h1M14 9h1M18 10h1M14 14h1M18 15h1"
          />
        </svg>
      );

    case "reviews":
      return (
        <svg {...commonProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3.5 14.6 9l6 .7-4.4 4.1 1.2 5.9L12 16.8 6.6 19.7l1.2-5.9-4.4-4.1 6-.7L12 3.5Z"
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
    return "A";
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
  href: string
) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/admin") {
    return pathname === "/admin";
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`
    )
  );
}

export default function AdminDashboardSidebar({
  userName,
  userEmail,
  roleLabel,
  children,
}: AdminDashboardSidebarProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    isCollapsed,
    setIsCollapsed,
  ] = useState(false);

  const [
    isMobileOpen,
    setIsMobileOpen,
  ] = useState(false);

  const [
    isSigningOut,
    setIsSigningOut,
  ] = useState(false);

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
          "Admin sign-out failed:",
          error
        );

        return;
      }

      setIsMobileOpen(false);

      router.replace(
        "/login"
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
            href="/admin"
            onClick={() =>
              setIsMobileOpen(
                false
              )
            }
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            RomDoc Admin
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
          className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 lg:inline-flex"
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-800">
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

              <span className="mt-1 inline-flex rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800">
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      <nav
        aria-label="Navigare administrator"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {navigationItems.map(
          (item) => {
            const active =
              isActiveRoute(
                pathname,
                item.href
              );

            if (
              !item.available
            ) {
              return (
                <div
                  key={item.href}
                  title={
                    isCollapsed
                      ? `${item.label} — în curând`
                      : undefined
                  }
                  className={`flex min-h-11 cursor-not-allowed items-center rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 ${
                    isCollapsed
                      ? "justify-center"
                      : "gap-3"
                  }`}
                >
                  <Icon
                    type={
                      item.icon
                    }
                  />

                  {!isCollapsed && (
                    <>
                      <span className="flex-1">
                        {item.label}
                      </span>

                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Curând
                      </span>
                    </>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
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
                className={`flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isCollapsed
                    ? "justify-center"
                    : "gap-3"
                } ${
                  active
                    ? "bg-[#F0EEE9] text-[#9A4F35]"
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
          className={`flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${
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
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <Link
          href="/admin"
          className="text-xl font-bold text-gray-900"
        >
          RomDoc Admin
        </Link>

        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(
              true
            )
          }
          aria-label="Deschide meniul"
          className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
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
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            >
              <CloseIcon />
            </button>

            {sidebarContent}
          </aside>
        </div>
      )}

      <div
        className={`transition-[padding] duration-200 ${contentPadding}`}
      >
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}