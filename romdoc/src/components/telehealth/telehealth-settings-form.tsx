"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale } from "next-intl";

import Button from "@/components/ui/button";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";

type Settings = {
  doctorId: string;
  ownerType: "doctor" | "clinic_organization";
  restrictedByAdmin: boolean;
  restrictionReason: string | null;
  offer: { enabled: boolean; price_minor: number | null; currency: "RON" | "EUR"; duration_minutes: number };
  stripe: { connected: boolean; detailsSubmitted: boolean; chargesEnabled: boolean; payoutsEnabled: boolean };
};

const COPY = {
  ro: { enabled: "Consultații video activate", price: "Preț consultație video", duration: "Durată", minutes: "minute", currency: "Monedă", save: "Salvează", saving: "Se salvează...", accountTitle: "Cont de încasare Stripe", accountHelp: "Configurează contul care primește plățile, apoi administrează soldul, plățile, rambursările și transferurile în Stripe Dashboard.", connect: "Configurează contul de plată Stripe", reconnect: "Continuă configurarea Stripe", dashboard: "Deschide Stripe Dashboard", ready: "Stripe este pregătit pentru plăți", notReady: "Stripe trebuie configurat înainte de activare", restricted: "Accesul la telehealth este restricționat de Admin", saved: "Setările telehealth au fost salvate.", loadFailed: "Setările telehealth nu au putut fi încărcate.", privacy: "Consultațiile video folosesc Daily. Înregistrarea audio, video și transcrierea sunt dezactivate." },
  en: { enabled: "Video consultations enabled", price: "Video consultation price", duration: "Duration", minutes: "minutes", currency: "Currency", save: "Save", saving: "Saving...", accountTitle: "Stripe receiving account", accountHelp: "Set up the account that receives patient payments, then manage balances, payments, refunds and payouts in Stripe Dashboard.", connect: "Set up Stripe payment account", reconnect: "Continue Stripe setup", dashboard: "Open Stripe Dashboard", ready: "Stripe is ready to accept payments", notReady: "Stripe must be configured before enabling", restricted: "Telehealth access is restricted by Admin", saved: "Telehealth settings saved.", loadFailed: "Telehealth settings could not be loaded.", privacy: "Video consultations use Daily. Audio recording, video recording and transcription are disabled." },
  de: { enabled: "Videosprechstunden aktiviert", price: "Preis der Videosprechstunde", duration: "Dauer", minutes: "Minuten", currency: "Währung", save: "Speichern", saving: "Wird gespeichert...", accountTitle: "Stripe-Empfangskonto", accountHelp: "Richten Sie das Konto für Patientenzahlungen ein und verwalten Sie anschließend Salden, Zahlungen, Erstattungen und Auszahlungen im Stripe Dashboard.", connect: "Stripe-Zahlungskonto einrichten", reconnect: "Stripe-Einrichtung fortsetzen", dashboard: "Stripe Dashboard öffnen", ready: "Stripe ist für Zahlungen bereit", notReady: "Stripe muss vor der Aktivierung eingerichtet werden", restricted: "Der Telehealth-Zugang wurde von Admin eingeschränkt", saved: "Telehealth-Einstellungen gespeichert.", loadFailed: "Telehealth-Einstellungen konnten nicht geladen werden.", privacy: "Videosprechstunden verwenden Daily. Audio- und Videoaufzeichnung sowie Transkription sind deaktiviert." },
} as const;

async function readApiResult<T extends object>(response: Response) {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export default function TelehealthSettingsForm({ doctorId }: { doctorId?: string }) {
  const locale = normalizeAppLocale(useLocale());
  const copy = COPY[locale];
  const [settings, setSettings] = useState<Settings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"RON" | "EUR">("RON");
  const [duration, setDuration] = useState("30");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    const query = doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : "";
    fetch(`/api/telehealth/settings${query}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await readApiResult<Settings & { error?: string }>(response);
        if (!response.ok) throw new Error(result.error ?? copy.loadFailed);
        if (!active) return;
        setSettings(result);
        setEnabled(result.offer.enabled);
        setPrice(result.offer.price_minor ? String(result.offer.price_minor / 100) : "");
        setCurrency(result.offer.currency);
        setDuration(String(result.offer.duration_minutes));
      })
      .catch((loadError) => active && setError(loadError instanceof Error ? loadError.message : copy.loadFailed));
    return () => { active = false; };
  }, [copy.loadFailed, doctorId]);

  function connectStripe() {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/telehealth/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId: doctorId ?? settings?.doctorId }),
        });
        const result = await readApiResult<{ url?: string; error?: string }>(response);
        if (!response.ok || !result.url) { setError(result.error ?? copy.notReady); return; }
        window.location.href = result.url;
      } catch {
        setError(copy.notReady);
      }
    });
  }

  function openStripeDashboard() {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/telehealth/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId: doctorId ?? settings?.doctorId }),
        });
        const result = await readApiResult<{ url?: string; error?: string }>(response);
        if (!response.ok || !result.url) { setError(result.error ?? copy.loadFailed); return; }
        window.location.href = result.url;
      } catch {
        setError(copy.loadFailed);
      }
    });
  }

  function save() {
    setError(""); setMessage("");
    startTransition(async () => {
      try {
        const priceMinor = Math.round(Number(price.replace(",", ".")) * 100);
        const response = await fetch("/api/telehealth/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId: doctorId ?? settings?.doctorId, enabled, priceMinor, currency, durationMinutes: Number(duration) }),
        });
        const result = await readApiResult<{ error?: string }>(response);
        if (!response.ok) { setError(result.error ?? copy.loadFailed); return; }
        setMessage(copy.saved);
      } catch {
        setError(copy.loadFailed);
      }
    });
  }

  if (!settings && !error) return <div className="rounded-[13px] border border-gray-200 bg-white p-[21px] text-sm text-gray-500">…</div>;

  const stripeReady = Boolean(settings?.stripe.chargesEnabled && settings?.stripe.payoutsEnabled && settings?.stripe.detailsSubmitted);
  return <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
    {error && <div role="alert" className="romdoc-notice romdoc-notice-danger mb-[13px]">{error}</div>}
    {message && <div className="romdoc-notice romdoc-notice-success mb-[13px]">{message}</div>}
    {settings?.restrictedByAdmin && <div className="romdoc-notice romdoc-notice-warning mb-[13px]"><strong>{copy.restricted}</strong>{settings.restrictionReason ? `: ${settings.restrictionReason}` : ""}</div>}
    <div className={`rounded-[13px] border p-[13px] text-sm ${stripeReady ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
      <p className="font-bold">{copy.accountTitle}</p>
      <p className="mt-[5px] leading-6">{copy.accountHelp}</p>
      <p className="mt-[8px] font-semibold">{stripeReady ? copy.ready : copy.notReady}</p>
      <div className="mt-[13px] flex flex-wrap gap-[8px]">
        {!stripeReady && !settings?.restrictedByAdmin && <Button type="button" variant="secondary" onClick={connectStripe} disabled={isPending}>{settings?.stripe.connected ? copy.reconnect : copy.connect}</Button>}
        {settings?.stripe.connected && settings.stripe.detailsSubmitted && <Button type="button" variant="secondary" onClick={openStripeDashboard} disabled={isPending}>{copy.dashboard}</Button>}
      </div>
    </div>
    <div className="mt-[21px] grid gap-[13px] sm:grid-cols-3">
      <label className="sm:col-span-3 flex items-center gap-[10px]"><input type="checkbox" checked={enabled} disabled={isPending || !stripeReady || settings?.restrictedByAdmin} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5" /><span className="font-semibold text-gray-900">{copy.enabled}</span></label>
      <label><span className="romdoc-label">{copy.price}</span><input className="romdoc-input mt-[8px]" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} disabled={isPending || settings?.restrictedByAdmin} /></label>
      <label><span className="romdoc-label">{copy.currency}</span><select className="romdoc-input mt-[8px]" value={currency} onChange={(event) => setCurrency(event.target.value as "RON" | "EUR")} disabled={isPending || settings?.restrictedByAdmin}><option>RON</option><option>EUR</option></select></label>
      <label><span className="romdoc-label">{copy.duration}</span><select className="romdoc-input mt-[8px]" value={duration} onChange={(event) => setDuration(event.target.value)} disabled={isPending || settings?.restrictedByAdmin}>{[15,20,30,45,60,90,120].map((value) => <option key={value} value={value}>{value} {copy.minutes}</option>)}</select></label>
    </div>
    <p className="mt-[13px] text-sm leading-6 text-gray-600">{copy.privacy}</p>
    <div className="mt-[21px]"><Button type="button" onClick={save} disabled={settings?.restrictedByAdmin} isLoading={isPending} loadingText={copy.saving}>{copy.save}</Button></div>
  </section>;
}
