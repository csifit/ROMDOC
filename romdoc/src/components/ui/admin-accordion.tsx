"use client";

import { type ReactNode, useId, useState } from "react";

type AdminAccordionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export default function AdminAccordion({
  title,
  description,
  children,
  defaultOpen = false,
}: AdminAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section
      data-state={isOpen ? "open" : "closed"}
      className="romdoc-accordion overflow-hidden rounded-2xl border shadow-sm"
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="romdoc-accordion-trigger romdoc-focus-ring flex w-full items-center justify-between gap-5 px-5 py-5 text-left transition sm:px-6"
      >
        <span className="min-w-0">
          <span className="block text-lg font-bold text-[var(--rd-text-primary)]">
            {title}
          </span>

          {description ? (
            <span className="mt-1 block text-sm leading-6 text-[var(--rd-text-secondary)]">
              {description}
            </span>
          ) : null}
        </span>

        <span
          aria-hidden="true"
          className={`romdoc-accordion-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xl font-semibold transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ⌄
        </span>
      </button>

      {isOpen ? (
        <div
          id={contentId}
          className="romdoc-accordion-content border-t p-5 sm:p-6"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
