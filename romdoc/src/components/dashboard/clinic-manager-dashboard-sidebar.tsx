"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ClinicManagerDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  children: ReactNode;
};

type NavigationIcon =
  | "overview"
  | "doctors"
  | "invitations"
  | "billing"
  | "sms"
  | "home";

type NavigationItem = {
  href: string;
  label: string;
  icon: NavigationIcon;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/clinic-manager-dashboard",
    label: "Prezentare generală",
    icon: "overview",
  },
  {
    href: "/clinic-manager-dashboard/doctors",
    label: "Medici",
    icon: "doctors",
  },
  {
    href: "/clinic-manager-dashboard/invitations",
    label: "Invitații",
    icon: "invitations",
  },
  {
    href: "/clinic-manager-dashboard/billing",
    label: "Facturare",
    icon: "billing",
  },
  {
    href: "/clinic-manager-dashboard/sms",
    label: "SMS",
    icon: "sms",
  },
  {
    href: "/",
    label: "Pagina principală",
    icon: "home",
  },
];

function NavigationIconView({
  type,
}: {
  type: NavigationIcon;
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    className: "h-5 w-5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
  };

  switch (type) {
    case "overview":
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      );

    case "doctors":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="4" />
          <path strokeLinecap="round" d="M5 21c.7-4 3.1-6 7-6s6.3 2 7 6" />
          <path strokeLinecap="round" d="M18 5v4M16 7h4" />
        </svg>
      );

    case "invitations":
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 7 7.5 6 7.5-6" />
          <path strokeLinecap="round" d="M17 14h4M19 12v4" />
        </svg>
      );

    case "billing":
      return (
        <svg {...commonProps}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path strokeLinecap="round" d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case "sms":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path strokeLinecap="round" d="M8 10h.01M12 10h.01M16 10h.01" />
        </svg>
      );

    case "home":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 11 9-8 9 8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v10h14V10M9 20v-6h6v6" />
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
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
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
      <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
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
        d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"}
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
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 8 4 4-4 4M19 12H9" />
    </svg>
  );
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "CM";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/clinic-manager-dashboard") {
    return pathname === "/clinic-manager-dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ClinicManagerDashboardSidebar({
  userName,
  userEmail,
  children,
}: ClinicManagerDashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Clinic manager sign-out failed:", error);
        return;
      }

      setIsMobileOpen(false);
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const sidebarWidth = isCollapsed ? "lg:w-20" : "lg:w-72";
  const contentPadding = isCollapsed ? "lg:pl-20" : "lg:pl-72";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div
        className={`flex min-h-20 items-center border-b border-gray-200 px-4 ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!isCollapsed && (
          <Link
            href="/clinic-manager-dashboard"
            onClick={() => setIsMobileOpen(false)}
            className="romdoc-focus-ring rounded-md text-2xl font-bold tracking-tight text-gray-900"
          >
            RomDoc Clinică
          </Link>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          aria-label={isCollapsed ? "Extinde meniul" : "Restrânge meniul"}
          title={isCollapsed ? "Extinde meniul" : "Restrânge meniul"}
          className="romdoc-focus-ring hidden rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:inline-flex"
        >
          <CollapseIcon collapsed={isCollapsed} />
        </button>
      </div>

      <div className="border-b border-gray-200 p-4">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#036661] text-sm font-bold text-white">
            {getInitials(userName)}
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
                Clinic Manager
              </span>
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Navigare clinic manager" className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigationItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              title={isCollapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={`romdoc-focus-ring flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isCollapsed ? "justify-center" : "gap-3"
              } ${
                active
                  ? "bg-[#036661]/10 text-[#036661]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <NavigationIconView type={item.icon} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          title={isCollapsed ? "Deconectare" : undefined}
          className={`romdoc-focus-ring flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${
            isCollapsed ? "justify-center" : "gap-3"
          }`}
        >
          <LogoutIcon />
          {!isCollapsed && <span>{isSigningOut ? "Se deconectează..." : "Deconectare"}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <Link
          href="/clinic-manager-dashboard"
          className="romdoc-focus-ring rounded-md text-xl font-bold text-gray-900"
        >
          RomDoc Clinică
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Deschide meniul"
          className="romdoc-focus-ring rounded-lg p-2 text-gray-700 transition hover:bg-gray-100"
        >
          <MenuIcon />
        </button>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-gray-200 bg-white transition-[width] duration-200 lg:block ${sidebarWidth}`}
      >
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Închide meniul"
            onClick={() => setIsMobileOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="relative h-full w-[min(20rem,88vw)] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Închide meniul"
              className="romdoc-focus-ring absolute right-3 top-3 z-10 rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
            >
              <CloseIcon />
            </button>

            {sidebarContent}
          </aside>
        </div>
      )}

      <div className={`transition-[padding] duration-200 ${contentPadding}`}>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
