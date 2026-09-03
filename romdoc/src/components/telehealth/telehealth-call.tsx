"use client";

import { useEffect, useState } from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";

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
      .then(async (response) => { const result = (await response.json()) as { joinUrl?: string; error?: string }; if (response.status === 401) { const next = `/telehealth/${encodeURIComponent(reference)}`; window.location.href = `/login?locale=${locale}&next=${encodeURIComponent(next)}`; return; } if (!response.ok || !result.joinUrl) throw new Error(result.error ?? "Video consultation unavailable."); setJoinUrl(result.joinUrl); })
      .catch((joinError) => setError(joinError instanceof Error ? joinError.message : "Video consultation unavailable."));
  }, [locale, reference]);

  return <div className="flex min-h-[100dvh] flex-col bg-gray-950">
    <div className="border-b border-emerald-700 bg-emerald-950 px-4 py-3 text-center text-sm font-semibold text-emerald-50">● {copy.privacy}</div>
    {error ? <div role="alert" className="m-auto max-w-xl rounded-[13px] border border-red-700 bg-red-950 p-[21px] text-red-50"><p>{error}</p><a href="/support" target="_blank" rel="noreferrer" className="mt-[13px] inline-flex rounded-[8px] border border-red-300 px-[13px] py-[8px] font-semibold">{copy.support}</a></div> : joinUrl ? <iframe title="RomDoc video consultation" src={joinUrl} allow="camera; microphone; fullscreen; speaker; display-capture" className="min-h-0 flex-1 border-0" /> : <div className="m-auto text-sm text-gray-200">{copy.loading}</div>}
  </div>;
}
