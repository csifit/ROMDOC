"use client";

import NextLink from "next/link";
import {
  useTranslations,
} from "next-intl";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link as LocalizedLink,
  usePathname,
  useRouter,
} from "@/i18n/navigation";
import {
  createClient,
} from "@/lib/supabase/client";

type PublicSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  userName: string | null;
  userEmail: string | null;
};

type PublicNavigationItem = {
  href:
    | "/"
    | "/medici"
    | "/specialitati";
  hash?: string;
  labelKey:
    | "home"
    | "findDoctor"
    | "specialties"
    | "cities";
};

const publicNavigation:
PublicNavigationItem[] = [
  {
    href: "/",
    labelKey: "home",
  },
  {
    href: "/medici",
    labelKey: "findDoctor",
  },
  {
    href: "/specialitati",
    labelKey: "specialties",
  },
  {
    href: "/",
    hash: "orase",
    labelKey: "cities",
  },
];

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

function HomeIcon() {
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

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />
      <path
        strokeLinecap="round"
        d="m16.5 16.5 4 4"
      />
    </svg>
  );
}

function ListIcon() {
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
        d="M8 6h12M8 12h12M8 18h12"
      />
      <circle
        cx="4"
        cy="6"
        r="1"
        fill="currentColor"
        stroke="none"
      />
      <circle
        cx="4"
        cy="12"
        r="1"
        fill="currentColor"
        stroke="none"
      />
      <circle
        cx="4"
        cy="18"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function LocationIcon() {
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
        d="M12 21s7-6.1 7-12A7 7 0 1 0 5 9c0 5.9 7 12 7 12Z"
      />
      <circle
        cx="12"
        cy="9"
        r="2.5"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
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
}

function LogoutIcon() {
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

function getIcon(
  item: PublicNavigationItem
) {
  if (
    item.href === "/" &&
    !item.hash
  ) {
    return <HomeIcon />;
  }

  if (
    item.href === "/medici"
  ) {
    return <SearchIcon />;
  }

  if (
    item.href ===
    "/specialitati"
  ) {
    return <ListIcon />;
  }

  return <LocationIcon />;
}

function isActive(
  pathname: string,
  item: PublicNavigationItem
) {
  if (item.hash) {
    return false;
  }

  if (item.href === "/") {
    return pathname === "/";
  }

  return (
    pathname === item.href ||
    pathname.startsWith(
      `${item.href}/`
    )
  );
}

export default function PublicSidebar({
  isOpen,
  onClose,
  isAuthenticated,
  userName,
  userEmail,
}: PublicSidebarProps) {
  const t =
    useTranslations(
      "PublicNavigation"
    );

  const pathname =
    usePathname();

  const router =
    useRouter();

  const panelRef =
    useRef<HTMLElement | null>(
      null
    );

  const [
    isSigningOut,
    setIsSigningOut,
  ] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow = "hidden";

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    panelRef.current?.focus();

    return () => {
      document.body.style
        .overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen, onClose]);

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
          "Public sign-out failed:",
          error
        );
        return;
      }

      onClose();
      router.replace("/");
      router.refresh();
    } finally {
      setIsSigningOut(
        false
      );
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t(
          "closeMenu"
        )}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        aria-label={t(
          "publicMenu"
        )}
        className="absolute left-0 top-0 flex h-full w-[min(88vw,22rem)] flex-col bg-white shadow-2xl outline-none"
      >
        <div className="flex min-h-20 items-center justify-between border-b border-gray-200 px-5">
          <LocalizedLink
            href="/"
            onClick={onClose}
            className="romdoc-focus-ring rounded-md text-2xl font-bold tracking-tight text-gray-900"
          >
            RomDoc
          </LocalizedLink>

          <button
            type="button"
            onClick={onClose}
            aria-label={t(
              "closeMenu"
            )}
            className="romdoc-focus-ring rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <CloseIcon />
          </button>
        </div>

        {isAuthenticated && (
          <div className="border-b border-gray-200 px-5 py-4">
            <p className="truncate text-sm font-semibold text-gray-900">
              {userName ||
                t(
                  "accountFallback"
                )}
            </p>

            {userEmail && (
              <p className="mt-1 truncate text-xs text-gray-500">
                {userEmail}
              </p>
            )}
          </div>
        )}

        <nav
          aria-label={t(
            "publicNavigation"
          )}
          className="flex-1 space-y-1 overflow-y-auto p-4"
        >
          {publicNavigation.map(
            (item) => {
              const active =
                isActive(
                  pathname,
                  item
                );

              const href =
                item.hash
                  ? {
                      pathname:
                        item.href,
                      hash:
                        item.hash,
                    }
                  : item.href;

              return (
                <LocalizedLink
                  key={`${item.href}#${item.hash ?? ""}`}
                  href={href}
                  onClick={onClose}
                  className={`romdoc-focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[#036661]/10 text-[#036661]"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-950"
                  }`}
                >
                  {getIcon(item)}
                  <span>
                    {t(
                      item.labelKey
                    )}
                  </span>
                </LocalizedLink>
              );
            }
          )}

          {isAuthenticated && (
            <NextLink
              href="/dashboard"
              onClick={onClose}
              className="romdoc-focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-950"
            >
              <DashboardIcon />
              <span>
                {t("dashboard")}
              </span>
            </NextLink>
          )}
        </nav>

        <div className="border-t border-gray-200 p-4">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={
                handleSignOut
              }
              disabled={
                isSigningOut
              }
              className="romdoc-focus-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogoutIcon />
              <span>
                {isSigningOut
                  ? t(
                      "signingOut"
                    )
                  : t("signOut")}
              </span>
            </button>
          ) : (
            <div className="grid gap-3">
              <NextLink
                href="/login"
                onClick={onClose}
                className="romdoc-button romdoc-button-secondary romdoc-button-full"
              >
                {t("signIn")}
              </NextLink>

              <NextLink
                href="/register"
                onClick={onClose}
                className="romdoc-button romdoc-button-primary romdoc-button-full"
              >
                {t(
                  "createAccount"
                )}
              </NextLink>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
