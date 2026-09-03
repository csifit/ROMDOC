"use client";

import { useState } from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";
import { getTelehealthReferencePath } from "@/lib/telehealth/constants";

export default function TelehealthLaunchButton({
  reference,
  locale,
}: {
  reference: string;
  locale: AppLocale;
}) {
  const [open, setOpen] = useState(false);
  const label = locale === "ro" ? "Intră în consultația video" : locale === "de" ? "Videosprechstunde öffnen" : "Join video consultation";
  const close = locale === "ro" ? "Închide" : locale === "de" ? "Schließen" : "Close";
  const path = getTelehealthReferencePath(reference);

  function launch() {
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    setOpen(true);
  }

  return <>
    <button type="button" onClick={launch} className="romdoc-button romdoc-button-primary romdoc-button-sm">{label}</button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-[21px]">
      <section role="dialog" aria-modal="true" aria-label={label} className="flex h-[min(900px,92vh)] w-[min(1400px,96vw)] flex-col overflow-hidden rounded-[21px] bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900 px-[13px] py-[8px]"><span className="font-semibold text-white">RomDoc Telehealth</span><button type="button" onClick={() => setOpen(false)} className="rounded-[8px] border border-gray-600 px-[13px] py-[8px] text-sm font-semibold text-white">{close}</button></div>
        <iframe title={label} src={path} allow="camera; microphone; fullscreen; speaker; display-capture" className="min-h-0 flex-1 border-0" />
      </section>
    </div>}
  </>;
}
