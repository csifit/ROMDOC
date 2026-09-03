"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { normalizeAppLocale } from "@/lib/i18n/app-locale";

export default function TelehealthRefundButton({ appointmentId }: { appointmentId: string }) {
  const locale = normalizeAppLocale(useLocale());
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const copy = locale === "ro" ? { action: "Rambursează plata video", confirm: "Rambursezi integral plata acestei consultații video?", success: "Rambursarea a fost inițiată.", failed: "Rambursarea nu a putut fi efectuată." } : locale === "de" ? { action: "Videozahlung erstatten", confirm: "Die Zahlung dieser Videosprechstunde vollständig erstatten?", success: "Die Erstattung wurde veranlasst.", failed: "Die Erstattung konnte nicht durchgeführt werden." } : { action: "Refund video payment", confirm: "Fully refund this video consultation payment?", success: "The refund was initiated.", failed: "The refund could not be completed." };

  async function refund() {
    if (!window.confirm(copy.confirm)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/telehealth/refund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentId }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? copy.failed);
      setMessage(copy.success);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.failed); }
    finally { setBusy(false); }
  }

  return <span className="inline-flex flex-col gap-[5px]"><button type="button" onClick={refund} disabled={busy} className="romdoc-button romdoc-button-secondary romdoc-button-sm">{busy ? "…" : copy.action}</button>{message && <span className="text-xs text-gray-600">{message}</span>}</span>;
}
