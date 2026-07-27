"use client";

import { useLocale } from "next-intl";
import { useMemo, useState } from "react";

import type {
  ContractAssignmentView,
  ContractDashboardView,
  ContractDocumentView,
} from "@/lib/contracts/contract-dashboard-data";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";

type TabKey = "overview" | "documents" | "history";

type Copy = {
  pageTitle: string;
  pageDescription: string;
  overview: string;
  documents: string;
  history: string;
  noAssignmentTitle: string;
  noAssignmentDescription: string;
  subject: string;
  contractStatus: string;
  version: string;
  acceptedAt: string;
  pendingDocuments: string;
  paymentDeadline: string;
  days: string;
  currentPackage: string;
  assignedAt: string;
  effectiveAt: string;
  representative: string;
  contractualTerms: string;
  termsEmpty: string;
  status: Record<string, string>;
  documentTypes: Record<string, string>;
  acceptanceRequired: string;
  noticeOnly: string;
  viewDocument: string;
  packageHistory: string;
  noHistory: string;
  downloadUnavailable: string;
  pdfPreparing: string;
  pdfReadyLater: string;
};

const COPY: Record<"ro" | "en" | "de", Copy> = {
  ro: {
    pageTitle: "Contract și documente",
    pageDescription:
      "Consultați pachetul contractual aplicabil, anexele și istoricul versiunilor. Documentele publicate rămân imuabile.",
    overview: "Prezentare",
    documents: "Documente",
    history: "Istoric",
    noAssignmentTitle: "Nu există încă un contract atribuit",
    noAssignmentDescription:
      "Pagina este pregătită. Contractul și anexele vor apărea aici după publicare și atribuire de către RomDoc.",
    subject: "Parte contractantă",
    contractStatus: "Stare contract",
    version: "Versiune",
    acceptedAt: "Acceptat la",
    pendingDocuments: "Documente care necesită acceptare",
    paymentDeadline: "Termen de plată",
    days: "zile calendaristice",
    currentPackage: "Pachet curent",
    assignedAt: "Atribuit la",
    effectiveAt: "Intră în vigoare",
    representative: "Reprezentant",
    contractualTerms: "Condiții comerciale contractuale",
    termsEmpty: "Nu sunt definite condiții comerciale individuale în acest pachet.",
    status: {
      assigned: "Atribuit",
      notified: "Notificat",
      awaiting_acceptance: "Așteaptă acceptarea",
      accepted: "Acceptat",
      effective: "În vigoare",
      superseded: "Înlocuit",
      cancelled: "Anulat",
      terminated: "Încetat",
    },
    documentTypes: {
      doctor_contract: "Contract servicii Doctor",
      clinic_contract: "Contract Organizație de clinică",
      pricing_annex: "Anexă tarife",
      consolidated_billing_annex: "Anexă facturare consolidată",
      data_processing_annex: "Acord privind prelucrarea datelor",
      security_annex: "Măsuri tehnice și organizatorice",
      operational_annex: "Anexă operațională",
      individual_amendment: "Act adițional individual",
      other_annex: "Altă anexă",
    },
    acceptanceRequired: "Necesită acceptare",
    noticeOnly: "Informare",
    viewDocument: "Deschide documentul",
    packageHistory: "Istoricul pachetului",
    noHistory: "Nu există încă evenimente în istoric.",
    downloadUnavailable: "Descărcarea PDF va fi activată după acceptare.",
    pdfPreparing: "PDF-ul acceptat este în curs de pregătire.",
    pdfReadyLater: "PDF acceptat disponibil în etapa următoare.",
  },
  en: {
    pageTitle: "Contract and documents",
    pageDescription:
      "Review the applicable contract package, annexes and version history. Published documents remain immutable.",
    overview: "Overview",
    documents: "Documents",
    history: "History",
    noAssignmentTitle: "No contract has been assigned yet",
    noAssignmentDescription:
      "The page is ready. The contract and annexes will appear here after RomDoc publishes and assigns them.",
    subject: "Contracting party",
    contractStatus: "Contract status",
    version: "Version",
    acceptedAt: "Accepted on",
    pendingDocuments: "Documents requiring acceptance",
    paymentDeadline: "Payment deadline",
    days: "calendar days",
    currentPackage: "Current package",
    assignedAt: "Assigned on",
    effectiveAt: "Effective on",
    representative: "Representative",
    contractualTerms: "Contractual commercial terms",
    termsEmpty: "No individual commercial terms are defined in this package.",
    status: {
      assigned: "Assigned",
      notified: "Notified",
      awaiting_acceptance: "Awaiting acceptance",
      accepted: "Accepted",
      effective: "Effective",
      superseded: "Superseded",
      cancelled: "Cancelled",
      terminated: "Terminated",
    },
    documentTypes: {
      doctor_contract: "Doctor services contract",
      clinic_contract: "Clinic Organisation contract",
      pricing_annex: "Pricing annex",
      consolidated_billing_annex: "Consolidated billing annex",
      data_processing_annex: "Data Processing Agreement",
      security_annex: "Technical and organisational measures",
      operational_annex: "Operational annex",
      individual_amendment: "Individual amendment",
      other_annex: "Other annex",
    },
    acceptanceRequired: "Acceptance required",
    noticeOnly: "Notice",
    viewDocument: "Open document",
    packageHistory: "Package history",
    noHistory: "There are no history events yet.",
    downloadUnavailable: "PDF download will be enabled after acceptance.",
    pdfPreparing: "The accepted PDF is being prepared.",
    pdfReadyLater: "Accepted PDF available in the next phase.",
  },
  de: {
    pageTitle: "Vertrag und Dokumente",
    pageDescription:
      "Prüfen Sie das geltende Vertragspaket, die Anlagen und den Versionsverlauf. Veröffentlichte Dokumente bleiben unveränderlich.",
    overview: "Übersicht",
    documents: "Dokumente",
    history: "Verlauf",
    noAssignmentTitle: "Noch kein Vertrag zugewiesen",
    noAssignmentDescription:
      "Die Seite ist vorbereitet. Vertrag und Anlagen erscheinen hier nach Veröffentlichung und Zuweisung durch RomDoc.",
    subject: "Vertragspartei",
    contractStatus: "Vertragsstatus",
    version: "Version",
    acceptedAt: "Angenommen am",
    pendingDocuments: "Zustimmungspflichtige Dokumente",
    paymentDeadline: "Zahlungsfrist",
    days: "Kalendertage",
    currentPackage: "Aktuelles Paket",
    assignedAt: "Zugewiesen am",
    effectiveAt: "Wirksam ab",
    representative: "Vertretung",
    contractualTerms: "Vertragliche Geschäftsbedingungen",
    termsEmpty: "Für dieses Paket sind keine individuellen Geschäftsbedingungen definiert.",
    status: {
      assigned: "Zugewiesen",
      notified: "Benachrichtigt",
      awaiting_acceptance: "Zustimmung ausstehend",
      accepted: "Angenommen",
      effective: "Wirksam",
      superseded: "Ersetzt",
      cancelled: "Storniert",
      terminated: "Beendet",
    },
    documentTypes: {
      doctor_contract: "Ärzte-Dienstleistungsvertrag",
      clinic_contract: "Vertrag der Klinikorganisation",
      pricing_annex: "Preisanlage",
      consolidated_billing_annex: "Anlage zur Sammelabrechnung",
      data_processing_annex: "Auftragsverarbeitungsvereinbarung",
      security_annex: "Technische und organisatorische Maßnahmen",
      operational_annex: "Betriebliche Anlage",
      individual_amendment: "Individueller Nachtrag",
      other_annex: "Weitere Anlage",
    },
    acceptanceRequired: "Zustimmung erforderlich",
    noticeOnly: "Mitteilung",
    viewDocument: "Dokument öffnen",
    packageHistory: "Paketverlauf",
    noHistory: "Noch keine Verlaufsereignisse vorhanden.",
    downloadUnavailable: "Der PDF-Download wird nach Annahme aktiviert.",
    pdfPreparing: "Das angenommene PDF wird vorbereitet.",
    pdfReadyLater: "Angenommenes PDF in der nächsten Phase verfügbar.",
  },
};

function formatDate(value: string | null, locale: "ro" | "en" | "de") {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" }
  ).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "effective" || status === "accepted") {
    return "border-green-200 bg-green-50 text-green-800";
  }
  if (status === "awaiting_acceptance" || status === "notified") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (status === "terminated" || status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function commercialTermEntries(terms: Record<string, unknown>) {
  return Object.entries(terms).filter(([, value]) =>
    ["string", "number", "boolean"].includes(typeof value)
  );
}

function DocumentAccordion({
  document,
  copy,
  locale,
}: {
  document: ContractDocumentView;
  copy: Copy;
  locale: "ro" | "en" | "de";
}) {
  return (
    <details className="group rounded-2xl border border-gray-200 bg-white shadow-sm">
      <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900">{document.title}</h3>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
              v{document.version}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {copy.documentTypes[document.documentType] ?? document.documentType}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden rounded-full bg-[#036661]/10 px-2.5 py-1 text-xs font-semibold text-[#036661] sm:inline-flex">
            {document.requiresAcceptance ? copy.acceptanceRequired : copy.noticeOnly}
          </span>
          <span aria-hidden="true" className="text-xl text-gray-500 transition group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="border-t border-gray-200 px-5 py-5">
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-500">
          <span>{copy.version}: {document.version}</span>
          <span>•</span>
          <span>{copy.effectiveAt}: {formatDate(document.effectiveAt, locale)}</span>
        </div>
        <article
          className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-[#036661]"
          dangerouslySetInnerHTML={{ __html: document.contentHtml }}
        />
      </div>
    </details>
  );
}

export default function ContractDashboard({ data }: { data: ContractDashboardView }) {
  const locale = normalizeAppLocale(useLocale());
  const copy = COPY[locale];
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const subjects = useMemo(() => {
    const seen = new Map<string, string>();
    data.assignments.forEach((assignment) => seen.set(assignment.subjectId, assignment.subjectName));
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [data.assignments]);

  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? "");

  const assignments = data.assignments.filter(
    (assignment) => !selectedSubjectId || assignment.subjectId === selectedSubjectId
  );
  const current = assignments.find((assignment) =>
    ["effective", "accepted", "awaiting_acceptance", "notified", "assigned"].includes(assignment.status)
  ) ?? assignments[0] ?? null;

  const pendingCount = current?.documents.filter((document) => document.requiresAcceptance).length ?? 0;
  const termEntries = current ? commercialTermEntries(current.commercialTerms) : [];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">RomDoc</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{copy.pageTitle}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{copy.pageDescription}</p>
      </header>

      {subjects.length > 1 && (
        <div className="max-w-md">
          <label className="text-sm font-semibold text-gray-800" htmlFor="contract-subject">
            {copy.subject}
          </label>
          <select
            id="contract-subject"
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>
      )}

      <div role="tablist" aria-label={copy.pageTitle} className="grid max-w-xl grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        {(["overview", "documents", "history"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`romdoc-focus-ring rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              activeTab === tab
                ? "bg-[#036661] text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {copy[tab]}
          </button>
        ))}
      </div>

      {!current ? (
        <section className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#036661]/10 text-xl text-[#036661]">§</div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">{copy.noAssignmentTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">{copy.noAssignmentDescription}</p>
        </section>
      ) : activeTab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.618fr)_minmax(18rem,1fr)]">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{copy.currentPackage}</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">{current.packageTitle}</h2>
                <p className="mt-1 text-sm text-gray-500">{current.subjectName}</p>
              </div>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(current.status)}`}>
                {copy.status[current.status] ?? current.status}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{copy.version}</dt>
                <dd className="mt-1 font-semibold text-gray-900">{current.packageVersion}</dd>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{copy.paymentDeadline}</dt>
                <dd className="mt-1 font-semibold text-gray-900">{current.paymentDeadlineDays} {copy.days}</dd>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{copy.assignedAt}</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(current.assignedAt, locale)}</dd>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{copy.acceptedAt}</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(current.acceptedAt, locale)}</dd>
              </div>
            </dl>

            {current.acceptedByName && (
              <div className="mt-4 rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{copy.representative}: </span>
                {current.acceptedByName}
                {current.representativeCapacity ? ` · ${current.representativeCapacity}` : ""}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">{copy.pendingDocuments}</p>
              <p className="mt-2 text-3xl font-bold text-[#036661]">{pendingCount}</p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">PDF</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {current.pdfStatus === "pending"
                  ? copy.pdfPreparing
                  : current.pdfStatus === "ready"
                    ? copy.pdfReadyLater
                    : copy.downloadUnavailable}
              </p>
            </div>
          </aside>

          <section className="xl:col-span-2 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">{copy.contractualTerms}</h2>
            {termEntries.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">{copy.termsEmpty}</p>
            ) : (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {termEntries.map(([key, value]) => (
                  <div key={key} className="rounded-2xl bg-gray-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{key.replaceAll("_", " ")}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-gray-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      ) : activeTab === "documents" ? (
        <section className="space-y-3">
          {current.documents.map((document) => (
            <DocumentAccordion key={document.id} document={document} copy={copy} locale={locale} />
          ))}
        </section>
      ) : (
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">{copy.packageHistory}</h2>
          {current.events.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">{copy.noHistory}</p>
          ) : (
            <ol className="mt-5 space-y-4">
              {current.events.map((event) => (
                <li key={event.id} className="flex gap-4">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#036661]" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{event.eventType.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(event.createdAt, locale)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
