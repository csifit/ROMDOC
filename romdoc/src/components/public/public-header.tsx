"use client";

import Link from "next/link";
import {
  useState,
} from "react";
import PublicSidebar from "@/components/public/public-sidebar";

type PublicHeaderProps = {
  isAuthenticated: boolean;
  userName: string | null;
  userEmail: string | null;
};

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

export default function PublicHeader({
  isAuthenticated,
  userName,
  userEmail,
}: PublicHeaderProps) {
  const [
    isSidebarOpen,
    setIsSidebarOpen,
  ] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setIsSidebarOpen(true)
              }
              aria-label="Deschide meniul"
              aria-expanded={
                isSidebarOpen
              }
              className="romdoc-focus-ring inline-flex rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 hover:text-gray-950"
            >
              <MenuIcon />
            </button>

            <Link
              href="/"
              className="romdoc-focus-ring rounded-md text-2xl font-bold tracking-tight text-gray-900"
            >
              RomDoc
            </Link>
          </div>

          <nav
            aria-label="Acțiuni cont"
            className="flex items-center gap-2"
          >
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="romdoc-button romdoc-button-primary romdoc-button-sm"
              >
                Panoul meu
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="romdoc-button romdoc-button-secondary romdoc-button-sm hidden sm:inline-flex"
                >
                  Autentificare
                </Link>

                <Link
                  href="/register"
                  className="romdoc-button romdoc-button-primary romdoc-button-sm"
                >
                  Creează cont
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <PublicSidebar
        isOpen={isSidebarOpen}
        onClose={() =>
          setIsSidebarOpen(false)
        }
        isAuthenticated={
          isAuthenticated
        }
        userName={userName}
        userEmail={userEmail}
      />
    </>
  );
}
