"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
} from "react";

import {
  getContractAcceptanceCheckboxText,
} from "@/lib/contracts/contract-acceptance-copy";
import type {
  ContractAssignmentView,
  ContractDashboardView,
  ContractDocumentView,
} from "@/lib/contracts/contract-dashboard-data";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type TabKey =
  | "overview"
  | "documents"
  | "history";

type Notice = {
  tone: "success" | "warning" | "error";
  text: string;
  actionHref?: string | null;
};

type Copy = {
  pageTitle: string;
  pageDescription: string;
  overview: string;
  documents: string;
  history: string;
  noAssignmentTitle: string;
  noAssignmentDescription: string;
  subject: string;
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
  eventTypes: Record<string, string>;
  acceptanceRequired: string;
  noticeOnly: string;
  packageHistory: string;
  noHistory: string;
  downloadUnavailable: string;
  pdfPreparing: string;
  pdfReady: string;
  pdfFailed: string;
  downloadPdf: string;
  downloadingPdf: string;
  acceptanceTitle: string;
  acceptanceDescription: string;
  acceptContract: string;
  acceptingContract: string;
  confirmCheckbox: string;
  acceptanceSuccess: string;
  acceptanceWithWarnings: string;
  acceptanceFailed: string;
  billingMissing: string;
  updateBilling: string;
  notAuthorized: string;
  acceptedPackageNotice: string;
};

const COPY: Record<
  "ro" | "en" | "de",
  Copy
> = {
  ro: {
    pageTitle: "Contract și documente",
    pageDescription:
      "Consultați pachetul contractual aplicabil, anexele, acceptarea electronică și istoricul versiunilor. Documentele publicate și acceptate rămân imuabile.",
    overview: "Prezentare",
    documents: "Documente",
    history: "Istoric",
    noAssignmentTitle:
      "Nu există încă un contract atribuit",
    noAssignmentDescription:
      "Contractul și anexele vor apărea aici după publicare și atribuire de către RomDoc.",
    subject: "Parte contractantă",
    version: "Versiune",
    acceptedAt: "Acceptat la",
    pendingDocuments:
      "Documente care necesită acceptare",
    paymentDeadline: "Termen de plată",
    days: "zile calendaristice",
    currentPackage: "Pachet curent",
    assignedAt: "Atribuit la",
    effectiveAt: "Intră în vigoare",
    representative: "Reprezentant",
    contractualTerms:
      "Condiții comerciale contractuale",
    termsEmpty:
      "Nu sunt definite condiții comerciale individuale în acest pachet.",
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
      clinic_contract:
        "Contract Organizație de clinică",
      pricing_annex: "Anexă tarife",
      consolidated_billing_annex:
        "Anexă facturare consolidată",
      data_processing_annex:
        "Acord privind prelucrarea datelor",
      security_annex:
        "Măsuri tehnice și organizatorice",
      operational_annex: "Anexă operațională",
      individual_amendment:
        "Act adițional individual",
      other_annex: "Altă anexă",
    },
    eventTypes: {
      assigned: "Pachet atribuit",
      notified: "Notificare transmisă",
      viewed: "Pachet consultat",
      downloaded: "PDF descărcat",
      acceptance_started: "Acceptare începută",
      accepted: "Contract acceptat",
      became_effective: "Contract intrat în vigoare",
      superseded: "Pachet înlocuit",
      cancelled: "Atribuire anulată",
      terminated: "Contract încetat",
      pdf_generation_started: "Generare PDF începută",
      pdf_generated: "PDF generat",
      pdf_generation_failed: "Generare PDF eșuată",
      confirmation_email_sent:
        "E-mail de confirmare transmis",
      confirmation_email_failed:
        "E-mail de confirmare eșuat",
      price_update_pending:
        "Actualizare manuală tarif în așteptare",
      price_applied:
        "Tarif operațional aplicat manual",
    },
    acceptanceRequired: "Necesită acceptare",
    noticeOnly: "Informare",
    packageHistory: "Istoricul pachetului",
    noHistory:
      "Nu există încă evenimente în istoric.",
    downloadUnavailable:
      "PDF-ul va deveni disponibil după acceptare.",
    pdfPreparing:
      "PDF-ul acceptat este în curs de pregătire.",
    pdfReady:
      "Pachetul contractual acceptat este disponibil pentru descărcare.",
    pdfFailed:
      "Contractul a fost acceptat, dar PDF-ul nu a putut fi pregătit. Reîncercarea se poate face prin repetarea acțiunii de acceptare sau prin suport.",
    downloadPdf: "Descarcă PDF-ul acceptat",
    downloadingPdf: "Se pregătește descărcarea...",
    acceptanceTitle: "Acceptare electronică",
    acceptanceDescription:
      "Citiți toate documentele înainte de acceptare. RomDoc va înregistra versiunea exactă, declarația, data, identitatea contului și dovada electronică.",
    acceptContract: "Acceptă contractul",
    acceptingContract: "Se înregistrează...",
    confirmCheckbox:
      "Bifați declarația pentru a continua.",
    acceptanceSuccess:
      "Acceptarea a fost înregistrată. PDF-ul și confirmarea prin e-mail au fost pregătite.",
    acceptanceWithWarnings:
      "Acceptarea a fost înregistrată, dar PDF-ul sau e-mailul necesită o reîncercare. Contractul rămâne valabil și apare în istoric.",
    acceptanceFailed:
      "Acceptarea nu a putut fi înregistrată.",
    billingMissing:
      "Datele juridice sau de facturare sunt incomplete. Completați-le înainte de acceptare.",
    updateBilling: "Completează datele de facturare",
    notAuthorized:
      "Contul dumneavoastră poate consulta documentele, dar nu are permisiunea de a angaja contractual Organizația.",
    acceptedPackageNotice:
      "Acest pachet a fost acceptat electronic și nu mai poate fi modificat.",
  },
  en: {
    pageTitle: "Contract and documents",
    pageDescription:
      "Review the applicable contract package, annexes, electronic acceptance and version history. Published and accepted documents remain immutable.",
    overview: "Overview",
    documents: "Documents",
    history: "History",
    noAssignmentTitle:
      "No contract has been assigned yet",
    noAssignmentDescription:
      "The contract and annexes will appear here after RomDoc publishes and assigns them.",
    subject: "Contracting party",
    version: "Version",
    acceptedAt: "Accepted on",
    pendingDocuments:
      "Documents requiring acceptance",
    paymentDeadline: "Payment deadline",
    days: "calendar days",
    currentPackage: "Current package",
    assignedAt: "Assigned on",
    effectiveAt: "Effective on",
    representative: "Representative",
    contractualTerms:
      "Contractual commercial terms",
    termsEmpty:
      "No individual commercial terms are defined in this package.",
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
      clinic_contract:
        "Clinic Organisation contract",
      pricing_annex: "Pricing annex",
      consolidated_billing_annex:
        "Consolidated billing annex",
      data_processing_annex:
        "Data Processing Agreement",
      security_annex:
        "Technical and organisational measures",
      operational_annex: "Operational annex",
      individual_amendment:
        "Individual amendment",
      other_annex: "Other annex",
    },
    eventTypes: {
      assigned: "Package assigned",
      notified: "Notification sent",
      viewed: "Package viewed",
      downloaded: "PDF downloaded",
      acceptance_started: "Acceptance started",
      accepted: "Contract accepted",
      became_effective: "Contract became effective",
      superseded: "Package superseded",
      cancelled: "Assignment cancelled",
      terminated: "Contract terminated",
      pdf_generation_started: "PDF generation started",
      pdf_generated: "PDF generated",
      pdf_generation_failed: "PDF generation failed",
      confirmation_email_sent:
        "Confirmation email sent",
      confirmation_email_failed:
        "Confirmation email failed",
      price_update_pending:
        "Manual price update pending",
      price_applied:
        "Operational price applied manually",
    },
    acceptanceRequired: "Acceptance required",
    noticeOnly: "Notice",
    packageHistory: "Package history",
    noHistory:
      "There are no history events yet.",
    downloadUnavailable:
      "The PDF will become available after acceptance.",
    pdfPreparing:
      "The accepted PDF is being prepared.",
    pdfReady:
      "The accepted contract package is available for download.",
    pdfFailed:
      "The contract was accepted, but the PDF could not be prepared. Retry the acceptance action or contact support.",
    downloadPdf: "Download accepted PDF",
    downloadingPdf: "Preparing download...",
    acceptanceTitle: "Electronic acceptance",
    acceptanceDescription:
      "Read every document before accepting. RomDoc will record the exact version, declaration, date, account identity and electronic evidence.",
    acceptContract: "Accept contract",
    acceptingContract: "Recording acceptance...",
    confirmCheckbox:
      "Select the declaration to continue.",
    acceptanceSuccess:
      "The acceptance was recorded. The PDF and confirmation email were prepared.",
    acceptanceWithWarnings:
      "The acceptance was recorded, but the PDF or email requires another attempt. The contract remains valid and appears in history.",
    acceptanceFailed:
      "The acceptance could not be recorded.",
    billingMissing:
      "The legal or billing details are incomplete. Complete them before accepting.",
    updateBilling: "Complete billing details",
    notAuthorized:
      "Your account may review the documents but is not authorised to bind the Organisation.",
    acceptedPackageNotice:
      "This package was accepted electronically and can no longer be changed.",
  },
  de: {
    pageTitle: "Vertrag und Dokumente",
    pageDescription:
      "Prüfen Sie das geltende Vertragspaket, die Anlagen, die elektronische Annahme und den Versionsverlauf. Veröffentlichte und angenommene Dokumente bleiben unveränderlich.",
    overview: "Übersicht",
    documents: "Dokumente",
    history: "Verlauf",
    noAssignmentTitle:
      "Noch kein Vertrag zugewiesen",
    noAssignmentDescription:
      "Vertrag und Anlagen erscheinen hier nach Veröffentlichung und Zuweisung durch RomDoc.",
    subject: "Vertragspartei",
    version: "Version",
    acceptedAt: "Angenommen am",
    pendingDocuments:
      "Zustimmungspflichtige Dokumente",
    paymentDeadline: "Zahlungsfrist",
    days: "Kalendertage",
    currentPackage: "Aktuelles Paket",
    assignedAt: "Zugewiesen am",
    effectiveAt: "Wirksam ab",
    representative: "Vertretung",
    contractualTerms:
      "Vertragliche Geschäftsbedingungen",
    termsEmpty:
      "Für dieses Paket sind keine individuellen Geschäftsbedingungen definiert.",
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
      doctor_contract:
        "Ärzte-Dienstleistungsvertrag",
      clinic_contract:
        "Vertrag der Klinikorganisation",
      pricing_annex: "Preisanlage",
      consolidated_billing_annex:
        "Anlage zur Sammelabrechnung",
      data_processing_annex:
        "Auftragsverarbeitungsvereinbarung",
      security_annex:
        "Technische und organisatorische Maßnahmen",
      operational_annex: "Betriebliche Anlage",
      individual_amendment:
        "Individueller Nachtrag",
      other_annex: "Weitere Anlage",
    },
    eventTypes: {
      assigned: "Paket zugewiesen",
      notified: "Benachrichtigung gesendet",
      viewed: "Paket angesehen",
      downloaded: "PDF heruntergeladen",
      acceptance_started: "Annahme begonnen",
      accepted: "Vertrag angenommen",
      became_effective: "Vertrag wirksam geworden",
      superseded: "Paket ersetzt",
      cancelled: "Zuweisung storniert",
      terminated: "Vertrag beendet",
      pdf_generation_started:
        "PDF-Erzeugung begonnen",
      pdf_generated: "PDF erzeugt",
      pdf_generation_failed:
        "PDF-Erzeugung fehlgeschlagen",
      confirmation_email_sent:
        "Bestätigungs-E-Mail gesendet",
      confirmation_email_failed:
        "Bestätigungs-E-Mail fehlgeschlagen",
      price_update_pending:
        "Manuelle Preisaktualisierung ausstehend",
      price_applied:
        "Betriebspreis manuell angewendet",
    },
    acceptanceRequired: "Zustimmung erforderlich",
    noticeOnly: "Mitteilung",
    packageHistory: "Paketverlauf",
    noHistory:
      "Noch keine Verlaufsereignisse vorhanden.",
    downloadUnavailable:
      "Das PDF wird nach der Annahme verfügbar.",
    pdfPreparing:
      "Das angenommene PDF wird vorbereitet.",
    pdfReady:
      "Das angenommene Vertragspaket steht zum Download bereit.",
    pdfFailed:
      "Der Vertrag wurde angenommen, aber das PDF konnte nicht erstellt werden. Wiederholen Sie die Annahmeaktion oder wenden Sie sich an den Support.",
    downloadPdf: "Angenommenes PDF herunterladen",
    downloadingPdf: "Download wird vorbereitet...",
    acceptanceTitle: "Elektronische Annahme",
    acceptanceDescription:
      "Lesen Sie vor der Annahme alle Dokumente. RomDoc erfasst die genaue Version, Erklärung, Zeit, Kontoidentität und den elektronischen Nachweis.",
    acceptContract: "Vertrag annehmen",
    acceptingContract: "Annahme wird erfasst...",
    confirmCheckbox:
      "Wählen Sie die Erklärung aus, um fortzufahren.",
    acceptanceSuccess:
      "Die Annahme wurde erfasst. PDF und Bestätigungs-E-Mail wurden vorbereitet.",
    acceptanceWithWarnings:
      "Die Annahme wurde erfasst, aber PDF oder E-Mail erfordern einen weiteren Versuch. Der Vertrag bleibt gültig und erscheint im Verlauf.",
    acceptanceFailed:
      "Die Annahme konnte nicht erfasst werden.",
    billingMissing:
      "Die Rechts- oder Rechnungsdaten sind unvollständig. Vervollständigen Sie sie vor der Annahme.",
    updateBilling: "Rechnungsdaten vervollständigen",
    notAuthorized:
      "Ihr Konto darf die Dokumente ansehen, ist aber nicht berechtigt, die Organisation vertraglich zu verpflichten.",
    acceptedPackageNotice:
      "Dieses Paket wurde elektronisch angenommen und kann nicht mehr geändert werden.",
  },
};

function formatDate(
  value: string | null,
  locale: "ro" | "en" | "de"
) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    locale === "ro"
      ? "ro-RO"
      : locale === "de"
        ? "de-DE"
        : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }
  ).format(new Date(value));
}

function statusClass(status: string) {
  if (
    status === "effective" ||
    status === "accepted"
  ) {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (
    status === "awaiting_acceptance" ||
    status === "notified"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    status === "terminated" ||
    status === "cancelled"
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function noticeClass(tone: Notice["tone"]) {
  if (tone === "success") {
    return "border-green-200 bg-green-50 text-green-900";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-red-200 bg-red-50 text-red-900";
}

function commercialTermEntries(
  terms: Record<string, unknown>
) {
  return Object.entries(terms).filter(
    ([, value]) =>
      ["string", "number", "boolean"].includes(
        typeof value
      )
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
            <h3 className="truncate font-semibold text-gray-900">
              {document.title}
            </h3>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
              v{document.version}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {copy.documentTypes[
              document.documentType
            ] ?? document.documentType}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden rounded-full bg-[#036661]/10 px-2.5 py-1 text-xs font-semibold text-[#036661] sm:inline-flex">
            {document.requiresAcceptance
              ? copy.acceptanceRequired
              : copy.noticeOnly}
          </span>
          <span
            aria-hidden="true"
            className="text-xl text-gray-500 transition group-open:rotate-180"
          >
            ⌄
          </span>
        </div>
      </summary>

      <div className="border-t border-gray-200 px-5 py-5">
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-500">
          <span>
            {copy.version}: {document.version}
          </span>
          <span>•</span>
          <span>
            {copy.effectiveAt}:{" "}
            {formatDate(
              document.effectiveAt,
              locale
            )}
          </span>
        </div>

        <article
          className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-[#036661]"
          dangerouslySetInnerHTML={{
            __html: document.contentHtml,
          }}
        />
      </div>
    </details>
  );
}

function AcceptancePanel({
  current,
  copy,
  checked,
  isAccepting,
  onCheckedChange,
  onAccept,
}: {
  current: ContractAssignmentView;
  copy: Copy;
  checked: boolean;
  isAccepting: boolean;
  onCheckedChange: (checked: boolean) => void;
  onAccept: () => void;
}) {
  if (current.acceptedAt) {
    return (
      <section className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-green-950">
          {copy.acceptanceTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-green-900">
          {copy.acceptedPackageNotice}
        </p>
      </section>
    );
  }

  if (
    current.acceptanceBlockReason ===
    "billing_details_missing"
  ) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-amber-950">
          {copy.acceptanceTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {copy.billingMissing}
        </p>
        <Link
          href={current.billingSettingsHref}
          className="romdoc-focus-ring mt-4 inline-flex rounded-xl bg-[#036661] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff2800]"
        >
          {copy.updateBilling}
        </Link>
      </section>
    );
  }

  if (
    current.acceptanceBlockReason ===
    "not_authorized"
  ) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-gray-900">
          {copy.acceptanceTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {copy.notAuthorized}
        </p>
      </section>
    );
  }

  if (!current.canAccept) return null;

  const checkboxText =
    getContractAcceptanceCheckboxText(
      current.packageLocale,
      current.clientType
    );

  return (
    <section className="rounded-3xl border border-[#036661]/30 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-gray-900">
        {copy.acceptanceTitle}
      </h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        {copy.acceptanceDescription}
      </p>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <input
          type="checkbox"
          checked={checked}
          disabled={isAccepting}
          onChange={(event) =>
            onCheckedChange(event.target.checked)
          }
          className="mt-1 h-5 w-5 rounded border-gray-300 accent-[#036661]"
        />
        <span className="text-sm leading-6 text-gray-800">
          {checkboxText}
        </span>
      </label>

      <button
        type="button"
        disabled={!checked || isAccepting}
        onClick={onAccept}
        className="romdoc-focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAccepting
          ? copy.acceptingContract
          : copy.acceptContract}
      </button>

      {!checked && (
        <p className="mt-3 text-xs text-gray-500">
          {copy.confirmCheckbox}
        </p>
      )}
    </section>
  );
}

export default function ContractDashboard({
  data,
}: {
  data: ContractDashboardView;
}) {
  const locale = normalizeAppLocale(useLocale());
  const copy = COPY[locale];
  const router = useRouter();
  const [activeTab, setActiveTab] =
    useState<TabKey>("overview");
  const [checkedAssignmentId, setCheckedAssignmentId] =
    useState("");
  const [acceptingAssignmentId, setAcceptingAssignmentId] =
    useState("");
  const [downloadingAcceptanceId, setDownloadingAcceptanceId] =
    useState("");
  const [notice, setNotice] =
    useState<Notice | null>(null);

  const subjects = useMemo(() => {
    const seen = new Map<string, string>();

    data.assignments.forEach((assignment) =>
      seen.set(
        assignment.subjectId,
        assignment.subjectName
      )
    );

    return Array.from(seen.entries()).map(
      ([id, name]) => ({ id, name })
    );
  }, [data.assignments]);

  const [selectedSubjectId, setSelectedSubjectId] =
    useState(subjects[0]?.id ?? "");

  const assignments = data.assignments.filter(
    (assignment) =>
      !selectedSubjectId ||
      assignment.subjectId === selectedSubjectId
  );

  const current =
    assignments.find((assignment) =>
      [
        "effective",
        "accepted",
        "awaiting_acceptance",
        "notified",
        "assigned",
      ].includes(assignment.status)
    ) ??
    assignments[0] ??
    null;

  const pendingCount = current?.acceptedAt
    ? 0
    : current?.documents.filter(
        (document) =>
          document.requiresAcceptance
      ).length ?? 0;

  const termEntries = current
    ? commercialTermEntries(
        current.commercialTerms
      )
    : [];

  async function handleAccept() {
    if (!current || !current.canAccept) return;

    if (checkedAssignmentId !== current.id) {
      setNotice({
        tone: "warning",
        text: copy.confirmCheckbox,
      });
      return;
    }

    setAcceptingAssignmentId(current.id);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/contracts/accept",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignmentId: current.id,
            accepted: true,
          }),
        }
      );

      const result = (await response.json()) as {
        error?: string;
        redirectTo?: string | null;
        warnings?: string[];
      };

      if (!response.ok) {
        setNotice({
          tone: "error",
          text:
            result.error ??
            copy.acceptanceFailed,
          actionHref:
            result.redirectTo ?? null,
        });
        return;
      }

      const hasWarnings =
        Array.isArray(result.warnings) &&
        result.warnings.length > 0;

      setNotice({
        tone: hasWarnings
          ? "warning"
          : "success",
        text: hasWarnings
          ? copy.acceptanceWithWarnings
          : copy.acceptanceSuccess,
      });
      setCheckedAssignmentId("");
      router.refresh();
    } catch {
      setNotice({
        tone: "error",
        text: copy.acceptanceFailed,
      });
    } finally {
      setAcceptingAssignmentId("");
    }
  }

  async function handleDownload() {
    if (!current?.acceptanceId) return;

    setDownloadingAcceptanceId(
      current.acceptanceId
    );
    setNotice(null);

    try {
      const response = await fetch(
        "/api/contracts/download",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            acceptanceId: current.acceptanceId,
          }),
        }
      );

      const result = (await response.json()) as {
        error?: string;
        signedUrl?: string;
      };

      if (!response.ok || !result.signedUrl) {
        setNotice({
          tone: "error",
          text:
            result.error ?? copy.pdfFailed,
        });
        return;
      }

      window.location.assign(result.signedUrl);
    } catch {
      setNotice({
        tone: "error",
        text: copy.pdfFailed,
      });
    } finally {
      setDownloadingAcceptanceId("");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          RomDoc
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          {copy.pageTitle}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pageDescription}
        </p>
      </header>

      {subjects.length > 1 && (
        <div className="max-w-md">
          <label
            className="text-sm font-semibold text-gray-800"
            htmlFor="contract-subject"
          >
            {copy.subject}
          </label>
          <select
            id="contract-subject"
            value={selectedSubjectId}
            onChange={(event) => {
              setSelectedSubjectId(
                event.target.value
              );
              setNotice(null);
              setCheckedAssignmentId("");
            }}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900"
          >
            {subjects.map((subject) => (
              <option
                key={subject.id}
                value={subject.id}
              >
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        role="tablist"
        aria-label={copy.pageTitle}
        className="grid max-w-xl grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm"
      >
        {(
          [
            "overview",
            "documents",
            "history",
          ] as TabKey[]
        ).map((tab) => (
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

      {notice && (
        <div
          role="status"
          className={`rounded-2xl border p-4 text-sm leading-6 ${noticeClass(
            notice.tone
          )}`}
        >
          <p>{notice.text}</p>
          {notice.actionHref && (
            <Link
              href={notice.actionHref}
              className="romdoc-focus-ring mt-3 inline-flex rounded-lg bg-[#036661] px-3 py-2 font-semibold text-white"
            >
              {copy.updateBilling}
            </Link>
          )}
        </div>
      )}

      {!current ? (
        <section className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#036661]/10 text-xl text-[#036661]">
            §
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {copy.noAssignmentTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
            {copy.noAssignmentDescription}
          </p>
        </section>
      ) : activeTab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.618fr)_minmax(18rem,1fr)]">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  {copy.currentPackage}
                </p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">
                  {current.packageTitle}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {current.subjectName}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                  current.status
                )}`}
              >
                {copy.status[current.status] ??
                  current.status}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.version}
                </dt>
                <dd className="mt-1 font-semibold text-gray-900">
                  {current.packageVersion}
                </dd>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.paymentDeadline}
                </dt>
                <dd className="mt-1 font-semibold text-gray-900">
                  {current.paymentDeadlineDays}{" "}
                  {copy.days}
                </dd>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.assignedAt}
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatDate(
                    current.assignedAt,
                    locale
                  )}
                </dd>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {copy.acceptedAt}
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatDate(
                    current.acceptedAt,
                    locale
                  )}
                </dd>
              </div>
            </dl>

            {current.acceptedByName && (
              <div className="mt-4 rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
                <span className="font-semibold text-gray-900">
                  {copy.representative}:{" "}
                </span>
                {current.acceptedByName}
                {current.representativeCapacity
                  ? ` · ${current.representativeCapacity}`
                  : ""}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">
                {copy.pendingDocuments}
              </p>
              <p className="mt-2 text-3xl font-bold text-[#036661]">
                {pendingCount}
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">
                PDF
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {current.pdfStatus === "pending"
                  ? copy.pdfPreparing
                  : current.pdfStatus === "ready"
                    ? copy.pdfReady
                    : current.pdfStatus === "failed"
                      ? copy.pdfFailed
                      : copy.downloadUnavailable}
              </p>

              {current.pdfStatus === "ready" &&
                current.acceptanceId && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={
                      downloadingAcceptanceId ===
                      current.acceptanceId
                    }
                    className="romdoc-focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#036661] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadingAcceptanceId ===
                    current.acceptanceId
                      ? copy.downloadingPdf
                      : copy.downloadPdf}
                  </button>
                )}
            </div>
          </aside>

          <div className="xl:col-span-2">
            <AcceptancePanel
              current={current}
              copy={copy}
              checked={
                checkedAssignmentId === current.id
              }
              isAccepting={
                acceptingAssignmentId === current.id
              }
              onCheckedChange={(checked) =>
                setCheckedAssignmentId(
                  checked ? current.id : ""
                )
              }
              onAccept={() => void handleAccept()}
            />
          </div>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
            <h2 className="text-lg font-bold text-gray-900">
              {copy.contractualTerms}
            </h2>

            {termEntries.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">
                {copy.termsEmpty}
              </p>
            ) : (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {termEntries.map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="rounded-2xl bg-gray-50 p-4"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {key.replaceAll("_", " ")}
                      </dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-gray-900">
                        {String(value)}
                      </dd>
                    </div>
                  )
                )}
              </dl>
            )}
          </section>
        </div>
      ) : activeTab === "documents" ? (
        <section className="space-y-3">
          {current.documents.map((document) => (
            <DocumentAccordion
              key={document.id}
              document={document}
              copy={copy}
              locale={locale}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">
            {copy.packageHistory}
          </h2>

          {current.events.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">
              {copy.noHistory}
            </p>
          ) : (
            <ol className="mt-5 space-y-4">
              {current.events.map((event) => (
                <li
                  key={event.id}
                  className="flex gap-4"
                >
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#036661]" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {copy.eventTypes[
                        event.eventType
                      ] ??
                        event.eventType.replaceAll(
                          "_",
                          " "
                        )}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(
                        event.createdAt,
                        locale
                      )}
                    </p>
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
