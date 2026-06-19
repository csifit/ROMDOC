"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type ReactNode,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type DoctorDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
  children: ReactNode;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: 
    | "appointments"
    | "calendar"
    | "availability"
    | "profile"
    | "home";
};

const navigationItems: NavigationItem[] = [
  {
    href: "/doctor-dashboard/appointments",
    label: "Programări",
    icon: "appointments",
  },
  {
    href: "/doctor-dashboard/calendar",
    label: "Calendar",
    icon: "calendar",
  },
  {
    href: "/doctor-dashboard/availability",
    label: "Disponibilitate",
    icon: "availability",
  },
  {
    href: "/doctor-dashboard/profile",
    label: "Profilul meu",
    icon: "profile",
  },
  {
    href: "/",
    label: "Pagina principală",
    icon: "home",
  },
];

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

function ChevronLeftIcon() {
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
        d="m15 6-6 6 6 6"
      />
    </svg>
  );
}

function ChevronRightIcon() {
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
        d="m9 6 6 6-6 6"
      />
    </svg>
  );
}

function AppointmentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
      />

      <path
        strokeLinecap="round"
        d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h5"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
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
        d="M8 14h2M14 14h2M8 17h2M14 17h2"
      />
    </svg>
  );
}
function AvailabilityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7v5l3 2"
      />

      <path
        strokeLinecap="round"
        d="m17.5 5.5 1-1"
      />
    </svg>
  );
}

function HomeIcon() {
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

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
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
        d="M17 4h4M19 2v4"
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
        d="m14 8 4 4-4 4M18 12H9"
      />
    </svg>
  );
}

function NavigationIcon({
  icon,
}: {
  icon: NavigationItem["icon"];
}) {
  switch (icon) {
    case "calendar":
      return <CalendarIcon />;

    case "profile":
      return <ProfileIcon />;
    
    case "availability":
      return <AvailabilityIcon />;

    case "home":
      return <HomeIcon />;

    default:
      return <AppointmentIcon />;    
  }
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  return initials || "M";
}

export default function DoctorDashboardSidebar({
  userName,
  userEmail,
  roleLabel,
  children,
}: DoctorDashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] =
    useState(false);

  const [isMobileOpen, setIsMobileOpen] =
    useState(false);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  function isActiveRoute(href: string) {
    if (href === "/") {
      return false;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Doctor dashboard sign-out failed:",
          error
        );

        return;
      }

      setIsMobileOpen(false);

      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const desktopWidthClass =
    isCollapsed
      ? "lg:w-20"
      : "lg:w-72";

  const contentPaddingClass =
    isCollapsed
      ? "lg:pl-20"
      : "lg:pl-72";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <Link
          href="/doctor-dashboard/appointments"
          className="text-xl font-bold text-gray-900"
        >
          RomDoc
        </Link>

        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(true)
          }
          aria-label="Deschide meniul"
          className="rounded-xl border border-gray-300 bg-white p-2 text-gray-700 transition hover:bg-gray-50"
        >
          <MenuIcon />
        </button>
      </header>

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Închide meniul"
          onClick={() =>
            setIsMobileOpen(false)
          }
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white transition-all duration-200 lg:z-40 ${desktopWidthClass} ${
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-gray-200 px-5">
          {!isCollapsed ? (
            <Link
              href="/doctor-dashboard/appointments"
              onClick={() =>
                setIsMobileOpen(false)
              }
              className="text-2xl font-bold text-gray-900"
            >
              RomDoc
            </Link>
          ) : (
            <Link
              href="/doctor-dashboard/appointments"
              className="mx-auto text-xl font-bold text-[#D97757]"
            >
              R
            </Link>
          )}

          <button
            type="button"
            onClick={() =>
              setIsMobileOpen(false)
            }
            aria-label="Închide meniul"
            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        <div
          className={`border-b border-gray-200 ${
            isCollapsed
              ? "px-3 py-5"
              : "px-5 py-6"
          }`}
        >
          <div
            className={`flex items-center ${
              isCollapsed
                ? "justify-center"
                : "gap-3"
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0EEE9] text-sm font-bold text-[#9A4F35]">
              {getInitials(userName)}
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">
                  {userName}
                </p>

                <p className="truncate text-sm text-gray-500">
                  {userEmail}
                </p>

                <span className="mt-2 inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5">
          {navigationItems.map(
            (item) => {
              const isActive =
                isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() =>
                    setIsMobileOpen(false)
                  }
                  title={
                    isCollapsed
                      ? item.label
                      : undefined
                  }
                  className={`flex items-center rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isCollapsed
                      ? "justify-center"
                      : "gap-3"
                  } ${
                    isActive
                      ? "bg-[#F0EEE9] text-[#9A4F35]"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-950"
                  }`}
                >
                  <NavigationIcon
                    icon={item.icon}
                  />

                  {!isCollapsed && (
                    <span>{item.label}</span>
                  )}
                </Link>
              );
            }
          )}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            title={
              isCollapsed
                ? "Deconectare"
                : undefined
            }
            className={`flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${
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

          <button
            type="button"
            onClick={() =>
              setIsCollapsed(
                (currentValue) =>
                  !currentValue
              )
            }
            aria-label={
              isCollapsed
                ? "Extinde meniul"
                : "Restrânge meniul"
            }
            className="mt-2 hidden w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-600 transition hover:bg-gray-50 lg:flex"
          >
            {isCollapsed ? (
              <ChevronRightIcon />
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium">
                <ChevronLeftIcon />

                <span>
                  Restrânge meniul
                </span>
              </div>
            )}
          </button>
        </div>
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-200 ${contentPaddingClass}`}
      >
        {children}
      </div>
    </div>
  );
}