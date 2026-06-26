"use client";

import Link from "next/link";
import {
  useState,
  type ChangeEvent,
} from "react";

import {
  formatLegalDate,
  type LegalPageKey,
} from "@/lib/legal/legal-pages";

export type LegalPageEditorItem = {
  key: LegalPageKey;
  title: string;
  route: string;
  content: string;
  updatedAt: string;
};

type LegalPagesEditorProps = {
  initialPages: LegalPageEditorItem[];
  databaseReady: boolean;
};

type EditableLegalPage =
  LegalPageEditorItem & {
    savedContent: string;
  };

type SaveResponse = {
  page?: {
    key: LegalPageKey;
    content: string;
    updatedAt: string;
  };
  error?: string;
};

export default function LegalPagesEditor({
  initialPages,
  databaseReady,
}: LegalPagesEditorProps) {
  const [pages, setPages] =
    useState<EditableLegalPage[]>(
      initialPages.map((page) => ({
        ...page,
        savedContent:
          page.content,
      }))
    );

  const [savingKey, setSavingKey] =
    useState<LegalPageKey | null>(
      null
    );

  const [messages, setMessages] =
    useState<
      Partial<
        Record<
          LegalPageKey,
          {
            type:
              | "success"
              | "error";
            text: string;
          }
        >
      >
    >({});

  function updateContent(
    key: LegalPageKey,
    content: string
  ) {
    setPages((current) =>
      current.map((page) =>
        page.key === key
          ? {
              ...page,
              content,
            }
          : page
      )
    );

    setMessages((current) => ({
      ...current,
      [key]: undefined,
    }));
  }

  async function savePage(
    page: EditableLegalPage
  ) {
    if (
      !databaseReady ||
      page.content ===
        page.savedContent
    ) {
      return;
    }

    setSavingKey(page.key);
    setMessages((current) => ({
      ...current,
      [page.key]: undefined,
    }));

    try {
      const response = await fetch(
        "/api/admin/privacy/legal-pages",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            pageKey: page.key,
            content: page.content,
          }),
        }
      );

      const result =
        (await response.json()) as
          SaveResponse;

      if (
        !response.ok ||
        !result.page
      ) {
        throw new Error(
          result.error ||
            "Documentul nu a putut fi salvat."
        );
      }

      setPages((current) =>
        current.map(
          (currentPage) =>
            currentPage.key ===
            page.key
              ? {
                  ...currentPage,
                  content:
                    result.page
                      ?.content ??
                    currentPage.content,
                  savedContent:
                    result.page
                      ?.content ??
                    currentPage.content,
                  updatedAt:
                    result.page
                      ?.updatedAt ??
                    currentPage.updatedAt,
                }
              : currentPage
        )
      );

      setMessages((current) => ({
        ...current,
        [page.key]: {
          type: "success",
          text:
            "Documentul a fost salvat și pagina publică a fost actualizată.",
        },
      }));
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [page.key]: {
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Documentul nu a putut fi salvat.",
        },
      }));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-8">
      {!databaseReady && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-900">
          Tabela pentru documentele legale nu este disponibilă. Rulează mai întâi migrarea
          <strong className="ml-1">
            54-admin-legal-page-editor.sql
          </strong>
          . Până atunci poți vedea textul implicit, dar salvarea este dezactivată.
        </div>
      )}

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950">
        <p className="font-semibold">
          Reguli simple de formatare
        </p>
        <p className="mt-2">
          Scrie titlurile secțiunilor pe linii separate și începe-le cu
          <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            ##
          </code>
          . Lasă o linie liberă între paragrafe. Pentru liste, începe fiecare element cu
          <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            -
          </code>
          . Codul HTML nu este acceptat.
        </p>
        <p className="mt-2 font-medium">
          Salvarea publică imediat modificarea pe pagina legală corespunzătoare.
        </p>
      </div>

      {pages.map((page) => {
        const dirty =
          page.content !==
          page.savedContent;
        const message =
          messages[page.key];
        const isSaving =
          savingKey === page.key;

        return (
          <section
            key={page.key}
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                    {page.title}
                  </h2>

                  {dirty && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                      Modificări nesalvate
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  Data ultimei modificări:{" "}
                  <span className="font-medium text-gray-700">
                    {formatLegalDate(
                      page.updatedAt
                    )}
                  </span>
                </p>
              </div>

              <Link
                href={page.route}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
              >
                Deschide pagina publică
              </Link>
            </div>

            <label
              htmlFor={`legal-content-${page.key}`}
              className="mt-6 block text-sm font-semibold text-gray-800"
            >
              Textul documentului
            </label>

            <textarea
              id={`legal-content-${page.key}`}
              value={page.content}
              onChange={(
                event: ChangeEvent<HTMLTextAreaElement>
              ) =>
                updateContent(
                  page.key,
                  event.target.value
                )
              }
              spellCheck
              disabled={isSaving}
              className="mt-2 h-[32rem] min-h-80 w-full resize-y overflow-y-auto rounded-2xl border border-gray-300 bg-white px-4 py-4 font-mono text-sm leading-6 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-4 focus:ring-[#036661]/10 disabled:cursor-wait disabled:bg-gray-50"
            />

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div
                aria-live="polite"
                className="min-h-6 text-sm"
              >
                {message && (
                  <p
                    className={
                      message.type ===
                      "success"
                        ? "font-medium text-emerald-700"
                        : "font-medium text-red-700"
                    }
                  >
                    {message.text}
                  </p>
                )}

                {!message && (
                  <p className="text-gray-500">
                    {page.content.length.toLocaleString(
                      "ro-RO"
                    )}{" "}
                    caractere
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  void savePage(page)
                }
                disabled={
                  !databaseReady ||
                  !dirty ||
                  isSaving
                }
                className="rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Se salvează..."
                  : "Salvează documentul"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
