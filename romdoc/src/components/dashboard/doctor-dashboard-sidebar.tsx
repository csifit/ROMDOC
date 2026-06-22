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

type DoctorDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
  children: ReactNode;
};

type NavigationIcon =
  | "appointments"
  | "calendar"
  | "availability"
  | "services"
  | "clinics"
  | "staff"
  | "verification"
  | "profile"
  | "home";

type NavigationItem = {
  href: string;
  label: string;
  icon: NavigationIcon;
};

const navigationItems: NavigationItem[] = [
  {
    href:
      "/doctor-dashboard/appointments",
    label: "Programări",
    icon: "appointments",
  },
  {
    href:
      "/doctor-dashboard/calendar",
    label: "Calendar",
    icon: "calendar",
  },
  {
    href:
      "/doctor-dashboard/availability",
    label: "Disponibilitate",
    icon: "availability",
  },
  {
    href:
      "/doctor-dashboard/profile",
    label: "Servicii și profil",
    icon: "services",
  },
  {
    href:
      "/doctor-dashboard/clinics",
    label: "Clinici",
    icon: "clinics",
  },
  {
    href:
      "/doctor-dashboard/staff",
    label: "Personal",
    icon: "staff",
  },
  {
    href:
      "/doctor-dashboard/verification",
    label: "Verificare profesională",
    icon: "verification",
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
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
      />

      <path
        strokeLinecap="round"
        d="M8 3v4M16 3v4M3.5 10h17"
      />

      <path
        strokeLinecap="round"
        d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"
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
        r="8.5"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.5v5l3.5 2"
      />

      <path
        strokeLinecap="round"
        d="M8 3.5 6 1.8M16 3.5l2-1.7"
      />
    </svg>
  );
}

function ServicesIcon() {
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
        y="4"
        width="16"
        height="16"
        rx="2"
      />

      <path
        strokeLinecap="round"
        d="M8 9h8M8 13h8M8 17h5"
      />

      <path
        strokeLinecap="round"
        d="M12 2v4M10 4h4"
      />
    </svg>
  );
}

function ClinicIcon() {
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
        d="M4 21V7l8-4 8 4v14"
      />

      <path
        strokeLinecap="round"
        d="M9 21v-5h6v5M9 9h6M12 6v6M9 12h6"
      />
    </svg>
  );
}

function VerificationIcon() {
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
        d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 12 2 2 4-4"
      />
    </svg>
  );
}

function StaffIcon() {
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
        cx="9"
        cy="8"
        r="3"
      />

      <circle
        cx="17"
        cy="9"
        r="2.5"
      />

      <path
        strokeLinecap="round"
        d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6"
      />

      <path
        strokeLinecap="round"
        d="M14.5 15c2.8 0 4.6 1.7 5 5"
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

function NavigationItemIcon({
  icon,
}: {
  icon: NavigationIcon;
}) {
  switch (icon) {
    case "appointments":
      return <AppointmentIcon />;

    case "calendar":
      return <CalendarIcon />;

    case "availability":
      return <AvailabilityIcon />;

    case "services":
      return <ServicesIcon />;

    case "clinics":
      return <ClinicIcon />;

    case "staff":
      return <StaffIcon />;

    case "verification":
      return <VerificationIcon />;

    case "profile":
      return <ProfileIcon />;

    case "home":
      return <HomeIcon />;
  }
}

function getInitials(
  userName: string
) {
  const parts = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "MD";
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

function isNavigationItemActive(
  pathname: string,
  href: string
) {
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

export default function DoctorDashboardSidebar({
  userName,
  userEmail,
  roleLabel,
  children,
}: DoctorDashboardSidebarProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  ] = useState(false);

  const [
    isSidebarCollapsed,
    setIsSidebarCollapsed,
  ] = useState(false);

  const [
    isSigningOut,
    setIsSigningOut,
  ] = useState(false);

  const initials =
    getInitials(userName);

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
          "Doctor sign-out failed:",
          error
        );

        setIsSigningOut(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Doctor sign-out failed:",
        error
      );

      setIsSigningOut(false);
    }
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  const sidebarWidthClass =
    isSidebarCollapsed
      ? "lg:w-20"
      : "lg:w-72";

  const contentOffsetClass =
    isSidebarCollapsed
      ? "lg:pl-20"
      : "lg:pl-72";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div
        className={`flex min-h-20 items-center border-b border-gray-200 px-4 ${
          isSidebarCollapsed
            ? "justify-center"
            : "justify-between"
        }`}
      >
        {!isSidebarCollapsed && (
          <Link
            href="/"
            onClick={
              closeMobileMenu
            }
            className="romdoc-focus-ring rounded-md text-2xl font-bold tracking-tight text-gray-900"
          >
            RomDoc
          </Link>
        )}

        <button
          type="button"
          onClick={() =>
            setIsSidebarCollapsed(
              (currentValue) =>
                !currentValue
            )
          }
          className="romdoc-focus-ring hidden rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:inline-flex"
          aria-label={
            isSidebarCollapsed
              ? "Extinde meniul"
              : "Restrânge meniul"
          }
          title={
            isSidebarCollapsed
              ? "Extinde meniul"
              : "Restrânge meniul"
          }
        >
          {isSidebarCollapsed ? (
            <ChevronRightIcon />
          ) : (
            <ChevronLeftIcon />
          )}
        </button>
      </div>

      <div className="border-b border-gray-200 p-4">
        <div
          className={`flex items-center ${
            isSidebarCollapsed
              ? "justify-center"
              : "gap-3"
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#036661] text-sm font-bold text-white">
            {initials}
          </div>

          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {userName}
              </p>

              <p className="truncate text-xs text-gray-500">
                {userEmail}
              </p>

              <span className="mt-1 inline-flex rounded-full bg-[#036661]/10 px-2 py-0.5 text-xs font-semibold text-[#036661]">
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      <nav
        aria-label="Navigare medic"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {navigationItems.map(
          (item) => {
            const isActive =
              isNavigationItemActive(
                pathname,
                item.href
              );

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={
                  closeMobileMenu
                }
                title={
                  isSidebarCollapsed
                    ? item.label
                    : undefined
                }
                aria-current={
                  isActive
                    ? "page"
                    : undefined
                }
                className={`romdoc-focus-ring flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isSidebarCollapsed
                    ? "justify-center"
                    : "gap-3"
                } ${
                  isActive
                    ? "bg-[#036661]/10 text-[#036661]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <NavigationItemIcon
                  icon={item.icon}
                />

                {!isSidebarCollapsed && (
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
            isSidebarCollapsed
              ? "Deconectare"
              : undefined
          }
          className={`romdoc-focus-ring flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${
            isSidebarCollapsed
              ? "justify-center"
              : "gap-3"
          }`}
        >
          <LogoutIcon />

          {!isSidebarCollapsed && (
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
          href="/"
          className="romdoc-focus-ring rounded-md text-xl font-bold text-gray-900"
        >
          RomDoc
        </Link>

        <button
          type="button"
          onClick={() =>
            setIsMobileMenuOpen(
              true
            )
          }
          className="romdoc-focus-ring rounded-lg p-2 text-gray-700 transition hover:bg-gray-100"
          aria-label="Deschide meniul"
        >
          <MenuIcon />
        </button>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-gray-200 bg-white transition-[width] duration-200 lg:block ${sidebarWidthClass}`}
      >
        {sidebarContent}
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Închide meniul"
            onClick={
              closeMobileMenu
            }
            className="absolute inset-0 bg-black/40"
          />

          <aside className="relative h-full w-[min(20rem,88vw)] bg-white shadow-xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={
                  closeMobileMenu
                }
                className="romdoc-focus-ring rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
                aria-label="Închide meniul"
              >
                <CloseIcon />
              </button>
            </div>

            {sidebarContent}
          </aside>
        </div>
      )}

      <div
        className={`transition-[padding] duration-200 ${contentOffsetClass}`}
      >
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}