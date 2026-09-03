"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";

import {
  BOOKING_COPY,
  interpolateBookingCopy,
} from "@/lib/appointments/booking-copy";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type PublicSlot = { time: string; durationMinutes: number };
type AvailableDate = { date: string; availableSlotCount: number; slots: PublicSlot[] };
type AvailabilityApiResponse = { dates?: AvailableDate[]; error?: string };
type Props = { doctorId: string; clinicId: string; minimumDate: string; maximumDate: string; selectedDate: string; selectedTime: string; requiredDurationMinutes?: number; disabled?: boolean; onDateChange: (date: string) => void; onTimeChange: (time: string, durationMinutes: number) => void };

const WEEKDAYS = { ro: ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"], en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"], de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] } as const;
const INTL_LOCALE = { ro: "ro-RO", en: "en-GB", de: "de-DE" } as const;

function parseDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Date(Date.UTC(year, month - 1, day)); }
function formatDate(value: Date) { return value.toISOString().slice(0, 10); }
function getMonthStart(value: Date) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)); }
function getMonthEnd(value: Date) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)); }
function addMonths(value: Date, count: number) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + count, 1)); }
function getCalendarCells(month: Date) {
  const first = getMonthStart(month); const last = getMonthEnd(month); const leading = (first.getUTCDay() + 6) % 7;
  const cells: Array<{ key: string; date: string | null; dayNumber: number | null }> = [];
  for (let index = 0; index < leading; index += 1) cells.push({ key: `empty-start-${index}`, date: null, dayNumber: null });
  for (let day = 1; day <= last.getUTCDate(); day += 1) { const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day)); const value = formatDate(date); cells.push({ key: value, date: value, dayNumber: day }); }
  while (cells.length % 7 !== 0) cells.push({ key: `empty-end-${cells.length}`, date: null, dayNumber: null });
  return cells;
}
function getRange(month: Date, minimumDate: string, maximumDate: string) { const start = formatDate(getMonthStart(month)); const end = formatDate(getMonthEnd(month)); const from = start < minimumDate ? minimumDate : start; const to = end > maximumDate ? maximumDate : end; return from <= to ? { from, to } : null; }

export default function PublicAvailabilityCalendar({ doctorId, clinicId, minimumDate, maximumDate, selectedDate, selectedTime, requiredDurationMinutes, disabled = false, onDateChange, onTimeChange }: Props) {
  const locale = normalizeAppLocale(useLocale());
  const t = BOOKING_COPY[locale].calendar;
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), [locale]);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "long", year: "numeric", timeZone: "UTC" }), [locale]);
  const initialMonth = useMemo(() => getMonthStart(parseDate(selectedDate || minimumDate)), [minimumDate, selectedDate]);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [availability, setAvailability] = useState<AvailableDate[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { if (selectedDate) setVisibleMonth(getMonthStart(parseDate(selectedDate))); }, [selectedDate]);
  useEffect(() => {
    if (!clinicId) { setAvailability([]); setHasLoaded(false); setLoadError(null); return; }
    const range = getRange(visibleMonth, minimumDate, maximumDate);
    if (!range) { setAvailability([]); setHasLoaded(true); setLoadError(null); return; }
    const controller = new AbortController();
    async function load() {
      setIsLoading(true); setLoadError(null);
      try {
        const query = new URLSearchParams({ doctorId, clinicId, from: range!.from, to: range!.to });
        if (requiredDurationMinutes) query.set("durationMinutes", String(requiredDurationMinutes));
        const response = await fetch(`/api/availability/slots?${query.toString()}`, { method: "GET", cache: "no-store", signal: controller.signal });
        const result = await response.json() as AvailabilityApiResponse;
        if (!response.ok) throw new Error(locale === "ro" && result.error ? result.error : t.loadFailed);
        const dates = (result.dates ?? []).map((date) => {
          const slots = requiredDurationMinutes
            ? date.slots.filter((slot) => slot.durationMinutes === requiredDurationMinutes)
            : date.slots;
          return { ...date, slots, availableSlotCount: slots.length };
        });
        setAvailability(dates); setHasLoaded(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailability([]); setHasLoaded(true); setLoadError(error instanceof Error ? error.message : t.loadFailed);
      } finally { if (!controller.signal.aborted) setIsLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [clinicId, doctorId, locale, maximumDate, minimumDate, reloadKey, requiredDurationMinutes, t.loadFailed, visibleMonth]);

  const byDate = useMemo(() => new Map(availability.map(item => [item.date, item])), [availability]);
  const selectedAvailability = selectedDate ? byDate.get(selectedDate) ?? null : null;
  const hasAny = availability.some(item => item.availableSlotCount > 0);
  useEffect(() => {
    if (!selectedDate || isLoading || loadError) return;
    const sameMonth = selectedDate.startsWith(formatDate(visibleMonth).slice(0, 7));
    if (sameMonth && (!selectedAvailability || selectedAvailability.availableSlotCount === 0)) { onDateChange(""); onTimeChange("", 30); }
  }, [isLoading, loadError, onDateChange, onTimeChange, selectedAvailability, selectedDate, visibleMonth]);

  const cells = useMemo(() => getCalendarCells(visibleMonth), [visibleMonth]);
  const previousMonth = addMonths(visibleMonth, -1); const nextMonth = addMonths(visibleMonth, 1);
  const canPrevious = formatDate(getMonthEnd(previousMonth)) >= minimumDate; const canNext = formatDate(getMonthStart(nextMonth)) <= maximumDate;

  return (
    <section aria-labelledby="availability-calendar-title" className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
      <h3 id="availability-calendar-title" className="text-base font-semibold text-gray-900">{t.title}</h3>
      <p className="mt-1 text-sm leading-6 text-gray-600">{t.description}</p>
      {!clinicId ? <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-600">{t.selectClinicFirst}</div> : <>
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <button type="button" aria-label={t.previousMonth} disabled={disabled || isLoading || !canPrevious} onClick={() => setVisibleMonth(previousMonth)} className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-xl disabled:opacity-35">‹</button>
            <p className="text-center font-semibold capitalize text-gray-900">{monthFormatter.format(visibleMonth)}</p>
            <button type="button" aria-label={t.nextMonth} disabled={disabled || isLoading || !canNext} onClick={() => setVisibleMonth(nextMonth)} className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-xl disabled:opacity-35">›</button>
          </div>
          <div aria-hidden="true" className="mt-4 grid grid-cols-7 gap-1 text-center">{WEEKDAYS[locale].map(day => <span key={day} className="py-1 text-xs font-semibold text-gray-500">{day}</span>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">{cells.map(cell => {
            if (!cell.date || cell.dayNumber === null) return <span key={cell.key} aria-hidden="true" className="aspect-square" />;
            const item = byDate.get(cell.date); const available = (item?.availableSlotCount ?? 0) > 0; const selected = selectedDate === cell.date; const outside = cell.date < minimumDate || cell.date > maximumDate;
            const dateText = dateFormatter.format(parseDate(cell.date));
            const label = interpolateBookingCopy(available ? t.availableDateLabel : t.unavailableDateLabel, { date: dateText, count: String(item?.availableSlotCount ?? 0) });
            return <button key={cell.key} type="button" aria-label={label} aria-pressed={selected} disabled={disabled || isLoading || outside || !available} onClick={() => { onDateChange(cell.date!); onTimeChange("", 30); }} className={["aspect-square rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#036661] focus:ring-offset-2", selected ? "bg-[#036661] text-white" : available ? "bg-green-100 text-green-900 hover:bg-green-200" : "cursor-not-allowed bg-gray-100 text-gray-400"].join(" ")}>{cell.dayNumber}</button>;
          })}</div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600"><span>{t.available}</span><span>{t.selected}</span><span>{t.unavailable}</span></div>
        </div>
        <div aria-live="polite" className="mt-4">
          {isLoading && <div className="rounded-xl border border-gray-200 bg-white px-4 py-5 text-sm text-gray-600">{t.loading}</div>}
          {!isLoading && loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800"><p>{loadError}</p><button type="button" disabled={disabled} onClick={() => setReloadKey(value => value + 1)} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 font-semibold">{t.retry}</button></div>}
          {!isLoading && !loadError && hasLoaded && !hasAny && <div className="rounded-xl border border-gray-200 bg-white px-4 py-5 text-sm text-gray-600"><p className="font-medium text-gray-900">{t.noSlotsTitle}</p><p className="mt-2 leading-6">{t.noSlotsDescription}</p></div>}
          {!isLoading && !loadError && selectedDate && selectedAvailability && <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="font-semibold text-gray-900">{interpolateBookingCopy(t.availableTimes, { date: dateFormatter.format(parseDate(selectedDate)) })}</p><div className="mt-3 flex flex-wrap gap-2">{selectedAvailability.slots.map(slot => <button key={`${selectedDate}-${slot.time}`} type="button" aria-pressed={selectedTime === slot.time} disabled={disabled} onClick={() => onTimeChange(slot.time, slot.durationMinutes)} className={["rounded-xl border px-4 py-2.5 text-sm font-semibold", selectedTime === slot.time ? "border-[#036661] bg-[#036661] text-white" : "border-gray-300 bg-white text-gray-800"].join(" ")}>{slot.time}</button>)}</div></div>}
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-600"><p className="font-medium text-gray-900">{t.noSuitableTimeTitle}</p><p className="mt-1 leading-6">{t.noSuitableTimeDescription}</p></div>
      </>}
    </section>
  );
}
