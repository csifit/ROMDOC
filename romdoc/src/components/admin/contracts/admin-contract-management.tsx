"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import type {
  AdminContractClient,
  AdminContractDocument,
  AdminContractLocale,
  AdminContractManagementData,
  AdminContractPackage,
} from "@/lib/contracts/admin-contract-management-data";
import type { AppLocale } from "@/lib/i18n/app-locale";

type Props = {
  locale: AppLocale;
  data: AdminContractManagementData;
};

type Tab =
  | "clients"
  | "templates"
  | "amendments"
  | "acceptances"
  | "prices";

type Notice = {
  tone: "success" | "warning" | "error";
  text: string;
} | null;

type DocumentForm = {
  documentKey: string;
  documentType: string;
  audience: string;
  locale: AdminContractLocale;
  title: string;
  version: string;
  contentHtml: string;
  requiresAcceptance: boolean;
  unilateralNoticeAllowed: boolean;
  issueDate: string;
  effectiveAt: string;
};

type PackageForm = {
  packageKey: string;
  contractType: "independent_doctor" | "clinic_organization";
  locale: AdminContractLocale;
  title: string;
  version: string;
  requiresAcceptance: boolean;
  effectiveAt: string;
  documentIds: string[];
};

const COPY = {
  ro: {
    eyebrow: "Administrare contractuală",
    title: "Contracte, anexe și versiuni",
    description:
      "Creați drafturi, publicați versiuni imuabile, atribuiți pachete și gestionați acte adiționale. Tarifele operaționale rămân în editorul manual de facturare.",
    tabs: {
      clients: "Clienți",
      templates: "Șabloane",
      amendments: "Acte adiționale",
      acceptances: "Acceptări",
      prices: "Actualizări tarife",
    },
    common: {
      save: "Salvează draftul",
      publish: "Publică",
      delete: "Șterge draftul",
      createNew: "Draft nou",
      clone: "Creează versiune nouă",
      cancel: "Anulează atribuirea",
      retry: "Retrimite notificarea",
      markEffective: "Marchează în vigoare",
      openPricing: "Deschide tarifele manuale",
      markApplied: "Confirmă aplicarea manuală",
      noRows: "Nu există înregistrări.",
      select: "Selectați",
      all: "Toți clienții compatibili",
      selected: "Clienți selectați",
      version: "Versiune",
      title: "Titlu",
      effectiveAt: "Intră în vigoare",
      acceptanceRequired: "Necesită acceptare electronică",
      noticeOnly: "Informare unilaterală, fără acceptare nouă",
      paymentDeadline: "Termen contractual: 30 zile calendaristice",
      published: "Publicat",
      draft: "Draft",
      status: "Status",
      client: "Client",
      package: "Pachet",
      actions: "Acțiuni",
      email: "E-mail",
      date: "Data",
      operationCompleted: "Operațiunea contractuală a fost finalizată.",
      requestFailed: "Operațiunea contractuală nu a putut fi finalizată.",
      downloadPdf: "Descarcă PDF",
      downloadingPdf: "Se pregătește...",
    },
    clients: {
      assignTitle: "Atribuie un pachet publicat",
      assignDescription:
        "Atribuirea nu modifică automat tarifele de facturare și nu blochează niciun cont.",
      scope: "Destinatari",
      commercialTitle: "Condiții comerciale contractuale",
      subscription: "Abonament / pachet",
      currency: "Monedă",
      vat: "TVA %",
      keepExisting: "Păstrează condițiile contractuale existente",
      notes: "Notă internă",
      assign: "Atribuie și notifică",
      recent: "Atribuiri recente",
      notifications: "Notificări",
    },
    templates: {
      documents: "Documente contractuale",
      packages: "Pachete contractuale",
      editDraft: "Editează un draft existent",
      documentKey: "Cheie document",
      documentType: "Tip document",
      audience: "Audiență",
      language: "Limbă",
      html: "Conținut HTML",
      issueDate: "Data emiterii",
      unilateralAllowed: "Poate fi actualizat prin informare unilaterală",
      cloneDocument: "Versiune nouă din document publicat",
      clonePackage: "Versiune nouă din pachet publicat",
      source: "Versiune publicată sursă",
      packageKey: "Cheie pachet",
      contractType: "Tip client",
      packageDocuments: "Documente publicate incluse",
    },
    amendments: {
      title: "Creează și atribuie o versiune nouă",
      description:
        "Operațiunea publică un document nou, un pachet nou și creează atribuiri noi. Versiunile anterioare rămân intacte.",
      basePackage: "Pachet publicat de bază",
      sourceDocument: "Documentul care va primi versiune nouă",
      newDocument: "Noua versiune a documentului",
      newPackage: "Noua versiune a pachetului",
      keepTerms: "Păstrează condițiile comerciale ale fiecărui client",
      replaceTerms: "Înlocuiește condițiile comerciale după acceptare",
      create: "Publică, atribuie și notifică",
      noticeWarning:
        "Informarea unilaterală este permisă numai pentru un document marcat anterior în acest sens și nu poate schimba tarifele.",
    },
    acceptances: {
      title: "Registrul acceptărilor electronice",
      representative: "Reprezentant",
      capacity: "Calitate",
      evidence: "Hash dovadă",
      pdf: "PDF",
    },
    prices: {
      title: "Reconciliere tarife acceptate",
      description:
        "RomDoc compară tarifele contractuale acceptate cu tarifele operaționale folosite la facturare. Nicio valoare nu este modificată automat.",
      needsUpdate: "Necesită actualizare manuală",
      readyToConfirm: "Valorile corespund — gata de confirmare",
      needsUpdateCount: "Necesită actualizare",
      readyCount: "Gata de confirmare",
      accepted: "Valoare contractuală acceptată",
      operational: "Valoare operațională curentă",
      result: "Comparație",
      matched: "Identic",
      different: "Diferit",
      source: "Sursa tarifului operațional",
      sourceGlobal: "Tarife globale",
      sourceOverride: "Configurație individuală",
      comparisonDate: "Data contractuală verificată",
      overridePeriod: "Perioada configurației individuale",
      noDateLimit: "fără limită",
      overrideOutsidePeriod:
        "Configurația individuală există, dar nu este aplicabilă la data contractuală. Comparația folosește tarifele globale.",
      differences: "Diferențe identificate",
      noDifferences: "Toate valorile contractuale urmărite corespund configurației operaționale.",
      legacyWarning:
        "Există o confirmare veche fără comparație verificată. Confirmați din nou după verificarea valorilor.",
      updateFirst:
        "Butonul de confirmare devine disponibil numai după ce valorile operaționale corespund contractului acceptat.",
      empty:
        "Nu există actualizări contractuale de tarif în așteptarea reconcilierii.",
      fields: {
        subscriptionUnitPrice: "Abonament / pachet",
        currency: "Monedă",
        vatRate: "TVA",
      },
    },
  },
  en: {
    eyebrow: "Contract administration",
    title: "Contracts, annexes and versions",
    description:
      "Create drafts, publish immutable versions, assign packages and manage amendments. Operational prices remain in the manual billing editor.",
    tabs: {
      clients: "Clients",
      templates: "Templates",
      amendments: "Amendments",
      acceptances: "Acceptances",
      prices: "Price updates",
    },
    common: {
      save: "Save draft",
      publish: "Publish",
      delete: "Delete draft",
      createNew: "New draft",
      clone: "Create new version",
      cancel: "Cancel assignment",
      retry: "Retry notification",
      markEffective: "Mark effective",
      openPricing: "Open manual pricing",
      markApplied: "Confirm manual application",
      noRows: "There are no records.",
      select: "Select",
      all: "All compatible clients",
      selected: "Selected clients",
      version: "Version",
      title: "Title",
      effectiveAt: "Effective on",
      acceptanceRequired: "Electronic acceptance required",
      noticeOnly: "Unilateral notice without new acceptance",
      paymentDeadline: "Contractual deadline: 30 calendar days",
      published: "Published",
      draft: "Draft",
      status: "Status",
      client: "Client",
      package: "Package",
      actions: "Actions",
      email: "Email",
      date: "Date",
      operationCompleted: "The contract operation was completed.",
      requestFailed: "The contract operation could not be completed.",
      downloadPdf: "Download PDF",
      downloadingPdf: "Preparing...",
    },
    clients: {
      assignTitle: "Assign a published package",
      assignDescription:
        "Assignment never changes operational billing prices and never blocks an account.",
      scope: "Recipients",
      commercialTitle: "Contractual commercial terms",
      subscription: "Subscription / package",
      currency: "Currency",
      vat: "VAT %",
      keepExisting: "Keep existing contractual terms",
      notes: "Internal note",
      assign: "Assign and notify",
      recent: "Recent assignments",
      notifications: "Notifications",
    },
    templates: {
      documents: "Contract documents",
      packages: "Contract packages",
      editDraft: "Edit an existing draft",
      documentKey: "Document key",
      documentType: "Document type",
      audience: "Audience",
      language: "Language",
      html: "HTML content",
      issueDate: "Issue date",
      unilateralAllowed: "May be updated by unilateral notice",
      cloneDocument: "New version from published document",
      clonePackage: "New version from published package",
      source: "Published source version",
      packageKey: "Package key",
      contractType: "Client type",
      packageDocuments: "Included published documents",
    },
    amendments: {
      title: "Create and assign a new version",
      description:
        "This operation publishes a new document, a new package and new assignments. Earlier versions remain unchanged.",
      basePackage: "Base published package",
      sourceDocument: "Document receiving a new version",
      newDocument: "New document version",
      newPackage: "New package version",
      keepTerms: "Keep each client's existing commercial terms",
      replaceTerms: "Replace commercial terms after acceptance",
      create: "Publish, assign and notify",
      noticeWarning:
        "Unilateral notice is allowed only for a document already marked for it and cannot change prices.",
    },
    acceptances: {
      title: "Electronic acceptance register",
      representative: "Representative",
      capacity: "Capacity",
      evidence: "Evidence hash",
      pdf: "PDF",
    },
    prices: {
      title: "Accepted-price reconciliation",
      description:
        "RomDoc compares accepted contractual prices with the operational prices used for billing. No value is changed automatically.",
      needsUpdate: "Manual update required",
      readyToConfirm: "Values match — ready to confirm",
      needsUpdateCount: "Needs update",
      readyCount: "Ready to confirm",
      accepted: "Accepted contractual value",
      operational: "Current operational value",
      result: "Comparison",
      matched: "Match",
      different: "Different",
      source: "Operational price source",
      sourceGlobal: "Global rates",
      sourceOverride: "Individual configuration",
      comparisonDate: "Contract comparison date",
      overridePeriod: "Individual configuration period",
      noDateLimit: "no limit",
      overrideOutsidePeriod:
        "An individual configuration exists but does not apply on the contract date. The comparison uses the global rates.",
      differences: "Detected differences",
      noDifferences: "All tracked contractual values match the operational configuration.",
      legacyWarning:
        "An earlier confirmation exists without a verified comparison. Confirm again after reviewing the values.",
      updateFirst:
        "Confirmation becomes available only after the operational values match the accepted contract.",
      empty: "There are no contractual price updates awaiting reconciliation.",
      fields: {
        subscriptionUnitPrice: "Subscription / package",
        currency: "Currency",
        vatRate: "VAT",
      },
    },
  },
  de: {
    eyebrow: "Vertragsverwaltung",
    title: "Verträge, Anlagen und Versionen",
    description:
      "Erstellen Sie Entwürfe, veröffentlichen Sie unveränderliche Versionen, weisen Sie Pakete zu und verwalten Sie Nachträge. Operative Preise bleiben im manuellen Abrechnungseditor.",
    tabs: {
      clients: "Kunden",
      templates: "Vorlagen",
      amendments: "Nachträge",
      acceptances: "Annahmen",
      prices: "Preisaktualisierungen",
    },
    common: {
      save: "Entwurf speichern",
      publish: "Veröffentlichen",
      delete: "Entwurf löschen",
      createNew: "Neuer Entwurf",
      clone: "Neue Version erstellen",
      cancel: "Zuweisung stornieren",
      retry: "Benachrichtigung erneut senden",
      markEffective: "Als wirksam markieren",
      openPricing: "Manuelle Preise öffnen",
      markApplied: "Manuelle Anwendung bestätigen",
      noRows: "Keine Einträge vorhanden.",
      select: "Auswählen",
      all: "Alle kompatiblen Kunden",
      selected: "Ausgewählte Kunden",
      version: "Version",
      title: "Titel",
      effectiveAt: "Wirksam ab",
      acceptanceRequired: "Elektronische Annahme erforderlich",
      noticeOnly: "Einseitige Mitteilung ohne neue Annahme",
      paymentDeadline: "Vertragliche Frist: 30 Kalendertage",
      published: "Veröffentlicht",
      draft: "Entwurf",
      status: "Status",
      client: "Kunde",
      package: "Paket",
      actions: "Aktionen",
      email: "E-Mail",
      date: "Datum",
      operationCompleted: "Der Vertragsvorgang wurde abgeschlossen.",
      requestFailed: "Der Vertragsvorgang konnte nicht abgeschlossen werden.",
      downloadPdf: "PDF herunterladen",
      downloadingPdf: "Wird vorbereitet...",
    },
    clients: {
      assignTitle: "Veröffentlichtes Paket zuweisen",
      assignDescription:
        "Die Zuweisung ändert niemals operative Abrechnungspreise und sperrt kein Konto.",
      scope: "Empfänger",
      commercialTitle: "Vertragliche Geschäftsbedingungen",
      subscription: "Abonnement / Paket",
      currency: "Währung",
      vat: "MwSt. %",
      keepExisting: "Bestehende Vertragsbedingungen beibehalten",
      notes: "Interne Notiz",
      assign: "Zuweisen und benachrichtigen",
      recent: "Letzte Zuweisungen",
      notifications: "Benachrichtigungen",
    },
    templates: {
      documents: "Vertragsdokumente",
      packages: "Vertragspakete",
      editDraft: "Vorhandenen Entwurf bearbeiten",
      documentKey: "Dokumentschlüssel",
      documentType: "Dokumenttyp",
      audience: "Zielgruppe",
      language: "Sprache",
      html: "HTML-Inhalt",
      issueDate: "Ausgabedatum",
      unilateralAllowed: "Darf durch einseitige Mitteilung aktualisiert werden",
      cloneDocument: "Neue Version aus veröffentlichtem Dokument",
      clonePackage: "Neue Version aus veröffentlichtem Paket",
      source: "Veröffentlichte Ausgangsversion",
      packageKey: "Paketschlüssel",
      contractType: "Kundentyp",
      packageDocuments: "Enthaltene veröffentlichte Dokumente",
    },
    amendments: {
      title: "Neue Version erstellen und zuweisen",
      description:
        "Der Vorgang veröffentlicht ein neues Dokument, ein neues Paket und neue Zuweisungen. Frühere Versionen bleiben unverändert.",
      basePackage: "Veröffentlichtes Basispaket",
      sourceDocument: "Dokument mit neuer Version",
      newDocument: "Neue Dokumentversion",
      newPackage: "Neue Paketversion",
      keepTerms: "Bestehende Geschäftsbedingungen jedes Kunden beibehalten",
      replaceTerms: "Geschäftsbedingungen nach Annahme ersetzen",
      create: "Veröffentlichen, zuweisen und benachrichtigen",
      noticeWarning:
        "Eine einseitige Mitteilung ist nur für ein zuvor entsprechend markiertes Dokument zulässig und darf keine Preise ändern.",
    },
    acceptances: {
      title: "Register elektronischer Annahmen",
      representative: "Vertretung",
      capacity: "Funktion",
      evidence: "Nachweis-Hash",
      pdf: "PDF",
    },
    prices: {
      title: "Abgleich angenommener Preise",
      description:
        "RomDoc vergleicht die angenommenen Vertragspreise mit den operativen Abrechnungspreisen. Es wird kein Wert automatisch geändert.",
      needsUpdate: "Manuelle Aktualisierung erforderlich",
      readyToConfirm: "Werte stimmen überein — Bestätigung möglich",
      needsUpdateCount: "Aktualisierung nötig",
      readyCount: "Bestätigungsbereit",
      accepted: "Angenommener Vertragswert",
      operational: "Aktueller operativer Wert",
      result: "Vergleich",
      matched: "Identisch",
      different: "Abweichend",
      source: "Quelle des operativen Preises",
      sourceGlobal: "Globale Tarife",
      sourceOverride: "Individuelle Konfiguration",
      comparisonDate: "Geprüftes Vertragsdatum",
      overridePeriod: "Zeitraum der individuellen Konfiguration",
      noDateLimit: "ohne Begrenzung",
      overrideOutsidePeriod:
        "Eine individuelle Konfiguration ist vorhanden, gilt jedoch am Vertragsdatum nicht. Der Vergleich verwendet die globalen Tarife.",
      differences: "Ermittelte Unterschiede",
      noDifferences: "Alle verfolgten Vertragswerte entsprechen der operativen Konfiguration.",
      legacyWarning:
        "Eine frühere Bestätigung ohne geprüften Vergleich ist vorhanden. Bestätigen Sie nach der Prüfung erneut.",
      updateFirst:
        "Die Bestätigung wird erst verfügbar, wenn die operativen Werte dem angenommenen Vertrag entsprechen.",
      empty: "Keine vertraglichen Preisaktualisierungen warten auf den Abgleich.",
      fields: {
        subscriptionUnitPrice: "Abonnement / Paket",
        currency: "Währung",
        vatRate: "MwSt.",
      },
    },
  },
} as const;

const EMPTY_DOCUMENT: DocumentForm = {
  documentKey: "",
  documentType: "doctor_contract",
  audience: "doctor",
  locale: "ro",
  title: "",
  version: "1.0",
  contentHtml: "<h2></h2><p></p>",
  requiresAcceptance: true,
  unilateralNoticeAllowed: false,
  issueDate: new Date().toISOString().slice(0, 10),
  effectiveAt: "",
};

const EMPTY_PACKAGE: PackageForm = {
  packageKey: "",
  contractType: "independent_doctor",
  locale: "ro",
  title: "",
  version: "1.0",
  requiresAcceptance: true,
  effectiveAt: "",
  documentIds: [],
};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }
  ).format(date);
}

function formatDateOnly(value: string | null, locale: AppLocale) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    { dateStyle: "medium", timeZone: "UTC" }
  ).format(date);
}

function termsFromFields(input: {
  subscriptionPrice: string;
  currency: string;
  vatPercent: string;
}) {
  const result: Record<string, unknown> = {};
  const subscription = Number(input.subscriptionPrice.replace(",", "."));
  const vat = Number(input.vatPercent.replace(",", "."));

  const hasSubscription =
    input.subscriptionPrice.trim().length > 0 &&
    Number.isFinite(subscription) &&
    subscription >= 0;
  const hasVat =
    input.vatPercent.trim().length > 0 &&
    Number.isFinite(vat) &&
    vat >= 0 &&
    vat <= 100;

  if (hasSubscription) result.subscriptionUnitPrice = subscription;
  if (hasVat) result.vatRate = vat / 100;
  if (hasSubscription || hasVat) {
    result.currency = input.currency;
  }

  return result;
}

function formatPriceValue(
  field: string,
  value: unknown,
  locale: AppLocale,
  currency: string
) {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "currency") return String(value);
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (field === "vatRate") {
    return `${new Intl.NumberFormat(
      locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
      { maximumFractionDigits: 4 }
    ).format(numeric * 100)}%`;
  }
  return `${new Intl.NumberFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    { minimumFractionDigits: 0, maximumFractionDigits: 4 }
  ).format(numeric)} ${currency}`;
}

function clientKey(client: AdminContractClient) {
  return `${client.clientType}:${client.id}`;
}

function badge(status: string) {
  if (["published", "accepted", "effective", "sent", "ready"].includes(status)) {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (["assigned", "notified", "awaiting_acceptance", "pending"].includes(status)) {
    return "bg-amber-50 text-amber-900 border-amber-200";
  }
  if (["failed", "cancelled", "terminated"].includes(status)) {
    return "bg-red-50 text-red-800 border-red-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

async function api(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>
) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as {
    message?: string;
    error?: string;
  };
  if (!response.ok) throw new Error(result.error ?? "Contract request failed.");
  return result;
}

export default function AdminContractManagement({ locale, data }: Props) {
  const copy = COPY[locale];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("clients");

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (
      requestedTab === "clients" ||
      requestedTab === "templates" ||
      requestedTab === "amendments" ||
      requestedTab === "acceptances" ||
      requestedTab === "prices"
    ) {
      setTab(requestedTab);
    }
  }, []);

  const [notice, setNotice] = useState<Notice>(null);
  const [downloadingAcceptanceId, setDownloadingAcceptanceId] =
    useState<string | null>(null);

  const drafts = data.documents.filter((item) => item.status === "draft");
  const publishedDocuments = data.documents.filter(
    (item) => item.status === "published"
  );
  const draftPackages = data.packages.filter((item) => item.status === "draft");
  const publishedPackages = data.packages.filter(
    (item) => item.status === "published"
  );

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [documentForm, setDocumentForm] =
    useState<DocumentForm>(EMPTY_DOCUMENT);
  const [cloneDocumentId, setCloneDocumentId] = useState("");
  const [cloneDocumentTitle, setCloneDocumentTitle] = useState("");
  const [cloneDocumentVersion, setCloneDocumentVersion] = useState("");

  const selectedDocument = useMemo(
    () => drafts.find((item) => item.id === selectedDocumentId) ?? null,
    [drafts, selectedDocumentId]
  );

  useEffect(() => {
    if (!selectedDocument) {
      setDocumentForm({ ...EMPTY_DOCUMENT, locale });
      return;
    }
    setDocumentForm({
      documentKey: selectedDocument.documentKey,
      documentType: selectedDocument.documentType,
      audience: selectedDocument.audience,
      locale: selectedDocument.locale,
      title: selectedDocument.title,
      version: selectedDocument.version,
      contentHtml: selectedDocument.contentHtml,
      requiresAcceptance: selectedDocument.requiresAcceptance,
      unilateralNoticeAllowed: selectedDocument.unilateralNoticeAllowed,
      issueDate: selectedDocument.issueDate,
      effectiveAt: localDateTime(selectedDocument.effectiveAt),
    });
  }, [locale, selectedDocument]);

  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packageForm, setPackageForm] = useState<PackageForm>(EMPTY_PACKAGE);
  const [clonePackageId, setClonePackageId] = useState("");
  const [clonePackageTitle, setClonePackageTitle] = useState("");
  const [clonePackageVersion, setClonePackageVersion] = useState("");

  const selectedPackage = useMemo(
    () => draftPackages.find((item) => item.id === selectedPackageId) ?? null,
    [draftPackages, selectedPackageId]
  );

  useEffect(() => {
    if (!selectedPackage) {
      setPackageForm({ ...EMPTY_PACKAGE, locale });
      return;
    }
    setPackageForm({
      packageKey: selectedPackage.packageKey,
      contractType: selectedPackage.contractType,
      locale: selectedPackage.locale,
      title: selectedPackage.title,
      version: selectedPackage.version,
      requiresAcceptance: selectedPackage.requiresAcceptance,
      effectiveAt: localDateTime(selectedPackage.effectiveAt),
      documentIds: selectedPackage.documents.map((item) => item.documentId),
    });
  }, [locale, selectedPackage]);

  const compatibleDocuments = useMemo(
    () =>
      publishedDocuments.filter((document) => {
        if (document.locale !== packageForm.locale) return false;
        return (
          document.audience === "shared" ||
          (packageForm.contractType === "independent_doctor" &&
            document.audience === "doctor") ||
          (packageForm.contractType === "clinic_organization" &&
            document.audience === "clinic_organization")
        );
      }),
    [packageForm.contractType, packageForm.locale, publishedDocuments]
  );

  const [assignmentPackageId, setAssignmentPackageId] = useState("");
  const [assignmentScope, setAssignmentScope] = useState<"all" | "selected">(
    "selected"
  );
  const [assignmentClientIds, setAssignmentClientIds] = useState<string[]>([]);
  const [assignmentEffectiveAt, setAssignmentEffectiveAt] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [assignmentKeepExisting, setAssignmentKeepExisting] = useState(false);
  const [assignmentSubscription, setAssignmentSubscription] = useState("");
  const [assignmentCurrency, setAssignmentCurrency] = useState("RON");
  const [assignmentVat, setAssignmentVat] = useState("");

  const assignmentPackage = publishedPackages.find(
    (item) => item.id === assignmentPackageId
  );
  const assignmentClients = data.clients.filter(
    (client) => client.clientType === assignmentPackage?.contractType
  );

  const [amendmentPackageId, setAmendmentPackageId] = useState("");
  const amendmentPackage = publishedPackages.find(
    (item) => item.id === amendmentPackageId
  );
  const amendmentDocuments = amendmentPackage
    ? amendmentPackage.documents
        .map((link) =>
          publishedDocuments.find((document) => document.id === link.documentId)
        )
        .filter((item): item is AdminContractDocument => Boolean(item))
    : [];
  const [amendmentDocumentId, setAmendmentDocumentId] = useState("");
  const amendmentDocument = amendmentDocuments.find(
    (item) => item.id === amendmentDocumentId
  );
  const [amendmentDocumentTitle, setAmendmentDocumentTitle] = useState("");
  const [amendmentDocumentVersion, setAmendmentDocumentVersion] = useState("");
  const [amendmentContent, setAmendmentContent] = useState("");
  const [amendmentIssueDate, setAmendmentIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [amendmentEffectiveAt, setAmendmentEffectiveAt] = useState("");
  const [amendmentPackageTitle, setAmendmentPackageTitle] = useState("");
  const [amendmentPackageVersion, setAmendmentPackageVersion] = useState("");
  const [amendmentRequiresAcceptance, setAmendmentRequiresAcceptance] =
    useState(true);
  const [amendmentScope, setAmendmentScope] = useState<"all" | "selected">(
    "selected"
  );
  const [amendmentClientIds, setAmendmentClientIds] = useState<string[]>([]);
  const [amendmentKeepTerms, setAmendmentKeepTerms] = useState(true);
  const [amendmentSubscription, setAmendmentSubscription] = useState("");
  const [amendmentCurrency, setAmendmentCurrency] = useState("RON");
  const [amendmentVat, setAmendmentVat] = useState("");
  const [amendmentNotes, setAmendmentNotes] = useState("");

  useEffect(() => {
    setAmendmentDocumentId("");
    setAmendmentPackageTitle(amendmentPackage?.title ?? "");
    setAmendmentPackageVersion("");
    setAmendmentClientIds([]);
  }, [amendmentPackage]);

  useEffect(() => {
    setAmendmentDocumentTitle(amendmentDocument?.title ?? "");
    setAmendmentDocumentVersion("");
    setAmendmentContent(amendmentDocument?.contentHtml ?? "");
    setAmendmentRequiresAcceptance(true);
  }, [amendmentDocument]);

  const amendmentClients = data.clients.filter(
    (client) => client.clientType === amendmentPackage?.contractType
  );

  function run(task: () => Promise<{ message?: string }>) {
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await task();
        setNotice({
          tone: "success",
          text:
            locale === "ro"
              ? result.message ??
                copy.common
                  .operationCompleted
              : copy.common
                  .operationCompleted,
        });
        router.refresh();
      } catch (error) {
        setNotice({
          tone: "error",
          text:
            locale === "ro" &&
            error instanceof Error
              ? error.message
              : copy.common
                  .requestFailed,
        });
      }
    });
  }

  async function downloadAcceptedPdf(
    acceptanceId: string
  ) {
    if (downloadingAcceptanceId) return;

    setNotice(null);
    setDownloadingAcceptanceId(
      acceptanceId
    );

    try {
      const response = await fetch(
        "/api/contracts/download",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            acceptanceId,
          }),
        }
      );

      const result =
        (await response.json()) as {
          signedUrl?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.signedUrl
      ) {
        throw new Error(
          result.error ??
            copy.common.requestFailed
        );
      }

      window.location.assign(
        result.signedUrl
      );
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          locale === "ro" &&
          error instanceof Error
            ? error.message
            : copy.common
                .requestFailed,
      });
    } finally {
      setDownloadingAcceptanceId(
        null
      );
    }
  }

  function saveDocument() {
    run(() =>
      api(
        "/api/admin/contracts/documents",
        selectedDocumentId ? "PATCH" : "POST",
        {
          action: "save",
          documentId: selectedDocumentId || undefined,
          ...documentForm,
        }
      )
    );
  }

  function savePackage() {
    run(() =>
      api(
        "/api/admin/contracts/packages",
        selectedPackageId ? "PATCH" : "POST",
        {
          action: "save",
          packageId: selectedPackageId || undefined,
          ...packageForm,
        }
      )
    );
  }

  const priceNeedsUpdateCount = data.priceUpdates.filter(
    (item) => item.comparisonStatus === "needs_update"
  ).length;
  const priceReadyCount = data.priceUpdates.filter(
    (item) => item.comparisonStatus === "ready_to_confirm"
  ).length;

  const tabItems: { key: Tab; label: string; count?: number }[] = [
    { key: "clients", label: copy.tabs.clients, count: data.assignments.length },
    { key: "templates", label: copy.tabs.templates },
    { key: "amendments", label: copy.tabs.amendments },
    {
      key: "acceptances",
      label: copy.tabs.acceptances,
      count: data.acceptances.length,
    },
    {
      key: "prices",
      label: copy.tabs.prices,
      count: data.priceUpdates.length,
    },
  ];

  return (
    <div className="space-y-[21px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">{copy.eyebrow}</p>
        <h1 className="mt-[8px] text-3xl font-bold tracking-tight text-gray-950">
          {copy.title}
        </h1>
        <p className="mt-[13px] max-w-5xl text-sm leading-6 text-gray-600">
          {copy.description}
        </p>
      </header>

      {notice ? (
        <div
          className={`rounded-[13px] border p-[13px] text-sm ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : notice.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <nav
        className="flex gap-[8px] overflow-x-auto rounded-[21px] border border-gray-200 bg-white p-[8px] shadow-sm"
        aria-label="Contract administration tabs"
      >
        {tabItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`romdoc-focus-ring inline-flex min-h-[42px] shrink-0 items-center gap-[8px] rounded-[13px] px-[13px] text-sm font-semibold transition ${
              tab === item.key
                ? "bg-[#036661] text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
            }`}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span
                className={`rounded-full px-[8px] py-[2px] text-xs ${
                  tab === item.key ? "bg-white/20" : "bg-gray-100"
                }`}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === "clients" ? (
        <div className="space-y-[21px]">
          <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">
              {copy.clients.assignTitle}
            </h2>
            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {copy.clients.assignDescription}
            </p>
            <p className="mt-[8px] text-xs font-semibold text-[#036661]">
              {copy.common.paymentDeadline}
            </p>

            <div className="mt-[21px] grid gap-[13px] lg:grid-cols-2">
              <Field label={copy.common.package}>
                <select
                  value={assignmentPackageId}
                  onChange={(event) => {
                    setAssignmentPackageId(event.target.value);
                    setAssignmentClientIds([]);
                  }}
                  className="input"
                >
                  <option value="">{copy.common.select}</option>
                  {publishedPackages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} — {item.version} — {item.locale}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={copy.clients.scope}>
                <select
                  value={assignmentScope}
                  onChange={(event) =>
                    setAssignmentScope(event.target.value as "all" | "selected")
                  }
                  className="input"
                >
                  <option value="selected">{copy.common.selected}</option>
                  <option value="all">{copy.common.all}</option>
                </select>
              </Field>

              {assignmentScope === "selected" ? (
                <Field label={copy.common.client}>
                  <select
                    multiple
                    value={assignmentClientIds}
                    onChange={(event) =>
                      setAssignmentClientIds(
                        Array.from(
                          event.currentTarget.selectedOptions as HTMLCollectionOf<HTMLOptionElement>
                        ).map((option) => option.value)
                      )
                    }
                    className="input min-h-[144px]"
                  >
                    {assignmentClients.map((client) => (
                      <option key={clientKey(client)} value={client.id}>
                        {client.name} — {client.email ?? "—"}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[13px] text-sm text-gray-600">
                  {assignmentClients.length} {copy.common.client.toLowerCase()}
                </div>
              )}

              <Field label={copy.common.effectiveAt}>
                <input
                  type="datetime-local"
                  value={assignmentEffectiveAt}
                  onChange={(event) =>
                    setAssignmentEffectiveAt(event.target.value)
                  }
                  className="input"
                />
              </Field>
            </div>

            <details className="mt-[13px] rounded-[13px] border border-gray-200 bg-gray-50">
              <summary className="cursor-pointer p-[13px] font-semibold text-gray-800">
                {copy.clients.commercialTitle}
              </summary>
              <div className="grid gap-[13px] border-t border-gray-200 p-[13px] md:grid-cols-3">
                <Input
                  label={copy.clients.subscription}
                  value={assignmentSubscription}
                  setValue={setAssignmentSubscription}
                  type="number"
                />
                <Field label={copy.clients.currency}>
                  <select
                    value={assignmentCurrency}
                    onChange={(event) =>
                      setAssignmentCurrency(event.target.value)
                    }
                    className="input"
                  >
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                  </select>
                </Field>
                <Input
                  label={copy.clients.vat}
                  value={assignmentVat}
                  setValue={setAssignmentVat}
                  type="number"
                />
                <label className="md:col-span-3 flex items-start gap-[8px] text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={assignmentKeepExisting}
                    onChange={(event) =>
                      setAssignmentKeepExisting(event.target.checked)
                    }
                    className="mt-[3px]"
                  />
                  {copy.clients.keepExisting}
                </label>
              </div>
            </details>

            <Field label={copy.clients.notes} className="mt-[13px]">
              <textarea
                value={assignmentNotes}
                onChange={(event) => setAssignmentNotes(event.target.value)}
                className="input min-h-[89px]"
              />
            </Field>

            <button
              type="button"
              disabled={isPending || !assignmentPackage}
              onClick={() => {
                const ids =
                  assignmentScope === "all"
                    ? assignmentClients.map((client) => client.id)
                    : assignmentClientIds;
                run(() =>
                  api("/api/admin/contracts/assignments", "POST", {
                    packageId: assignmentPackageId,
                    clientIds: ids,
                    effectiveAt: assignmentEffectiveAt || null,
                    internalNotes: assignmentNotes,
                    keepExistingTerms: assignmentKeepExisting,
                    commercialTerms: termsFromFields({
                      subscriptionPrice: assignmentSubscription,
                      currency: assignmentCurrency,
                      vatPercent: assignmentVat,
                    }),
                  })
                );
              }}
              className="button-primary mt-[21px]"
            >
              {copy.clients.assign}
            </button>
          </section>

          <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">
              {copy.clients.recent}
            </h2>
            <div className="mt-[13px] overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-[8px] py-[13px]">
                      {copy.common.client}
                    </th>
                    <th className="px-[8px] py-[13px]">
                      {copy.common.package}
                    </th>
                    <th className="px-[8px] py-[13px]">
                      {copy.common.status}
                    </th>
                    <th className="px-[8px] py-[13px]">
                      {copy.clients.notifications}
                    </th>
                    <th className="px-[8px] py-[13px]">
                      {copy.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.assignments.slice(0, 100).map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="px-[8px] py-[13px] font-semibold text-gray-900">
                        {assignment.clientName}
                      </td>
                      <td className="px-[8px] py-[13px] text-gray-600">
                        {assignment.packageTitle} · {assignment.packageVersion}
                      </td>
                      <td className="px-[8px] py-[13px]">
                        <Status value={assignment.status} />
                      </td>
                      <td className="px-[8px] py-[13px] text-gray-600">
                        ✓ {assignment.notificationSentCount} · !{" "}
                        {assignment.notificationFailedCount}
                      </td>
                      <td className="px-[8px] py-[13px]">
                        <div className="flex flex-wrap gap-[8px]">
                          {![
                            "accepted",
                            "effective",
                            "superseded",
                            "cancelled",
                            "terminated",
                          ].includes(assignment.status) ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                run(() =>
                                  api(
                                    "/api/admin/contracts/assignments",
                                    "PATCH",
                                    {
                                      action: "notify",
                                      assignmentId: assignment.id,
                                    }
                                  )
                                )
                              }
                              className="button-secondary"
                            >
                              {copy.common.retry}
                            </button>
                          ) : null}
                          {!assignment.acceptanceRequired &&
                          ["assigned", "notified"].includes(
                            assignment.status
                          ) ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                run(() =>
                                  api(
                                    "/api/admin/contracts/assignments",
                                    "PATCH",
                                    {
                                      action: "mark_effective",
                                      assignmentId: assignment.id,
                                    }
                                  )
                                )
                              }
                              className="button-secondary"
                            >
                              {copy.common.markEffective}
                            </button>
                          ) : null}
                          {[
                            "assigned",
                            "notified",
                            "awaiting_acceptance",
                          ].includes(assignment.status) ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                run(() =>
                                  api(
                                    "/api/admin/contracts/assignments",
                                    "PATCH",
                                    {
                                      action: "cancel",
                                      assignmentId: assignment.id,
                                      reason: "Cancelled manually by Admin",
                                    }
                                  )
                                )
                              }
                              className="button-danger"
                            >
                              {copy.common.cancel}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.assignments.length === 0 ? (
                <Empty text={copy.common.noRows} />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "templates" ? (
        <div className="grid gap-[21px] xl:grid-cols-2">
          <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">
              {copy.templates.documents}
            </h2>
            <Field label={copy.templates.editDraft} className="mt-[13px]">
              <select
                value={selectedDocumentId}
                onChange={(event) =>
                  setSelectedDocumentId(event.target.value)
                }
                className="input"
              >
                <option value="">{copy.common.createNew}</option>
                {drafts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} — {item.version}
                  </option>
                ))}
              </select>
            </Field>
            <div className="mt-[13px] grid gap-[13px] md:grid-cols-2">
              <Input label={copy.templates.documentKey} value={documentForm.documentKey} setValue={(value) => setDocumentForm((current) => ({ ...current, documentKey: value }))} disabled={Boolean(selectedDocumentId)} />
              <Field label={copy.templates.documentType}><select value={documentForm.documentType} onChange={(event) => setDocumentForm((current) => ({ ...current, documentType: event.target.value }))} className="input"><option value="doctor_contract">doctor_contract</option><option value="clinic_contract">clinic_contract</option><option value="pricing_annex">pricing_annex</option><option value="consolidated_billing_annex">consolidated_billing_annex</option><option value="data_processing_annex">data_processing_annex</option><option value="security_annex">security_annex</option><option value="operational_annex">operational_annex</option><option value="individual_amendment">individual_amendment</option><option value="other_annex">other_annex</option></select></Field>
              <Field label={copy.templates.audience}><select value={documentForm.audience} disabled={Boolean(selectedDocumentId)} onChange={(event) => setDocumentForm((current) => ({ ...current, audience: event.target.value }))} className="input"><option value="doctor">doctor</option><option value="clinic_organization">clinic_organization</option><option value="shared">shared</option></select></Field>
              <Field label={copy.templates.language}><select value={documentForm.locale} disabled={Boolean(selectedDocumentId)} onChange={(event) => setDocumentForm((current) => ({ ...current, locale: event.target.value as AdminContractLocale }))} className="input"><option value="ro">RO</option><option value="en">EN</option><option value="de">DE</option></select></Field>
              <Input label={copy.common.title} value={documentForm.title} setValue={(value) => setDocumentForm((current) => ({ ...current, title: value }))} />
              <Input label={copy.common.version} value={documentForm.version} setValue={(value) => setDocumentForm((current) => ({ ...current, version: value }))} />
              <Input label={copy.templates.issueDate} value={documentForm.issueDate} setValue={(value) => setDocumentForm((current) => ({ ...current, issueDate: value }))} type="date" />
              <Input label={copy.common.effectiveAt} value={documentForm.effectiveAt} setValue={(value) => setDocumentForm((current) => ({ ...current, effectiveAt: value }))} type="datetime-local" />
            </div>
            <Field label={copy.templates.html} className="mt-[13px]"><textarea value={documentForm.contentHtml} onChange={(event) => setDocumentForm((current) => ({ ...current, contentHtml: event.target.value }))} className="input min-h-[377px] font-mono text-xs" /></Field>
            <div className="mt-[13px] space-y-[8px] text-sm text-gray-700">
              <Check checked={documentForm.requiresAcceptance} setChecked={(value) => setDocumentForm((current) => ({ ...current, requiresAcceptance: value }))} label={copy.common.acceptanceRequired} />
              <Check checked={documentForm.unilateralNoticeAllowed} setChecked={(value) => setDocumentForm((current) => ({ ...current, unilateralNoticeAllowed: value }))} label={copy.templates.unilateralAllowed} />
            </div>
            <div className="mt-[21px] flex flex-wrap gap-[8px]">
              <button type="button" disabled={isPending} onClick={saveDocument} className="button-primary">{copy.common.save}</button>
              {selectedDocumentId ? <button type="button" disabled={isPending} onClick={() => run(() => api("/api/admin/contracts/documents", "PATCH", { action: "publish", documentId: selectedDocumentId }))} className="button-secondary">{copy.common.publish}</button> : null}
              {selectedDocumentId ? <button type="button" disabled={isPending} onClick={() => run(() => api("/api/admin/contracts/documents", "DELETE", { documentId: selectedDocumentId }))} className="button-danger">{copy.common.delete}</button> : null}
            </div>

            <details className="mt-[21px] rounded-[13px] border border-gray-200 bg-gray-50">
              <summary className="cursor-pointer p-[13px] font-semibold">{copy.templates.cloneDocument}</summary>
              <div className="grid gap-[13px] border-t border-gray-200 p-[13px]">
                <Field label={copy.templates.source}><select value={cloneDocumentId} onChange={(event) => { const value = event.target.value; setCloneDocumentId(value); const item = publishedDocuments.find((doc) => doc.id === value); setCloneDocumentTitle(item?.title ?? ""); }} className="input"><option value="">{copy.common.select}</option>{publishedDocuments.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.version}</option>)}</select></Field>
                <Input label={copy.common.title} value={cloneDocumentTitle} setValue={setCloneDocumentTitle} />
                <Input label={copy.common.version} value={cloneDocumentVersion} setValue={setCloneDocumentVersion} />
                <button type="button" disabled={isPending || !cloneDocumentId} onClick={() => run(() => api("/api/admin/contracts/documents", "POST", { action: "clone", sourceDocumentId: cloneDocumentId, title: cloneDocumentTitle, version: cloneDocumentVersion }))} className="button-secondary">{copy.common.clone}</button>
              </div>
            </details>
          </section>

          <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">{copy.templates.packages}</h2>
            <Field label={copy.templates.editDraft} className="mt-[13px]"><select value={selectedPackageId} onChange={(event) => setSelectedPackageId(event.target.value)} className="input"><option value="">{copy.common.createNew}</option>{draftPackages.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.version}</option>)}</select></Field>
            <div className="mt-[13px] grid gap-[13px] md:grid-cols-2">
              <Input label={copy.templates.packageKey} value={packageForm.packageKey} setValue={(value) => setPackageForm((current) => ({ ...current, packageKey: value }))} disabled={Boolean(selectedPackageId)} />
              <Field label={copy.templates.contractType}><select value={packageForm.contractType} disabled={Boolean(selectedPackageId)} onChange={(event) => setPackageForm((current) => ({ ...current, contractType: event.target.value as PackageForm["contractType"], documentIds: [] }))} className="input"><option value="independent_doctor">independent_doctor</option><option value="clinic_organization">clinic_organization</option></select></Field>
              <Field label={copy.templates.language}><select value={packageForm.locale} disabled={Boolean(selectedPackageId)} onChange={(event) => setPackageForm((current) => ({ ...current, locale: event.target.value as AdminContractLocale, documentIds: [] }))} className="input"><option value="ro">RO</option><option value="en">EN</option><option value="de">DE</option></select></Field>
              <Input label={copy.common.version} value={packageForm.version} setValue={(value) => setPackageForm((current) => ({ ...current, version: value }))} />
              <Input label={copy.common.title} value={packageForm.title} setValue={(value) => setPackageForm((current) => ({ ...current, title: value }))} />
              <Input label={copy.common.effectiveAt} value={packageForm.effectiveAt} setValue={(value) => setPackageForm((current) => ({ ...current, effectiveAt: value }))} type="datetime-local" />
            </div>
            <Field label={copy.templates.packageDocuments} className="mt-[13px]"><select multiple value={packageForm.documentIds} onChange={(event) => setPackageForm((current) => ({ ...current, documentIds: Array.from(
                  event.currentTarget.selectedOptions as HTMLCollectionOf<HTMLOptionElement>
                ).map((option) => option.value) }))} className="input min-h-[233px]">{compatibleDocuments.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.version}</option>)}</select></Field>
            <div className="mt-[13px]"><Check checked={packageForm.requiresAcceptance} setChecked={(value) => setPackageForm((current) => ({ ...current, requiresAcceptance: value }))} label={packageForm.requiresAcceptance ? copy.common.acceptanceRequired : copy.common.noticeOnly} /></div>
            <p className="mt-[8px] text-xs font-semibold text-[#036661]">{copy.common.paymentDeadline}</p>
            <div className="mt-[21px] flex flex-wrap gap-[8px]">
              <button type="button" disabled={isPending} onClick={savePackage} className="button-primary">{copy.common.save}</button>
              {selectedPackageId ? <button type="button" disabled={isPending} onClick={() => run(() => api("/api/admin/contracts/packages", "PATCH", { action: "publish", packageId: selectedPackageId }))} className="button-secondary">{copy.common.publish}</button> : null}
              {selectedPackageId ? <button type="button" disabled={isPending} onClick={() => run(() => api("/api/admin/contracts/packages", "DELETE", { packageId: selectedPackageId }))} className="button-danger">{copy.common.delete}</button> : null}
            </div>

            <details className="mt-[21px] rounded-[13px] border border-gray-200 bg-gray-50">
              <summary className="cursor-pointer p-[13px] font-semibold">{copy.templates.clonePackage}</summary>
              <div className="grid gap-[13px] border-t border-gray-200 p-[13px]">
                <Field label={copy.templates.source}><select value={clonePackageId} onChange={(event) => { const value = event.target.value; setClonePackageId(value); const item = publishedPackages.find((pkg) => pkg.id === value); setClonePackageTitle(item?.title ?? ""); }} className="input"><option value="">{copy.common.select}</option>{publishedPackages.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.version}</option>)}</select></Field>
                <Input label={copy.common.title} value={clonePackageTitle} setValue={setClonePackageTitle} />
                <Input label={copy.common.version} value={clonePackageVersion} setValue={setClonePackageVersion} />
                <button type="button" disabled={isPending || !clonePackageId} onClick={() => run(() => api("/api/admin/contracts/packages", "POST", { action: "clone", sourcePackageId: clonePackageId, title: clonePackageTitle, version: clonePackageVersion }))} className="button-secondary">{copy.common.clone}</button>
              </div>
            </details>
          </section>
        </div>
      ) : null}

      {tab === "amendments" ? (
        <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <h2 className="text-xl font-bold text-gray-950">{copy.amendments.title}</h2>
          <p className="mt-[8px] max-w-4xl text-sm leading-6 text-gray-600">{copy.amendments.description}</p>
          <div className="mt-[21px] grid gap-[13px] lg:grid-cols-2">
            <Field label={copy.amendments.basePackage}><select value={amendmentPackageId} onChange={(event) => setAmendmentPackageId(event.target.value)} className="input"><option value="">{copy.common.select}</option>{publishedPackages.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.version}</option>)}</select></Field>
            <Field label={copy.amendments.sourceDocument}><select value={amendmentDocumentId} onChange={(event) => setAmendmentDocumentId(event.target.value)} className="input"><option value="">{copy.common.select}</option>{amendmentDocuments.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.version}</option>)}</select></Field>
          </div>

          <div className="mt-[21px] grid gap-[21px] xl:grid-cols-2">
            <fieldset className="rounded-[21px] border border-gray-200 bg-gray-50 p-[21px]">
              <legend className="px-[8px] font-bold text-gray-900">{copy.amendments.newDocument}</legend>
              <div className="grid gap-[13px] md:grid-cols-2">
                <Input label={copy.common.title} value={amendmentDocumentTitle} setValue={setAmendmentDocumentTitle} />
                <Input label={copy.common.version} value={amendmentDocumentVersion} setValue={setAmendmentDocumentVersion} />
                <Input label={copy.templates.issueDate} value={amendmentIssueDate} setValue={setAmendmentIssueDate} type="date" />
                <Input label={copy.common.effectiveAt} value={amendmentEffectiveAt} setValue={setAmendmentEffectiveAt} type="datetime-local" />
              </div>
              <Field label={copy.templates.html} className="mt-[13px]"><textarea value={amendmentContent} onChange={(event) => setAmendmentContent(event.target.value)} className="input min-h-[377px] font-mono text-xs" /></Field>
            </fieldset>

            <fieldset className="rounded-[21px] border border-gray-200 bg-gray-50 p-[21px]">
              <legend className="px-[8px] font-bold text-gray-900">{copy.amendments.newPackage}</legend>
              <div className="grid gap-[13px] md:grid-cols-2">
                <Input label={copy.common.title} value={amendmentPackageTitle} setValue={setAmendmentPackageTitle} />
                <Input label={copy.common.version} value={amendmentPackageVersion} setValue={setAmendmentPackageVersion} />
                <Input label={copy.common.effectiveAt} value={amendmentEffectiveAt} setValue={setAmendmentEffectiveAt} type="datetime-local" />
                <Field label={copy.clients.scope}><select value={amendmentScope} onChange={(event) => setAmendmentScope(event.target.value as "all" | "selected")} className="input"><option value="selected">{copy.common.selected}</option><option value="all">{copy.common.all}</option></select></Field>
              </div>
              {amendmentScope === "selected" ? <Field label={copy.common.client} className="mt-[13px]"><select multiple value={amendmentClientIds} onChange={(event) => setAmendmentClientIds(Array.from(
                  event.currentTarget.selectedOptions as HTMLCollectionOf<HTMLOptionElement>
                ).map((option) => option.value))} className="input min-h-[144px]">{amendmentClients.map((client) => <option key={clientKey(client)} value={client.id}>{client.name} — {client.email ?? "—"}</option>)}</select></Field> : <p className="mt-[13px] text-sm text-gray-600">{amendmentClients.length} {copy.common.client.toLowerCase()}</p>}
              <div className="mt-[13px] space-y-[8px]">
                <Check checked={amendmentRequiresAcceptance} setChecked={setAmendmentRequiresAcceptance} label={amendmentRequiresAcceptance ? copy.common.acceptanceRequired : copy.common.noticeOnly} />
                <Check checked={amendmentKeepTerms} setChecked={setAmendmentKeepTerms} label={amendmentKeepTerms ? copy.amendments.keepTerms : copy.amendments.replaceTerms} />
              </div>
              {!amendmentRequiresAcceptance ? <p className="mt-[13px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm text-amber-950">{copy.amendments.noticeWarning}</p> : null}
              {!amendmentKeepTerms ? <div className="mt-[13px] grid gap-[13px] md:grid-cols-2"><Input label={copy.clients.subscription} value={amendmentSubscription} setValue={setAmendmentSubscription} type="number" /><Field label={copy.clients.currency}><select value={amendmentCurrency} onChange={(event) => setAmendmentCurrency(event.target.value)} className="input"><option value="RON">RON</option><option value="EUR">EUR</option></select></Field><Input label={copy.clients.vat} value={amendmentVat} setValue={setAmendmentVat} type="number" /></div> : null}
              <Field label={copy.clients.notes} className="mt-[13px]"><textarea value={amendmentNotes} onChange={(event) => setAmendmentNotes(event.target.value)} className="input min-h-[89px]" /></Field>
            </fieldset>
          </div>

          <button type="button" disabled={isPending || !amendmentPackage || !amendmentDocument} onClick={() => {
            const ids = amendmentScope === "all" ? amendmentClients.map((client) => client.id) : amendmentClientIds;
            run(() => api("/api/admin/contracts/amendments", "POST", {
              sourcePackageId: amendmentPackageId,
              sourceDocumentId: amendmentDocumentId,
              documentTitle: amendmentDocumentTitle,
              documentVersion: amendmentDocumentVersion,
              contentHtml: amendmentContent,
              documentIssueDate: amendmentIssueDate,
              documentEffectiveAt: amendmentEffectiveAt || null,
              packageTitle: amendmentPackageTitle,
              packageVersion: amendmentPackageVersion,
              packageEffectiveAt: amendmentEffectiveAt || null,
              requiresAcceptance: amendmentRequiresAcceptance,
              clientIds: ids,
              keepExistingTerms: amendmentKeepTerms,
              commercialTerms: termsFromFields({ subscriptionPrice: amendmentSubscription, currency: amendmentCurrency, vatPercent: amendmentVat }),
              internalNotes: amendmentNotes,
            }));
          }} className="button-primary mt-[21px]">{copy.amendments.create}</button>
        </section>
      ) : null}

      {tab === "acceptances" ? (
        <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <h2 className="text-xl font-bold text-gray-950">{copy.acceptances.title}</h2>
          <div className="mt-[13px] overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500"><tr><th className="px-[8px] py-[13px]">{copy.common.client}</th><th className="px-[8px] py-[13px]">{copy.common.package}</th><th className="px-[8px] py-[13px]">{copy.acceptances.representative}</th><th className="px-[8px] py-[13px]">{copy.common.date}</th><th className="px-[8px] py-[13px]">{copy.acceptances.pdf}</th><th className="px-[8px] py-[13px]">{copy.acceptances.evidence}</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{data.acceptances.map((item) => <tr key={item.id}><td className="px-[8px] py-[13px] font-semibold">{item.clientName}</td><td className="px-[8px] py-[13px]">{item.packageTitle} · {item.packageVersion}</td><td className="px-[8px] py-[13px]">{item.representativeName}<br/><span className="text-xs text-gray-500">{item.representativeCapacity}</span></td><td className="px-[8px] py-[13px]">{formatDate(item.acceptedAt, locale)}</td><td className="px-[8px] py-[13px]">
                  <div className="flex flex-col items-start gap-[8px]">
                    <Status value={item.pdfStatus ?? "pending"} />
                    {item.pdfStatus === "ready" ? (
                      <button
                        type="button"
                        disabled={Boolean(downloadingAcceptanceId)}
                        onClick={() => void downloadAcceptedPdf(item.id)}
                        className="button-secondary"
                      >
                        {downloadingAcceptanceId === item.id
                          ? copy.common.downloadingPdf
                          : copy.common.downloadPdf}
                      </button>
                    ) : null}
                  </div>
                </td><td className="max-w-[233px] truncate px-[8px] py-[13px] font-mono text-xs" title={item.evidenceHash}>{item.evidenceHash}</td></tr>)}</tbody>
            </table>
            {data.acceptances.length === 0 ? <Empty text={copy.common.noRows} /> : null}
          </div>
        </section>
      ) : null}

      {tab === "prices" ? (
        <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <h2 className="text-xl font-bold text-gray-950">{copy.prices.title}</h2>
          <p className="mt-[8px] max-w-4xl text-sm leading-6 text-gray-600">
            {copy.prices.description}
          </p>

          <div className="mt-[21px] grid gap-[13px] sm:grid-cols-2">
            <div className="rounded-[13px] border border-amber-200 bg-amber-50 p-[13px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                {copy.prices.needsUpdateCount}
              </p>
              <p className="mt-[5px] text-2xl font-bold text-amber-950">
                {priceNeedsUpdateCount}
              </p>
            </div>
            <div className="rounded-[13px] border border-emerald-200 bg-emerald-50 p-[13px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {copy.prices.readyCount}
              </p>
              <p className="mt-[5px] text-2xl font-bold text-emerald-950">
                {priceReadyCount}
              </p>
            </div>
          </div>

          {data.priceUpdates.length === 0 ? (
            <Empty text={copy.prices.empty} />
          ) : (
            <div className="mt-[21px] space-y-[13px]">
              {data.priceUpdates.map((item) => {
                const isReady = item.comparisonStatus === "ready_to_confirm";
                const trackedFields = [
                  "subscriptionUnitPrice",
                  "currency",
                  "vatRate",
                ].filter((field) =>
                  Object.prototype.hasOwnProperty.call(item.acceptedTerms, field)
                );
                const differentFields = new Set(
                  item.differences.map((difference) => difference.field)
                );
                const acceptedCurrency =
                  typeof item.acceptedTerms.currency === "string"
                    ? item.acceptedTerms.currency
                    : item.operationalTerms.currency;

                return (
                  <article
                    key={item.assignmentId}
                    className={`rounded-[21px] border p-[21px] ${
                      isReady
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-amber-200 bg-amber-50/70"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-start">
                      <div>
                        <p className="font-bold text-gray-950">{item.clientName}</p>
                        <p className="mt-[5px] text-sm text-gray-700">
                          {copy.common.version}: {item.packageVersion} · {formatDate(item.acceptedAt, locale)}
                        </p>
                        <div className="mt-[8px] flex flex-wrap items-center gap-[8px]">
                          <span
                            className={`inline-flex rounded-full border px-[8px] py-[4px] text-xs font-semibold ${
                              isReady
                                ? "border-emerald-200 bg-white text-emerald-800"
                                : "border-amber-300 bg-white text-amber-900"
                            }`}
                          >
                            {isReady
                              ? copy.prices.readyToConfirm
                              : copy.prices.needsUpdate}
                          </span>
                          <span className="text-xs text-gray-600">
                            {copy.prices.source}: {item.operationalTerms.source === "client_override"
                              ? copy.prices.sourceOverride
                              : copy.prices.sourceGlobal}
                          </span>
                          <span className="text-xs text-gray-600">
                            {copy.prices.comparisonDate}: {formatDateOnly(
                              item.operationalTerms.comparisonDate,
                              locale
                            )}
                          </span>
                        </div>
                        {item.operationalTerms.overrideId ? (
                          <p className="mt-[8px] text-xs leading-5 text-gray-600">
                            {copy.prices.overridePeriod}: {item.operationalTerms.overrideEffectiveFrom
                              ? formatDateOnly(item.operationalTerms.overrideEffectiveFrom, locale)
                              : copy.prices.noDateLimit} — {item.operationalTerms.overrideEffectiveUntil
                              ? formatDateOnly(item.operationalTerms.overrideEffectiveUntil, locale)
                              : copy.prices.noDateLimit}
                          </p>
                        ) : null}
                        {item.operationalTerms.overrideId &&
                        !item.operationalTerms.overrideApplies ? (
                          <p className="mt-[8px] rounded-[13px] border border-amber-300 bg-white p-[13px] text-xs leading-5 text-amber-950">
                            {copy.prices.overrideOutsidePeriod}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-[8px]">
                        <Link href={item.pricingHref} className="button-secondary">
                          {copy.common.openPricing}
                        </Link>
                        <button
                          type="button"
                          disabled={isPending || !isReady}
                          title={!isReady ? copy.prices.updateFirst : undefined}
                          onClick={() =>
                            run(() =>
                              api("/api/admin/contracts/assignments", "PATCH", {
                                action: "mark_price_applied",
                                assignmentId: item.assignmentId,
                              })
                            )
                          }
                          className="button-primary"
                        >
                          {copy.common.markApplied}
                        </button>
                      </div>
                    </div>

                    {item.hasLegacyUnverifiedConfirmation ? (
                      <p className="mt-[13px] rounded-[13px] border border-amber-300 bg-white p-[13px] text-sm text-amber-950">
                        {copy.prices.legacyWarning}
                      </p>
                    ) : null}

                    <div className="mt-[13px] overflow-x-auto rounded-[13px] border border-gray-200 bg-white">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-[13px] py-[13px]">{copy.prices.differences}</th>
                            <th className="px-[13px] py-[13px]">{copy.prices.accepted}</th>
                            <th className="px-[13px] py-[13px]">{copy.prices.operational}</th>
                            <th className="px-[13px] py-[13px]">{copy.prices.result}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {trackedFields.map((field) => {
                            const different = differentFields.has(
                              field as "subscriptionUnitPrice" | "currency" | "vatRate"
                            );
                            const acceptedValue = item.acceptedTerms[
                              field as keyof typeof item.acceptedTerms
                            ];
                            const operationalValue = item.operationalTerms[
                              field as keyof typeof item.operationalTerms
                            ];
                            return (
                              <tr key={field}>
                                <td className="px-[13px] py-[13px] font-semibold text-gray-900">
                                  {copy.prices.fields[
                                    field as keyof typeof copy.prices.fields
                                  ]}
                                </td>
                                <td className="px-[13px] py-[13px] text-gray-700">
                                  {formatPriceValue(
                                    field,
                                    acceptedValue,
                                    locale,
                                    acceptedCurrency
                                  )}
                                </td>
                                <td className="px-[13px] py-[13px] text-gray-700">
                                  {formatPriceValue(
                                    field,
                                    operationalValue,
                                    locale,
                                    item.operationalTerms.currency
                                  )}
                                </td>
                                <td className="px-[13px] py-[13px]">
                                  <span
                                    className={`inline-flex rounded-full px-[8px] py-[4px] text-xs font-semibold ${
                                      different
                                        ? "bg-amber-100 text-amber-900"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {different
                                      ? copy.prices.different
                                      : copy.prices.matched}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <p className="mt-[13px] text-xs leading-5 text-gray-600">
                      {isReady ? copy.prices.noDifferences : copy.prices.updateFirst}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid rgb(209 213 219);
          border-radius: 13px;
          background: white;
          padding: 13px;
          font-size: 0.875rem;
          color: rgb(17 24 39);
        }
        :global(.button-primary),
        :global(.button-secondary),
        :global(.button-danger) {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          padding: 10px 13px;
          font-size: 0.875rem;
          font-weight: 700;
          transition: 150ms ease;
        }
        :global(.button-primary) { background: #036661; color: white; }
        :global(.button-primary:hover) { background: #024d49; }
        :global(.button-secondary) { border: 1px solid rgb(209 213 219); background: white; color: rgb(55 65 81); }
        :global(.button-secondary:hover) { border-color: #036661; color: #036661; }
        :global(.button-danger) { border: 1px solid rgb(254 202 202); background: rgb(254 242 242); color: rgb(185 28 28); }
        :global(button:disabled), :global(a[aria-disabled="true"]) { cursor: not-allowed; opacity: 0.55; }
      `}</style>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="text-sm font-semibold text-gray-700">{label}</span><div className="mt-[8px]">{children}</div></label>;
}

function Input({ label, value, setValue, type = "text", disabled = false }: { label: string; value: string; setValue: (value: string) => void; type?: string; disabled?: boolean }) {
  return <Field label={label}><input type={type} value={value} disabled={disabled} onChange={(event) => setValue(event.target.value)} step={type === "number" ? "0.01" : undefined} min={type === "number" ? "0" : undefined} className="input disabled:bg-gray-100" /></Field>;
}

function Check({ checked, setChecked, label }: { checked: boolean; setChecked: (value: boolean) => void; label: string }) {
  return <label className="flex items-start gap-[8px] text-sm text-gray-700"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-[3px]" /><span>{label}</span></label>;
}

function Status({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full border px-[8px] py-[4px] text-xs font-semibold ${badge(value)}`}>{value}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-[13px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-center text-sm text-gray-600">{text}</div>;
}
