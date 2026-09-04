"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import RecentlyViewedDoctorCard from "@/components/public/recently-viewed-doctor-card";
import {
  clearRecentlyViewedDoctors,
  readRecentlyViewedDoctors,
  RECENTLY_VIEWED_DOCTORS_EVENT,
  type RecentlyViewedDoctor,
} from "@/lib/doctors/recently-viewed-doctors";

type Copy = {
  triggerLabel: string;
  title: string;
  description: string;
  close: string;
  clear: string;
  emptyTitle: string;
  emptyDescription: string;
  searchDoctors: string;
  viewProfile: string;
};

type Props = {
  doctorsHref: string;
  copy: Copy;
};

function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7 fill-none sm:h-6 sm:w-6"
    >
      <path
        d="M3.5 12a8.5 8.5 0 1 0 2.3-5.8L3.5 8.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 4.5v4h4M12 7.5V12l3 1.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RecentlyViewedDoctorsPanel({
  doctorsHref,
  copy,
}: Props) {
  const [isOpen, setIsOpen] =
    useState(false);
  const [doctors, setDoctors] =
    useState<RecentlyViewedDoctor[]>([]);
  const triggerRef =
    useRef<HTMLButtonElement | null>(null);
  const closeRef =
    useRef<HTMLButtonElement | null>(null);

  function refreshDoctors() {
    setDoctors(
      readRecentlyViewedDoctors()
    );
  }

  useEffect(() => {
    refreshDoctors();

    window.addEventListener(
      RECENTLY_VIEWED_DOCTORS_EVENT,
      refreshDoctors
    );
    window.addEventListener(
      "storage",
      refreshDoctors
    );

    return () => {
      window.removeEventListener(
        RECENTLY_VIEWED_DOCTORS_EVENT,
        refreshDoctors
      );
      window.removeEventListener(
        "storage",
        refreshDoctors
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    refreshDoctors();
    closeRef.current?.focus();

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
        requestAnimationFrame(() =>
          triggerRef.current?.focus()
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [isOpen]);

  function closePanel() {
    setIsOpen(false);
    requestAnimationFrame(() =>
      triggerRef.current?.focus()
    );
  }

  return (
    <>
      <div
        className="absolute left-0 top-0 z-20 h-14 w-14 sm:h-16 sm:w-16"
        style={{
          filter:
           "drop-shadow(4px 5px 6px rgba(0, 0, 0, 0.35))",
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={copy.triggerLabel}
          aria-expanded={isOpen}
          aria-controls="recently-viewed-doctors-panel"
          title={copy.triggerLabel}
          className="romdoc-focus-ring relative h-full w-full overflow-hidden text-white"
          style={{
            clipPath:
             "polygon(0 0, 100% 0, 0 100%)",
          }}
        >
          <span
             aria-hidden="true"
             className="absolute inset-0 bg-[#036661] transition hover:bg-[#ff2800]"
          />

          <span className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3">
             <HistoryIcon />
          </span>
        </button>
     </div>

      <section
        id="recently-viewed-doctors-panel"
        aria-hidden={!isOpen}
        inert={!isOpen}
        aria-label={copy.title}
        className={`absolute inset-0 z-30 overflow-y-auto bg-[#F0EEE9] transition duration-300 ${
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#036661]">
                RomDoc
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {copy.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                {copy.description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {doctors.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearRecentlyViewedDoctors();
                    setDoctors([]);
                  }}
                  className="romdoc-focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-red-700"
                >
                  {copy.clear}
                </button>
              )}

              <button
                ref={closeRef}
                type="button"
                onClick={closePanel}
                aria-label={copy.close}
                title={copy.close}
                className="romdoc-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>

          {doctors.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">
                {copy.emptyTitle}
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
                {copy.emptyDescription}
              </p>
              <Link
                href={doctorsHref}
                onClick={closePanel}
                className="romdoc-button romdoc-button-primary mt-5"
              >
                {copy.searchDoctors}
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex gap-4 overflow-x-auto pb-3">
              {doctors.map((doctor) => (
                <RecentlyViewedDoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  profileLabel={copy.viewProfile}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
