"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

import { normalizeAppLocale } from "@/lib/i18n/app-locale";

export default function TelehealthPaymentResumeButton({ appointmentId }: { appointmentId: string }) {
  const locale = normalizeAppLocale(useLocale());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy = locale === "ro"
    ? { action: "Continuă plata securizată", failed: "Plata nu a putut fi reluată." }
    : locale === "de"
      ? { action: "Sichere Zahlung fortsetzen", failed: "Die Zahlung konnte nicht fortgesetzt werden." }
      : { action: "Continue secure payment", failed: "The payment could not be resumed." };

  async function resume() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/telehealth/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentId }) });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? copy.failed);
      window.location.href = result.url;
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : copy.failed);
      setBusy(false);
    }
  }

  return <div className="mt-[13px]">
    <button type="button" onClick={resume} disabled={busy} className="romdoc-button romdoc-button-primary romdoc-button-sm">{busy ? "…" : copy.action}</button>
    {error && <p role="alert" className="mt-[8px] text-sm text-red-700">{error}</p>}
  </div>;
}
