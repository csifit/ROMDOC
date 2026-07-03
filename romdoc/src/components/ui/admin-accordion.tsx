"use client";

import { type ReactNode, useState } from "react";

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

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="romdoc-focus-ring flex w-full items-center justify-between gap-5 px-5 py-5 text-left sm:px-6"
      >
        <span>
          <span className="block text-lg font-bold text-gray-900">
            {title}
          </span>

          {description ? (
            <span className="mt-1 block text-sm leading-6 text-gray-600">
              {description}
            </span>
          ) : null}
        </span>

        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xl font-semibold text-gray-700 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ⌄
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-gray-200 p-5 sm:p-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}
