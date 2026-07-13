import Link from "@/components/public/localized-public-link";
import type {
  ReactNode,
} from "react";

import PublicLayout from "@/components/public/public-layout";
import {
  formatLegalDate,
  parseLegalContent,
} from "@/lib/legal/legal-pages";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  content: string;
  notice?: ReactNode;
};

export default function LegalPageShell({
  eyebrow,
  title,
  description,
  updatedAt,
  content,
  notice,
}: LegalPageShellProps) {
  const sections =
    parseLegalContent(content);

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#036661]">
                  {eyebrow}
                </p>

                <nav
                  aria-label="Cuprins"
                  className="mt-5"
                >
                  <ul className="space-y-2">
                    {sections.map(
                      (section) => (
                        <li key={section.id}>
                          <a
                            href={`#${section.id}`}
                            className="romdoc-focus-ring block rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#036661]/5 hover:text-[#036661]"
                          >
                            {section.title}
                          </a>
                        </li>
                      )
                    )}
                  </ul>
                </nav>

                <div className="mt-6 border-t border-gray-200 pt-5">
                  <Link
                    href="/contact"
                    className="romdoc-button romdoc-button-secondary romdoc-button-full"
                  >
                    ContacteazÄƒ RomDoc
                  </Link>
                </div>
              </div>
            </aside>

            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
              <header className="border-b border-gray-200 pb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
                  {eyebrow}
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {title}
                </h1>

                <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
                  {description}
                </p>

                <p className="mt-4 text-sm text-gray-500">
                  Ultima actualizare:{" "}
                  {formatLegalDate(
                    updatedAt
                  )}
                </p>
              </header>

              {notice && (
                <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                  {notice}
                </div>
              )}

              <div className="mt-10 space-y-10">
                {sections.length > 0 ? (
                  sections.map(
                    (section) => (
                      <section
                        key={section.id}
                        id={section.id}
                        className="scroll-mt-28"
                      >
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                          {section.title}
                        </h2>

                        <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
                          {section.blocks.map(
                            (block, index) => {
                              if (
                                block.type ===
                                "list"
                              ) {
                                return (
                                  <ul
                                    key={`${section.id}-list-${index}`}
                                    className="list-disc space-y-2 pl-6"
                                  >
                                    {block.items.map(
                                      (
                                        item,
                                        itemIndex
                                      ) => (
                                        <li
                                          key={`${section.id}-list-${index}-${itemIndex}`}
                                        >
                                          {item}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                );
                              }

                              return (
                                <p
                                  key={`${section.id}-paragraph-${index}`}
                                  className="whitespace-pre-line"
                                >
                                  {block.text}
                                </p>
                              );
                            }
                          )}
                        </div>
                      </section>
                    )
                  )
                ) : (
                  <p className="text-base leading-7 text-gray-700">
                    ConÈ›inutul acestui document va fi publicat Ã®n curÃ¢nd.
                  </p>
                )}
              </div>
            </article>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}

