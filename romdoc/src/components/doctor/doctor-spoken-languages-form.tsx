"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";

import Button from "@/components/ui/button";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import { SPOKEN_LANGUAGE_OPTIONS, type SpokenLanguageCode } from "@/lib/telehealth/constants";

export default function DoctorSpokenLanguagesForm({ initialLanguages }: { initialLanguages: string[] }) {
  const locale = normalizeAppLocale(useLocale());
  const [selected, setSelected] = useState<SpokenLanguageCode[]>(
    SPOKEN_LANGUAGE_OPTIONS.filter((language) => initialLanguages.includes(language.code)).map((language) => language.code)
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const copy = locale === "ro"
    ? { title: "Limbi vorbite", description: "Aceste limbi apar pe profilul public și descriu limbile în care poți susține consultația.", save: "Salvează limbile", saving: "Se salvează...", success: "Limbile vorbite au fost actualizate.", failed: "Limbile nu au putut fi actualizate." }
    : locale === "de"
      ? { title: "Gesprochene Sprachen", description: "Diese Sprachen erscheinen im öffentlichen Profil und geben an, in welchen Sprachen Sie beraten können.", save: "Sprachen speichern", saving: "Wird gespeichert...", success: "Gesprochene Sprachen wurden aktualisiert.", failed: "Sprachen konnten nicht aktualisiert werden." }
      : { title: "Languages spoken", description: "These languages appear publicly and describe the languages in which you can provide a consultation.", save: "Save languages", saving: "Saving...", success: "Languages spoken updated.", failed: "Languages could not be updated." };

  function toggle(code: SpokenLanguageCode) {
    setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  function save() {
    setMessage(""); setError("");
    startTransition(async () => {
      const response = await fetch("/api/doctor/languages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ languages: selected }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) { setError(result.error ?? copy.failed); return; }
      setMessage(copy.success);
    });
  }

  return <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-bold text-gray-900">{copy.title}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{copy.description}</p>
    {message && <div className="romdoc-notice romdoc-notice-success mt-4">{message}</div>}{error && <div role="alert" className="romdoc-notice romdoc-notice-danger mt-4">{error}</div>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{SPOKEN_LANGUAGE_OPTIONS.map((language) => <label key={language.code} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"><input type="checkbox" checked={selected.includes(language.code)} disabled={isPending} onChange={() => toggle(language.code)} className="h-5 w-5" /><span>{language.labels[locale]}</span></label>)}</div>
    <div className="mt-5"><Button type="button" onClick={save} isLoading={isPending} loadingText={copy.saving}>{copy.save}</Button></div>
  </section>;
}
