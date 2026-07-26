"use client";

import { useEffect, useRef, useState } from "react";

import { footerPreferencesCopy } from "@/components/theme/footer-preferences-copy";
import {
  isAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";
import {
  APP_LOCALE_CHANGE_EVENT,
  readBrowserLocale,
  switchBrowserLocale,
} from "@/lib/i18n/client-locale-switch";
import {
  APP_APPEARANCE_CHANGE_EVENT,
  type AppAppearance,
  readStoredAppAppearance,
  storeAppAppearance,
} from "@/lib/theme/app-theme";

const LANGUAGE_OPTIONS: Array<{
  locale: AppLocale;
  label: string;
}> = [
  { locale: "ro", label: "Română" },
  { locale: "en", label: "English" },
  { locale: "de", label: "Deutsch" },
];

function PreferencesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7 fill-none sm:h-6 sm:w-6"
    >
      <circle
        cx="10"
        cy="10"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.8 10h12.4M10 3.5c2 2 3 4.2 3 6.5s-1 4.5-3 6.5c-2-2-3-4.2-3-6.5s1-4.5 3-6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17.7 14.8v1.5M17.7 21v-1.5M14.6 17.9h1.5M21 17.9h-1.5M15.5 15.7l1.1 1.1M19.9 20.1 18.8 19M19.9 15.7l-1.1 1.1M15.5 20.1l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OptionButton({
  selected,
  label,
  selectedLabel,
  onClick,
}: {
  selected: boolean;
  label: string;
  selectedLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={selected ? `${label} — ${selectedLabel}` : label}
      className={`romdoc-preference-option romdoc-focus-ring flex min-h-10 w-full items-center justify-between gap-2 rounded-[10px] border px-3 py-2 text-left text-[13px] font-semibold transition ${
        selected
          ? "border-[#036661] bg-[#036661]/10 text-[#036661]"
          : "border-[var(--rd-border-strong)] bg-[var(--rd-surface)] text-[var(--rd-text-secondary)] hover:border-[#036661] hover:text-[#036661]"
      }`}
    >
      <span className="truncate">{label}</span>
      <span
        aria-hidden="true"
        className={`romdoc-preference-check flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
          selected
            ? "bg-[#036661] text-white"
            : "border border-[var(--rd-border)] text-transparent"
        }`}
      >
        ✓
      </span>
    </button>
  );
}

export default function FooterPreferencesPanel({
  locale,
  panelId,
}: {
  locale: AppLocale;
  panelId: string;
}) {
  const [currentLocale, setCurrentLocale] = useState<AppLocale>(locale);
  const copy = footerPreferencesCopy[currentLocale];
  const [isOpen, setIsOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppAppearance>("system");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);


  useEffect(() => {
    const synchronizeLocale = () => {
      setCurrentLocale(readBrowserLocale(locale));
    };

    const handleLocaleChange = (event: Event) => {
      const nextLocale = (
        event as CustomEvent<{ locale?: string }>
      ).detail?.locale;

      if (nextLocale && isAppLocale(nextLocale)) {
        setCurrentLocale(nextLocale);
        return;
      }

      synchronizeLocale();
    };

    synchronizeLocale();
    window.addEventListener(APP_LOCALE_CHANGE_EVENT, handleLocaleChange);
    window.addEventListener("pageshow", synchronizeLocale);
    window.addEventListener("focus", synchronizeLocale);

    return () => {
      window.removeEventListener(APP_LOCALE_CHANGE_EVENT, handleLocaleChange);
      window.removeEventListener("pageshow", synchronizeLocale);
      window.removeEventListener("focus", synchronizeLocale);
    };
  }, [locale]);

  useEffect(() => {
    setAppearance(readStoredAppAppearance());

    const handleAppearanceChange = () => {
      setAppearance(readStoredAppAppearance());
    };

    window.addEventListener(
      APP_APPEARANCE_CHANGE_EVENT,
      handleAppearanceChange
    );

    return () =>
      window.removeEventListener(
        APP_APPEARANCE_CHANGE_EVENT,
        handleAppearanceChange
      );
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const closeForRecentlyViewed = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[aria-controls="recently-viewed-doctors-panel"]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", closeForRecentlyViewed, true);
    return () =>
      document.removeEventListener("click", closeForRecentlyViewed, true);
  }, []);

  function togglePanel() {
    if (!isOpen) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    }
    setIsOpen((current) => !current);
  }

  function selectAppearance(nextAppearance: AppAppearance) {
    setAppearance(nextAppearance);
    storeAppAppearance(nextAppearance);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div
        className="pointer-events-auto absolute right-0 top-0 h-14 w-14 sm:h-16 sm:w-16"
        style={{
          filter: "drop-shadow(-4px 5px 6px rgba(0, 0, 0, 0.35))",
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={togglePanel}
          aria-label={copy.triggerLabel}
          aria-expanded={isOpen}
          aria-controls={panelId}
          title={copy.triggerLabel}
          className="romdoc-focus-ring relative h-full w-full overflow-hidden text-white"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[#036661] transition hover:bg-[#ff2800]"
          />
          <span className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3">
            <PreferencesIcon />
          </span>
        </button>
      </div>

      <section
        ref={panelRef}
        id={panelId}
        aria-hidden={!isOpen}
        aria-label={copy.title}
        className={`pointer-events-auto absolute inset-0 overflow-y-auto border-t border-[var(--rd-border)] bg-[var(--rd-footer-panel)] transition duration-300 ${
          isOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,15rem)_minmax(12rem,15rem)] lg:gap-5">
            <div className="pr-12 sm:col-span-2 lg:col-span-1 lg:max-w-xl lg:pr-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#036661]">
                {copy.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--rd-text-primary)]">
                {copy.title}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--rd-text-secondary)]">
                {copy.description}
              </p>
            </div>

            <section aria-labelledby={`${panelId}-language-title`}>
              <h3
                id={`${panelId}-language-title`}
                className="text-sm font-bold text-[var(--rd-text-primary)]"
              >
                {copy.languageTitle}
              </h3>
              <div className="mt-3 grid gap-2">
                {LANGUAGE_OPTIONS.map((option) => (
                  <OptionButton
                    key={option.locale}
                    selected={currentLocale === option.locale}
                    label={option.label}
                    selectedLabel={copy.selected}
                    onClick={() => {
                      setCurrentLocale(option.locale);
                      switchBrowserLocale(option.locale);
                    }}
                  />
                ))}
              </div>
            </section>

            <section aria-labelledby={`${panelId}-appearance-title`}>
              <h3
                id={`${panelId}-appearance-title`}
                className="text-sm font-bold text-[var(--rd-text-primary)]"
              >
                {copy.appearanceTitle}
              </h3>
              <div className="mt-3 grid gap-2">
                {(
                  [
                    ["light", copy.light],
                    ["dark", copy.dark],
                    ["system", copy.system],
                  ] as const
                ).map(([value, label]) => (
                  <OptionButton
                    key={value}
                    selected={appearance === value}
                    label={label}
                    selectedLabel={copy.selected}
                    onClick={() => selectAppearance(value)}
                  />
                ))}
              </div>
            </section>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={() => {
              setIsOpen(false);
              requestAnimationFrame(() => triggerRef.current?.focus());
            }}
            aria-label={copy.close}
            title={copy.close}
            className="romdoc-focus-ring absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--rd-border)] bg-[var(--rd-surface)] text-[var(--rd-text-secondary)] shadow-sm transition hover:text-[var(--rd-text-primary)] sm:right-6 sm:top-6"
          >
            ✕
          </button>
        </div>
      </section>
    </div>
  );
}
