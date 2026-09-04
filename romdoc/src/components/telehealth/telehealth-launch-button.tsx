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
  const path = getTelehealthReferencePath(reference, locale);

  function launch() {
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    setOpen(true);
  }

  return <>
    <button type="button" onClick={launch} className="romdoc-button romdoc-button-primary romdoc-button-sm">{label}</button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(8,47,73,0.58),rgba(0,0,0,0.88)_70%)] p-[21px] backdrop-blur-sm">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] inset-y-[9%] rounded-[48px] bg-cyan-400/10 blur-[70px]" />
      <section role="dialog" aria-modal="true" aria-label={label} className="relative z-10 flex h-[min(900px,92vh)] w-[min(1400px,96vw)] flex-col overflow-hidden rounded-[24px] border border-cyan-200/20 bg-gray-950 shadow-[0_32px_100px_rgba(0,0,0,0.75),0_0_55px_rgba(34,211,238,0.18)] ring-1 ring-white/5">
        <div className="flex items-center justify-between border-b border-cyan-200/15 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 px-[13px] py-[8px]"><span className="font-semibold text-white">RomDoc Telehealth</span><button type="button" onClick={() => setOpen(false)} className="rounded-[8px] border border-cyan-100/25 bg-white/5 px-[13px] py-[8px] text-sm font-semibold text-white transition hover:border-cyan-200/50 hover:bg-white/10">{close}</button></div>
        <iframe title={label} src={path} allow="camera; microphone; fullscreen; speaker; display-capture" className="min-h-0 flex-1 border-0" />
      </section>
    </div>}
  </>;
}
