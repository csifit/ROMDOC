"use client";

import { useEffect, useState } from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";
import { getTelehealthReferencePath } from "@/lib/telehealth/constants";

export default function TelehealthCall({
  reference,
  locale,
}: {
  reference: string;
  locale: AppLocale;
}) {
  const [joinUrl, setJoinUrl] = useState("");
  const [error, setError] = useState("");
  const copy = locale === "ro" ? { privacy: "Conținutul audio și video nu este înregistrat, transcris sau stocat de RomDoc ori Daily.", loading: "Se pregătește consultația video...", support: "Solicită ajutor tehnic" } : locale === "de" ? { privacy: "Audio und Video werden weder von RomDoc noch von Daily aufgezeichnet, transkribiert oder gespeichert.", loading: "Videosprechstunde wird vorbereitet...", support: "Technische Hilfe anfordern" } : { privacy: "Audio and video are not recorded, transcribed, or stored by RomDoc or Daily.", loading: "Preparing the video consultation...", support: "Get technical help" };

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    fetch("/api/telehealth/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, mobile }) })
      .then(async (response) => { const result = (await response.json()) as { joinUrl?: string; error?: string }; if (response.status === 401) { const next = getTelehealthReferencePath(reference, locale); window.location.href = `/login?locale=${locale}&next=${encodeURIComponent(next)}`; return; } if (!response.ok || !result.joinUrl) throw new Error(result.error ?? "Video consultation unavailable."); setJoinUrl(result.joinUrl); })
      .catch((joinError) => setError(joinError instanceof Error ? joinError.message : "Video consultation unavailable."));
  }, [locale, reference]);

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#102a43_0%,#07111f_42%,#020617_100%)]">
      {error ? (
        <div
          role="alert"
          className="m-auto max-w-xl rounded-[13px] border border-red-400/40 bg-red-950/90 p-[21px] text-red-50 shadow-[0_24px_70px_rgba(0,0,0,0.5),0_0_45px_rgba(239,68,68,0.16)]"
        >
          <p>{error}</p>
          <a
            href="/support"
            target="_blank"
            rel="noreferrer"
            className="mt-[13px] inline-flex rounded-[8px] border border-red-300 px-[13px] py-[8px] font-semibold"
          >
            {copy.support}
          </a>
        </div>
      ) : joinUrl ? (
        <div className="relative isolate flex min-h-0 flex-1 p-2 sm:p-4 lg:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[5%] inset-y-[8%] rounded-[36px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.65)_0%,rgba(14,165,233,0.38)_35%,rgba(37,99,235,0.14)_62%,transparent_78%)] blur-[34px] sm:blur-[48px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[18%] bottom-0 h-16 rounded-full bg-cyan-400/20 blur-[40px]"
          />

          <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden rounded-[16px] border border-cyan-100/20 bg-slate-950 p-[3px] shadow-[0_24px_65px_rgba(0,0,0,0.68),0_0_35px_rgba(34,211,238,0.38),0_0_90px_rgba(14,165,233,0.2),inset_0_1px_0_rgba(255,255,255,0.13)] sm:rounded-[22px] sm:p-[5px]">
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-[12px] border border-black/80 bg-black shadow-[inset_0_0_22px_rgba(0,0,0,0.95)] sm:rounded-[17px]">
              <iframe
                title="RomDoc video consultation"
                src={joinUrl}
                allow="camera; microphone; fullscreen; speaker; display-capture"
                className="min-h-0 flex-1 border-0 bg-black"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="m-auto flex flex-col items-center gap-4 rounded-2xl border border-cyan-200/15 bg-slate-900/70 px-8 py-7 text-sm font-medium text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.45),0_0_50px_rgba(34,211,238,0.12)] backdrop-blur">
          <span
            aria-hidden="true"
            className="h-9 w-9 animate-pulse rounded-full border border-cyan-300/40 bg-cyan-300/10 shadow-[0_0_25px_rgba(34,211,238,0.45)]"
          />
          {copy.loading}
        </div>
      )}

      <p className="relative z-20 border-t border-white/5 bg-slate-950/55 px-3 py-1.5 text-center text-[11px] font-normal leading-4 text-slate-400 backdrop-blur sm:text-xs">
        {copy.privacy}
      </p>
    </div>
  );
}
