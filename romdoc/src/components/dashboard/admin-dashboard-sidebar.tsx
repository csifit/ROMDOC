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
  | "users"
  | "doctors"
  | "verifications"
  | "clinics"
  | "specialties"
  | "cities"
  | "reviews"
  | "sms"
  | "privacy"
  | "ai"
  | "security"
  | "home";

type NavigationItem = {
  href: string;
  label: string;
  icon: NavigationIcon;
  available: boolean;
  adminOnly?: boolean;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/admin",
    label: "Prezentare generală",
    icon: "overview",
    available: true,
  },
  {
    href: "/admin/users",
    label: "Utilizatori",
    icon: "users",
    available: true,
  },
  {
    href: "/admin/managers",
    label: "Manageri",
    icon: "users",
    available: true,
    adminOnly: true,
  },
  {
    href: "/admin/doctors",
    label: "Medici",
    icon: "doctors",
    available: true,
  },
  {
    href: "/admin/verifications",
    label: "Verificări profesionale",
    icon: "verifications",
    available: true,
  },
  {
    href: "/admin/clinics",
    label: "Clinici",
    icon: "clinics",
    available: true,
  },
  {
    href: "/admin/specialties",
    label: "Specialități",
    icon: "specialties",
    available: true,
    adminOnly: true,
  },
  {
    href: "/admin/cities",
    label: "Orașe",
    icon: "cities",
    available: true,
  },
  {
    href: "/admin/reviews",
    label: "Recenzii",
    icon: "reviews",
    available: true,
  },
  {
    href: "/admin/sms",
    label: "SMS",
    icon: "sms",
    available: true,
    adminOnly: true,
  },
  {
    href: "/admin/invoices",
    label: "Facturi",
    icon: "sms",
    available: true,
  },
  {
    href: "/admin/privacy",
    label: "Confidențialitate",
    icon: "privacy",
    available: true,
    adminOnly: true,
  },
  {
    href: "/admin/settings/ai",
    label: "Asistent AI",
    icon: "ai",
    available: true,
    adminOnly: true,
  },
  {
    href: "/admin/security",
    label: "Account security",
    icon: "security",
    available: true,
  },
  {
    href: "/",
    label: "Pagina principală",
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
    className: "h-5 w-5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
  };

  if (type === "sms") {
    return (
      <svg {...commonProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        />
        <path
          strokeLinecap="round"
          d="M8 10h.01M12 10h.01M16 10h.01"
        />
      </svg>
    );
  }

  if (type === "overview") {
    return (
      <svg {...commonProps}>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  if (type === "users") {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="7" r="4" />
        <path strokeLinecap="round" d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
        <path strokeLinecap="round" d="M16 3.2a4 4 0 0 1 0 7.6M22 21v-2a4 4 0 0 0-3-3.9" />
      </svg>
    );
  }

  if (type === "doctors") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="4" />
        <path strokeLinecap="round" d="M5 21c.7-4 3.1-6 7-6s6.3 2 7 6M18 5v4M16 7h4" />
      </svg>
    );
  }

  if (type === "clinics") {
    return (
      <svg {...commonProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V5h14v16M3 21h18" />
        <path strokeLinecap="round" d="M9 9h6M12 6v6M8 15h2M14 15h2M8 18h2M14 18h2" />
      </svg>
    );
  }

  if (type === "cities") {
    return (
      <svg {...commonProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V9l6-4v16M10 21V3l10 5v13M2 21h20" />
        <path strokeLinecap="round" d="M7 12h1M7 16h1M14 9h1M18 10h1M14 14h1M18 15h1" />
      </svg>
    );
  }

  if (type === "reviews") {
    return (
      <svg {...commonProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 14.6 9l6 .7-4.4 4.1 1.2 5.9L12 16.8 6.6 19.7l1.2-5.9-4.4-4.1 6-.7L12 3.5Z" />
      </svg>
    );
  }

  if (type === "home") {
    return (
      <svg {...commonProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 11 9-8 9 8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v10h14V10M9 20v-6h6v6" />
      </svg>
    );
  }

  if (type === "ai") {
    return (
      <svg {...commonProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" />
        <path strokeLinecap="round" d="M9 10h.01M15 10h.01M9 14c1.8 1.4 4.2 1.4 6 0M12 1v3M12 18v3M2 11h3M19 11h3" />
      </svg>
    );
  }

  if (type === "specialties") {
    return (
      <svg {...commonProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" />
        <path strokeLinecap="round" d="M9 12h6M12 9v6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 19 6v5c0 4.6-2.7 8-7 10-4.3-2-7-5.4-7-10V6l7-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
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
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path strokeLinecap="round" d="m15 8 4 4-4 4M19 12H9" />
    </svg>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "A";
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

  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminDashboardSidebar({
  userName,
  userEmail,
  roleLabel,
  children,
}: AdminDashboardSidebarProps) {
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
        console.error("Admin sign-out failed:", error);
        return;
      }

      setIsMobileOpen(false);
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const desktopWidth = isCollapsed ? "lg:w-20" : "lg:w-72";
  const contentPadding = isCollapsed ? "lg:pl-20" : "lg:pl-72";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={`flex min-h-20 items-center border-b border-gray-200 px-4 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <Link
            href="/admin"
            onClick={() => setIsMobileOpen(false)}
            className="romdoc-focus-ring rounded-md text-2xl font-bold tracking-tight text-gray-900"
          >
            RomDoc Admin
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
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Navigare administrator" className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigationItems.map((item) => {
          if (roleLabel === "Manager" && item.adminOnly) {
            return null;
          }

          const active = isActiveRoute(pathname, item.href);

          if (!item.available) {
            return (
              <div
                key={item.href}
                title={isCollapsed ? `${item.label} — în curând` : undefined}
                className={`flex min-h-11 cursor-not-allowed items-center rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 ${isCollapsed ? "justify-center" : "gap-3"}`}
              >
                <Icon type={item.icon} />
                {!isCollapsed && <span className="flex-1">{item.label}</span>}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              title={isCollapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={`romdoc-focus-ring flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${isCollapsed ? "justify-center" : "gap-3"} ${active ? "bg-[#036661]/10 text-[#036661]" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
            >
              <Icon type={item.icon} />
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
          className={`romdoc-focus-ring flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${isCollapsed ? "justify-center" : "gap-3"}`}
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
        <Link href="/admin" className="romdoc-focus-ring rounded-md text-xl font-bold text-gray-900">
          RomDoc Admin
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

      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-gray-200 bg-white transition-[width] duration-200 lg:block ${desktopWidth}`}>
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
