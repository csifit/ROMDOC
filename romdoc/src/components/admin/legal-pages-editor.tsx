"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import {
  formatLegalDate,
  type LegalLocale,
  type LegalPageKey,
} from "@/lib/legal/legal-pages";

export type LegalPageEditorItem = {
  key: LegalPageKey;
  locale: LegalLocale;
  title: string;
  route: string;
  content: string;
  updatedAt: string;
};

type Props = {
  initialPages: LegalPageEditorItem[];
  databaseReady: boolean;
};

type EditablePage = LegalPageEditorItem & { savedContent: string };

type SaveResponse = {
  page?: { key: LegalPageKey; locale: LegalLocale; content: string; updatedAt: string };
  error?: string;
};

const localeLabels: Record<LegalLocale, string> = {
  ro: "Română",
  en: "English",
  de: "Deutsch",
};

export default function LegalPagesEditor({ initialPages, databaseReady }: Props) {
  const [pages, setPages] = useState<EditablePage[]>(initialPages.map((page) => ({ ...page, savedContent: page.content })));
  const [activeKey, setActiveKey] = useState<LegalPageKey>(initialPages[0]?.key ?? "terms");
  const [activeLocale, setActiveLocale] = useState<LegalLocale>("ro");
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { type: "success" | "error"; text: string } | undefined>>({});

  const pageKeys = useMemo(() => Array.from(new Set(initialPages.map((page) => page.key))), [initialPages]);
  const currentPage = pages.find((page) => page.key === activeKey && page.locale === activeLocale);
  const id = `${activeKey}:${activeLocale}`;

  function updateContent(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setPages((current) => current.map((page) => page.key === activeKey && page.locale === activeLocale ? { ...page, content: value } : page));
    setMessages((current) => ({ ...current, [id]: undefined }));
  }

  async function savePage() {
    if (!currentPage || !databaseReady || currentPage.content === currentPage.savedContent) return;
    setSaving(id);
    try {
      const response = await fetch("/api/admin/privacy/legal-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey: currentPage.key, locale: currentPage.locale, content: currentPage.content }),
      });
      const result = (await response.json()) as SaveResponse;
      if (!response.ok || !result.page) throw new Error(result.error || "Documentul nu a putut fi salvat.");
      setPages((current) => current.map((page) => page.key === activeKey && page.locale === activeLocale ? {
        ...page,
        content: result.page?.content ?? page.content,
        savedContent: result.page?.content ?? page.content,
        updatedAt: result.page?.updatedAt ?? page.updatedAt,
      } : page));
      setMessages((current) => ({ ...current, [id]: { type: "success", text: "Traducerea a fost salvată și publicată." } }));
    } catch (error) {
      setMessages((current) => ({ ...current, [id]: { type: "error", text: error instanceof Error ? error.message : "Documentul nu a putut fi salvat." } }));
    } finally {
      setSaving(null);
    }
  }

  if (!currentPage) return null;
  const dirty = currentPage.content !== currentPage.savedContent;
  const message = messages[id];

  return (
    <div className="space-y-6">
      {!databaseReady && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          Rulează mai întâi migrarea <strong>76-localized-legal-pages.sql</strong>.
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {pageKeys.map((key) => {
            const label = pages.find((page) => page.key === key && page.locale === "ro")?.title ?? key;
            return (
              <button key={key} type="button" onClick={() => setActiveKey(key)} className={activeKey === key ? "rounded-xl bg-[#036661] px-4 py-2 text-sm font-semibold text-white" : "rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"}>
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-5">
          {(["ro", "en", "de"] as LegalLocale[]).map((locale) => (
            <button key={locale} type="button" onClick={() => setActiveLocale(locale)} className={activeLocale === locale ? "rounded-full bg-[#036661] px-4 py-2 text-sm font-semibold text-white" : "rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"}>
              {localeLabels[locale]}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{currentPage.title}</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase text-gray-700">{activeLocale}</span>
              {dirty && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Modificări nesalvate</span>}
            </div>
            <p className="mt-2 text-sm text-gray-500">Ultima modificare: {formatLegalDate(currentPage.updatedAt, activeLocale)}</p>
          </div>
          <Link href={currentPage.route} target="_blank" rel="noreferrer" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100">Deschide pagina publică</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
          Titlurile secțiunilor încep cu <code>##</code>. Listele folosesc <code>-</code>. HTML nu este acceptat.
        </div>

        <label htmlFor="legal-content" className="mt-6 block text-sm font-semibold text-gray-800">Textul documentului</label>
        <textarea id="legal-content" value={currentPage.content} onChange={updateContent} disabled={saving === id} className="mt-2 h-[36rem] min-h-80 w-full resize-y rounded-2xl border border-gray-300 px-4 py-4 font-mono text-sm leading-6 outline-none focus:border-[#036661] focus:ring-4 focus:ring-[#036661]/10 disabled:bg-gray-50" />

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-sm">
            {message ? <p className={message.type === "success" ? "font-medium text-emerald-700" : "font-medium text-red-700"}>{message.text}</p> : <p className="text-gray-500">{currentPage.content.length.toLocaleString("ro-RO")} caractere</p>}
          </div>
          <button type="button" onClick={() => void savePage()} disabled={!databaseReady || !dirty || saving === id} className="rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-50">
            {saving === id ? "Se salvează..." : `Salvează ${activeLocale.toUpperCase()}`}
          </button>
        </div>
      </section>
    </div>
  );
}
