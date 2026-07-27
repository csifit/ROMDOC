import "server-only";

import { createHash } from "node:crypto";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type {
  Content,
  ContentTable,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

import type { AppLocale } from "@/lib/i18n/app-locale";

export type AcceptedDocumentSnapshot = {
  displayOrder: number;
  sectionLabel: string | null;
  documentId: string;
  documentKey: string;
  documentType: string;
  title: string;
  version: string;
  contentHash: string;
  contentHtml: string;
  issueDate: string | null;
  effectiveAt: string | null;
  requiresAcceptance: boolean;
};

export type GenerateAcceptedContractPdfInput = {
  locale: AppLocale;
  packageTitle: string;
  packageVersion: string;
  representedEntityName: string;
  representativeName: string;
  representativeCapacity: string;
  acceptedAt: string;
  paymentDeadlineDays: number;
  acceptanceEvidenceHash: string;
  packageManifestHash: string;
  checkboxText: string;
  commercialTerms: Record<string, unknown>;
  documents: AcceptedDocumentSnapshot[];
};

type PdfMakeWithVfs = typeof pdfMake & {
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
  vfs?: Record<string, string>;
};

let fontsRegistered = false;

function isStringRecord(
  value: unknown
): value is Record<string, string> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  return Object.values(value).every(
    (entry) => typeof entry === "string"
  );
}

function resolvePdfFontVfs(
  value: unknown
): Record<string, string> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {};
  }

  const moduleRecord = value as Record<
    string,
    unknown
  >;
  const nestedPdfMake = moduleRecord.pdfMake;

  if (
    typeof nestedPdfMake === "object" &&
    nestedPdfMake !== null &&
    !Array.isArray(nestedPdfMake)
  ) {
    const nestedVfs = (
      nestedPdfMake as Record<string, unknown>
    ).vfs;

    if (isStringRecord(nestedVfs)) {
      return nestedVfs;
    }
  }

  if (isStringRecord(moduleRecord.vfs)) {
    return moduleRecord.vfs;
  }

  if (isStringRecord(value)) {
    return value;
  }

  return {};
}

function ensurePdfFonts() {
  if (fontsRegistered) return;

  const instance = pdfMake as PdfMakeWithVfs;
  const vfs = resolvePdfFontVfs(
    pdfFonts as unknown
  );

  if (instance.addVirtualFileSystem) {
    instance.addVirtualFileSystem(vfs);
  } else {
    instance.vfs = vfs;
  }

  fontsRegistered = true;
}

const DATE_LOCALES: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

const COPY: Record<
  AppLocale,
  {
    acceptedPackage: string;
    contractingParty: string;
    representative: string;
    representativeCapacity: string;
    acceptedAt: string;
    packageVersion: string;
    paymentDeadline: string;
    calendarDays: string;
    contractualTerms: string;
    noIndividualTerms: string;
    acceptanceDeclaration: string;
    evidence: string;
    evidenceHash: string;
    packageHash: string;
    documentVersion: string;
    issueDate: string;
    effectiveDate: string;
    contentHash: string;
    generatedNotice: string;
    page: string;
    of: string;
  }
> = {
  ro: {
    acceptedPackage: "Pachet contractual acceptat",
    contractingParty: "Parte contractantă",
    representative: "Persoana care a acceptat",
    representativeCapacity: "Calitate declarată",
    acceptedAt: "Data și ora acceptării",
    packageVersion: "Versiunea pachetului",
    paymentDeadline: "Termen de plată",
    calendarDays: "zile calendaristice de la emiterea facturii",
    contractualTerms: "Condiții comerciale contractuale",
    noIndividualTerms: "Nu au fost înregistrate condiții comerciale individuale.",
    acceptanceDeclaration: "Declarația de acceptare",
    evidence: "Dovada electronică",
    evidenceHash: "Hash dovadă acceptare",
    packageHash: "Hash manifest pachet",
    documentVersion: "Versiune document",
    issueDate: "Data emiterii",
    effectiveDate: "Data intrării în vigoare",
    contentHash: "Hash conținut",
    generatedNotice:
      "Acest PDF a fost generat din dovada electronică imuabilă păstrată de RomDoc. Conținutul documentelor este cel salvat la momentul acceptării.",
    page: "Pagina",
    of: "din",
  },
  en: {
    acceptedPackage: "Accepted contract package",
    contractingParty: "Contracting party",
    representative: "Person who accepted",
    representativeCapacity: "Declared capacity",
    acceptedAt: "Acceptance date and time",
    packageVersion: "Package version",
    paymentDeadline: "Payment deadline",
    calendarDays: "calendar days from the invoice issue date",
    contractualTerms: "Contractual commercial terms",
    noIndividualTerms: "No individual commercial terms were recorded.",
    acceptanceDeclaration: "Acceptance declaration",
    evidence: "Electronic evidence",
    evidenceHash: "Acceptance evidence hash",
    packageHash: "Package manifest hash",
    documentVersion: "Document version",
    issueDate: "Issue date",
    effectiveDate: "Effective date",
    contentHash: "Content hash",
    generatedNotice:
      "This PDF was generated from the immutable electronic evidence retained by RomDoc. The document content is the exact snapshot saved at acceptance time.",
    page: "Page",
    of: "of",
  },
  de: {
    acceptedPackage: "Angenommenes Vertragspaket",
    contractingParty: "Vertragspartei",
    representative: "Annehmende Person",
    representativeCapacity: "Erklärte Vertretungsbefugnis",
    acceptedAt: "Datum und Uhrzeit der Annahme",
    packageVersion: "Paketversion",
    paymentDeadline: "Zahlungsfrist",
    calendarDays: "Kalendertage ab Rechnungsdatum",
    contractualTerms: "Vertragliche Geschäftsbedingungen",
    noIndividualTerms: "Es wurden keine individuellen Geschäftsbedingungen erfasst.",
    acceptanceDeclaration: "Annahmeerklärung",
    evidence: "Elektronischer Nachweis",
    evidenceHash: "Hash des Annahmenachweises",
    packageHash: "Hash des Paketmanifests",
    documentVersion: "Dokumentversion",
    issueDate: "Ausgabedatum",
    effectiveDate: "Wirksamkeitsdatum",
    contentHash: "Inhalts-Hash",
    generatedNotice:
      "Dieses PDF wurde aus dem von RomDoc aufbewahrten unveränderlichen elektronischen Nachweis erzeugt. Der Dokumentinhalt entspricht dem bei der Annahme gespeicherten Stand.",
    page: "Seite",
    of: "von",
  },
};

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
    ndash: "-",
    mdash: "-",
    hellip: "...",
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&([a-z]+);/gi, (match, entity: string) =>
      named[entity.toLowerCase()] ?? match
    );
}

function htmlToPlainText(html: string) {
  const withoutUnsafeBlocks = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "");

  const withStructure = withoutUnsafeBlocks
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "\n• ")
    .replace(/<\s*\/\s*(p|div|section|article|header|footer|aside|blockquote|pre|h[1-6]|ul|ol|li|tr|table)\s*>/gi, "\n")
    .replace(/<\s*\/?\s*(td|th)\b[^>]*>/gi, "\t")
    .replace(/<[^>]+>/g, "");

  return decodeHtmlEntities(withStructure)
    .replace(/\r/g, "")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n[\t ]+/g, "\n")
    .replace(/[\t ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
    timeZone: "Europe/Bucharest",
  }).format(parsed);
}

function simpleValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

function termsTable(
  terms: Record<string, unknown>,
  locale: AppLocale
): Content {
  const copy = COPY[locale];
  const entries = Object.entries(terms).filter(([, value]) =>
    ["string", "number", "boolean"].includes(typeof value)
  );

  if (entries.length === 0) {
    return {
      text: copy.noIndividualTerms,
      style: "muted",
      margin: [0, 4, 0, 12],
    };
  }

  return {
    table: {
      widths: ["38%", "62%"],
      body: entries.map(([key, value]) => [
        {
          text: key.replaceAll("_", " "),
          style: "tableLabel",
        },
        {
          text: simpleValue(value),
          style: "tableValue",
        },
      ]),
    },
    layout: "lightHorizontalLines",
    margin: [0, 6, 0, 14],
  } satisfies ContentTable;
}

function buildDocumentSection(
  document: AcceptedDocumentSnapshot,
  index: number,
  locale: AppLocale
): Content[] {
  const copy = COPY[locale];
  const text = htmlToPlainText(document.contentHtml);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const content: Content[] = [
    {
      text: document.title,
      style: "documentTitle",
      pageBreak: index === 0 ? undefined : "before",
      margin: [0, 0, 0, 6],
    },
    {
      table: {
        widths: ["25%", "25%", "25%", "25%"],
        body: [
          [
            { text: copy.documentVersion, style: "metaLabel" },
            { text: document.version, style: "metaValue" },
            { text: copy.issueDate, style: "metaLabel" },
            { text: formatDate(document.issueDate, locale), style: "metaValue" },
          ],
          [
            { text: copy.effectiveDate, style: "metaLabel" },
            { text: formatDate(document.effectiveAt, locale), style: "metaValue" },
            { text: copy.contentHash, style: "metaLabel" },
            { text: document.contentHash, style: "hash" },
          ],
        ],
      },
      layout: {
        hLineColor: () => "#d1d5db",
        vLineColor: () => "#d1d5db",
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
      margin: [0, 0, 0, 14],
    },
  ];

  if (paragraphs.length === 0) {
    content.push({ text: "-", style: "body" });
  } else {
    for (const paragraph of paragraphs) {
      if (paragraph.startsWith("• ")) {
        const items = paragraph
          .split(/\n•\s*/)
          .map((item) => item.replace(/^•\s*/, "").trim())
          .filter(Boolean);

        content.push({
          ul: items,
          style: "body",
          margin: [8, 0, 0, 9],
        });
      } else {
        content.push({
          text: paragraph,
          style: "body",
          margin: [0, 0, 0, 9],
        });
      }
    }
  }

  return content;
}

function createDocumentDefinition(
  input: GenerateAcceptedContractPdfInput
): TDocumentDefinitions {
  const copy = COPY[input.locale];

  const content: Content[] = [
    {
      text: "RomDoc",
      style: "brand",
      margin: [0, 0, 0, 8],
    },
    {
      text: copy.acceptedPackage,
      style: "coverTitle",
      margin: [0, 0, 0, 8],
    },
    {
      text: input.packageTitle,
      style: "coverSubtitle",
      margin: [0, 0, 0, 18],
    },
    {
      table: {
        widths: ["38%", "62%"],
        body: [
          [copy.contractingParty, input.representedEntityName],
          [copy.representative, input.representativeName],
          [copy.representativeCapacity, input.representativeCapacity],
          [copy.acceptedAt, formatDate(input.acceptedAt, input.locale)],
          [copy.packageVersion, input.packageVersion],
          [
            copy.paymentDeadline,
            `${input.paymentDeadlineDays} ${copy.calendarDays}`,
          ],
        ].map(([label, value]) => [
          { text: label, style: "tableLabel" },
          { text: value, style: "tableValue" },
        ]),
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 18],
    },
    {
      text: copy.contractualTerms,
      style: "sectionTitle",
    },
    termsTable(input.commercialTerms, input.locale),
    {
      text: copy.acceptanceDeclaration,
      style: "sectionTitle",
    },
    {
      text: input.checkboxText,
      style: "declaration",
      margin: [0, 6, 0, 18],
    },
    {
      text: copy.evidence,
      style: "sectionTitle",
    },
    {
      table: {
        widths: ["30%", "70%"],
        body: [
          [
            { text: copy.evidenceHash, style: "tableLabel" },
            { text: input.acceptanceEvidenceHash, style: "hash" },
          ],
          [
            { text: copy.packageHash, style: "tableLabel" },
            { text: input.packageManifestHash, style: "hash" },
          ],
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 6, 0, 14],
    },
    {
      text: copy.generatedNotice,
      style: "notice",
      margin: [0, 0, 0, 6],
    },
  ];

  input.documents
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .forEach((document, index) => {
      content.push(...buildDocumentSection(document, index, input.locale));
    });

  return {
    info: {
      title: `${input.packageTitle} - ${input.representedEntityName}`,
      author: "RomDoc",
      subject: "Accepted RomDoc contract package",
      keywords: "RomDoc, contract, acceptance, annexes",
      creator: "RomDoc",
      producer: "RomDoc / pdfmake",
    },
    pageSize: "A4",
    pageMargins: [42, 55, 42, 55],
    content,
    defaultStyle: {
      font: "Roboto",
      fontSize: 9.5,
      color: "#1f2937",
      lineHeight: 1.25,
    },
    styles: {
      brand: {
        fontSize: 15,
        bold: true,
        color: "#036661",
      },
      coverTitle: {
        fontSize: 24,
        bold: true,
        color: "#111827",
      },
      coverSubtitle: {
        fontSize: 13,
        color: "#4b5563",
      },
      sectionTitle: {
        fontSize: 13,
        bold: true,
        color: "#111827",
        margin: [0, 8, 0, 4],
      },
      documentTitle: {
        fontSize: 18,
        bold: true,
        color: "#036661",
      },
      body: {
        fontSize: 9.5,
        color: "#1f2937",
        lineHeight: 1.3,
      },
      declaration: {
        fontSize: 10,
        italics: true,
        color: "#374151",
      },
      tableLabel: {
        bold: true,
        color: "#374151",
        fontSize: 8.5,
      },
      tableValue: {
        color: "#111827",
        fontSize: 9,
      },
      metaLabel: {
        bold: true,
        color: "#4b5563",
        fontSize: 7.5,
      },
      metaValue: {
        color: "#111827",
        fontSize: 7.5,
      },
      hash: {
        fontSize: 6.5,
        color: "#4b5563",
      },
      muted: {
        color: "#6b7280",
        italics: true,
      },
      notice: {
        fontSize: 8,
        color: "#6b7280",
        italics: true,
      },
    },
    header: {
      columns: [
        { text: "RomDoc", color: "#036661", bold: true },
        {
          text: `v${input.packageVersion}`,
          alignment: "right",
          color: "#6b7280",
          fontSize: 8,
        },
      ],
      margin: [42, 22, 42, 0],
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: input.acceptanceEvidenceHash.slice(0, 24),
          color: "#9ca3af",
          fontSize: 6.5,
        },
        {
          text: `${copy.page} ${currentPage} ${copy.of} ${pageCount}`,
          alignment: "right",
          color: "#6b7280",
          fontSize: 8,
        },
      ],
      margin: [42, 0, 42, 22],
    }),
  };
}

export async function generateAcceptedContractPdf(
  input: GenerateAcceptedContractPdfInput
): Promise<Buffer> {
  ensurePdfFonts();
  const definition = createDocumentDefinition(input);

  return new Promise<Buffer>((resolve, reject) => {
    try {
      pdfMake.createPdf(definition).getBuffer((value) => {
        resolve(Buffer.from(value));
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function sha256Buffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
