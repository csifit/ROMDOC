import ExcelJS from "exceljs";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

import type { AppLocale } from "@/lib/i18n/app-locale";

export type ClinicManagerOperationalReport = {
  organization: {
    id: string;
    name: string;
  };
  period: {
    month: string;
    startDate: string;
    endDate: string;
    isCurrentMonth: boolean;
  };
  selectedFilters: {
    clinicId: string | null;
    doctorId: string | null;
  };
  filterOptions: {
    clinics: Array<{ id: string; name: string }>;
    doctors: Array<{ id: string; name: string }>;
  };
  summary: {
    total: number;
    pending: number;
    confirmed: number;
    rescheduled: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
  };
  costSummary: {
    subscriptionCount: number;
    subscriptionPlan: "monthly" | "annual";
    configuredSubscriptionPriceNet: number;
    subscriptionUnitPriceNet: number;
    subscriptionNet: number;
    smsSent: number;
    smsUnitPriceNet: number;
    smsNet: number;
    totalNet: number;
    completedAppointments: number;
    costPerCompletedAppointment: number;
    currency: "RON" | "EUR";
    pricingSource: "global" | "organization";
    amountsAreNet: boolean;
  };
  timeline: Array<{
    date: string;
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  bySource: Array<{
    source: string;
    count: number;
  }>;
  byClinic: Array<{
    clinicId: string | null;
    clinicName: string | null;
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }>;
  byDoctor: Array<{
    doctorId: string;
    doctorName: string;
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }>;
  costsByDoctor: Array<{
    doctorId: string;
    doctorName: string;
    clinicNames: string[];
    subscriptionPlan: "monthly" | "annual" | null;
    subscriptionNet: number;
    smsSent: number;
    smsNet: number;
    totalNet: number;
    completedAppointments: number;
    costPerCompletedAppointment: number;
    currency: "RON" | "EUR";
  }>;
  noticeCode: string;
};

type ExportCopy = {
  reportTitle: string;
  summarySheet: string;
  doctorsSheet: string;
  locationsSheet: string;
  dailySheet: string;
  breakdownsSheet: string;
  organization: string;
  period: string;
  generatedAt: string;
  filters: string;
  allLocations: string;
  allDoctors: string;
  location: string;
  doctor: string;
  appointments: string;
  costs: string;
  totalAppointments: string;
  pending: string;
  confirmed: string;
  rescheduled: string;
  upcoming: string;
  completed: string;
  cancelled: string;
  noShow: string;
  completionRate: string;
  cancellationRate: string;
  noShowRate: string;
  coveredDoctors: string;
  subscriptionPlan: string;
  monthly: string;
  annual: string;
  subscriptionNet: string;
  smsSent: string;
  smsNet: string;
  totalNet: string;
  costPerCompleted: string;
  currency: string;
  date: string;
  status: string;
  source: string;
  count: string;
  total: string;
  netNotice: string;
  unspecifiedLocation: string;
  page: string;
  of: string;
  statuses: Record<string, string>;
  sources: Record<string, string>;
};

const COPY: Record<AppLocale, ExportCopy> = {
  ro: {
    reportTitle: "Raport operațional RomDoc",
    summarySheet: "Sumar",
    doctorsSheet: "Medici",
    locationsSheet: "Locații",
    dailySheet: "Activitate zilnică",
    breakdownsSheet: "Distribuții",
    organization: "Organizație",
    period: "Perioadă",
    generatedAt: "Generat la",
    filters: "Filtre",
    allLocations: "Toate locațiile",
    allDoctors: "Toți medicii",
    location: "Locație",
    doctor: "Medic",
    appointments: "Programări",
    costs: "Costuri nete",
    totalAppointments: "Total programări",
    pending: "În așteptare",
    confirmed: "Confirmate",
    rescheduled: "Reprogramate",
    upcoming: "Viitoare",
    completed: "Finalizate",
    cancelled: "Anulate",
    noShow: "Neprezentări",
    completionRate: "Rată finalizare",
    cancellationRate: "Rată anulare",
    noShowRate: "Rată neprezentare",
    coveredDoctors: "Medici acoperiți",
    subscriptionPlan: "Plan abonament",
    monthly: "Lunar",
    annual: "Anual",
    subscriptionNet: "Abonament net",
    smsSent: "SMS trimise",
    smsNet: "SMS net",
    totalNet: "Total net",
    costPerCompleted: "Cost / programare finalizată",
    currency: "Monedă",
    date: "Dată",
    status: "Status",
    source: "Sursă",
    count: "Număr",
    total: "Total",
    netNotice:
      "Toate sumele afișate sunt nete. TVA va fi calculată în momentul facturării.",
    unspecifiedLocation: "Locație nespecificată",
    page: "Pagina",
    of: "din",
    statuses: {
      pending: "În așteptare",
      confirmed: "Confirmate",
      rescheduled: "Reprogramate",
      completed: "Finalizate",
      cancelled: "Anulate",
      no_show: "Neprezentări",
    },
    sources: {
      online: "Online",
      phone: "Telefon",
      walk_in: "Direct la clinică",
      email: "E-mail",
      other: "Altă sursă",
    },
  },
  en: {
    reportTitle: "RomDoc operational report",
    summarySheet: "Summary",
    doctorsSheet: "Doctors",
    locationsSheet: "Locations",
    dailySheet: "Daily activity",
    breakdownsSheet: "Breakdowns",
    organization: "Organisation",
    period: "Period",
    generatedAt: "Generated at",
    filters: "Filters",
    allLocations: "All locations",
    allDoctors: "All Doctors",
    location: "Location",
    doctor: "Doctor",
    appointments: "Appointments",
    costs: "Net costs",
    totalAppointments: "Total appointments",
    pending: "Pending",
    confirmed: "Confirmed",
    rescheduled: "Rescheduled",
    upcoming: "Upcoming",
    completed: "Completed",
    cancelled: "Cancelled",
    noShow: "No-shows",
    completionRate: "Completion rate",
    cancellationRate: "Cancellation rate",
    noShowRate: "No-show rate",
    coveredDoctors: "Covered Doctors",
    subscriptionPlan: "Subscription plan",
    monthly: "Monthly",
    annual: "Annual",
    subscriptionNet: "Subscription net",
    smsSent: "SMS sent",
    smsNet: "SMS net",
    totalNet: "Total net",
    costPerCompleted: "Cost / completed appointment",
    currency: "Currency",
    date: "Date",
    status: "Status",
    source: "Source",
    count: "Count",
    total: "Total",
    netNotice:
      "All amounts shown are net. VAT will be calculated during invoicing.",
    unspecifiedLocation: "Unspecified location",
    page: "Page",
    of: "of",
    statuses: {
      pending: "Pending",
      confirmed: "Confirmed",
      rescheduled: "Rescheduled",
      completed: "Completed",
      cancelled: "Cancelled",
      no_show: "No-shows",
    },
    sources: {
      online: "Online",
      phone: "Phone",
      walk_in: "Walk-in",
      email: "Email",
      other: "Other source",
    },
  },
  de: {
    reportTitle: "RomDoc Betriebsbericht",
    summarySheet: "Zusammenfassung",
    doctorsSheet: "Ärzte",
    locationsSheet: "Standorte",
    dailySheet: "Tägliche Aktivität",
    breakdownsSheet: "Verteilungen",
    organization: "Organisation",
    period: "Zeitraum",
    generatedAt: "Erstellt am",
    filters: "Filter",
    allLocations: "Alle Standorte",
    allDoctors: "Alle Ärzte",
    location: "Standort",
    doctor: "Arzt",
    appointments: "Termine",
    costs: "Nettokosten",
    totalAppointments: "Termine insgesamt",
    pending: "Ausstehend",
    confirmed: "Bestätigt",
    rescheduled: "Verschoben",
    upcoming: "Bevorstehend",
    completed: "Abgeschlossen",
    cancelled: "Abgesagt",
    noShow: "Nicht erschienen",
    completionRate: "Abschlussquote",
    cancellationRate: "Stornoquote",
    noShowRate: "Nichterscheinensquote",
    coveredDoctors: "Abgedeckte Ärzte",
    subscriptionPlan: "Abonnementplan",
    monthly: "Monatlich",
    annual: "Jährlich",
    subscriptionNet: "Abonnement netto",
    smsSent: "SMS gesendet",
    smsNet: "SMS netto",
    totalNet: "Netto gesamt",
    costPerCompleted: "Kosten / abgeschlossener Termin",
    currency: "Währung",
    date: "Datum",
    status: "Status",
    source: "Quelle",
    count: "Anzahl",
    total: "Gesamt",
    netNotice:
      "Alle angezeigten Beträge sind Nettobeträge. Die Mehrwertsteuer wird bei der Rechnungsstellung berechnet.",
    unspecifiedLocation: "Nicht angegebener Standort",
    page: "Seite",
    of: "von",
    statuses: {
      pending: "Ausstehend",
      confirmed: "Bestätigt",
      rescheduled: "Verschoben",
      completed: "Abgeschlossen",
      cancelled: "Abgesagt",
      no_show: "Nicht erschienen",
    },
    sources: {
      online: "Online",
      phone: "Telefon",
      walk_in: "Vor Ort",
      email: "E-Mail",
      other: "Andere Quelle",
    },
  },
};

const INTL_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

const BRAND = "FF036661";
const ACCENT = "FF9A4F35";
const BORDER = "FFE5E7EB";
const MUTED = "FF6B7280";

function formatMonth(month: string, locale: AppLocale) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 15)));
}

function formatDate(value: string, locale: AppLocale) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateTime(value: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  }).format(value);
}

function formatPercent(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0) / 100);
}

function formatMoney(
  value: number,
  locale: AppLocale,
  currency: "RON" | "EUR"
) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function selectedFilterNames(report: ClinicManagerOperationalReport) {
  const clinicName = report.selectedFilters.clinicId
    ? report.filterOptions.clinics.find(
        (clinic) => clinic.id === report.selectedFilters.clinicId
      )?.name ?? null
    : null;
  const doctorName = report.selectedFilters.doctorId
    ? report.filterOptions.doctors.find(
        (doctor) => doctor.id === report.selectedFilters.doctorId
      )?.name ?? null
    : null;

  return { clinicName, doctorName };
}

function planLabel(
  plan: "monthly" | "annual" | null,
  copy: ExportCopy
) {
  if (plan === "annual") return copy.annual;
  if (plan === "monthly") return copy.monthly;
  return "-";
}

function styleTitleRow(
  worksheet: ExcelJS.Worksheet,
  lastColumn: string,
  title: string
) {
  worksheet.mergeCells(`A1:${lastColumn}1`);
  const cell = worksheet.getCell("A1");
  cell.value = title;
  cell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
  cell.alignment = { vertical: "middle" };
  worksheet.getRow(1).height = 28;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 30;
}

function styleDataRows(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow = worksheet.rowCount
) {
  for (let index = startRow; index <= endRow; index += 1) {
    const row = worksheet.getRow(index);
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: BORDER } },
      };
    });
  }
}

function addMetadataRows(
  worksheet: ExcelJS.Worksheet,
  report: ClinicManagerOperationalReport,
  locale: AppLocale,
  copy: ExportCopy,
  lastColumn: string
) {
  const filters = selectedFilterNames(report);
  const filterText = `${copy.location}: ${
    filters.clinicName ?? copy.allLocations
  } | ${copy.doctor}: ${filters.doctorName ?? copy.allDoctors}`;

  worksheet.mergeCells(`A2:${lastColumn}2`);
  worksheet.getCell("A2").value = `${copy.organization}: ${
    report.organization.name
  } | ${copy.period}: ${formatMonth(report.period.month, locale)} (${
    report.period.startDate
  } - ${report.period.endDate})`;
  worksheet.getCell("A2").font = { color: { argb: "FF374151" } };

  worksheet.mergeCells(`A3:${lastColumn}3`);
  worksheet.getCell("A3").value = `${copy.filters}: ${filterText}`;
  worksheet.getCell("A3").font = { color: { argb: MUTED }, italic: true };

  worksheet.mergeCells(`A4:${lastColumn}4`);
  worksheet.getCell("A4").value = `${copy.generatedAt}: ${formatDateTime(
    new Date(),
    locale
  )}`;
  worksheet.getCell("A4").font = { color: { argb: MUTED } };
}

function buildDoctorRows(report: ClinicManagerOperationalReport) {
  const activityByDoctor = new Map(
    report.byDoctor.map((row) => [row.doctorId, row])
  );
  const costsByDoctor = new Map(
    report.costsByDoctor.map((row) => [row.doctorId, row])
  );
  const doctorIds = new Set([
    ...report.byDoctor.map((row) => row.doctorId),
    ...report.costsByDoctor.map((row) => row.doctorId),
  ]);

  return Array.from(doctorIds)
    .map((doctorId) => {
      const activity = activityByDoctor.get(doctorId);
      const cost = costsByDoctor.get(doctorId);
      return {
        doctorId,
        doctorName: cost?.doctorName ?? activity?.doctorName ?? doctorId,
        clinicNames: cost?.clinicNames ?? [],
        subscriptionPlan: cost?.subscriptionPlan ?? null,
        total: activity?.total ?? 0,
        completed: activity?.completed ?? cost?.completedAppointments ?? 0,
        cancelled: activity?.cancelled ?? 0,
        noShow: activity?.noShow ?? 0,
        subscriptionNet: cost?.subscriptionNet ?? 0,
        smsSent: cost?.smsSent ?? 0,
        smsNet: cost?.smsNet ?? 0,
        totalNet: cost?.totalNet ?? 0,
        costPerCompletedAppointment:
          cost?.costPerCompletedAppointment ?? 0,
        currency: cost?.currency ?? report.costSummary.currency,
      };
    })
    .sort((first, second) =>
      first.doctorName.localeCompare(second.doctorName, "ro")
    );
}

export async function buildClinicManagerReportXlsx({
  report,
  locale,
}: {
  report: ClinicManagerOperationalReport;
  locale: AppLocale;
}) {
  const copy = COPY[locale];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RomDoc";
  workbook.company = "RomDoc";
  workbook.subject = `${copy.reportTitle} ${report.period.month}`;
  workbook.title = `${copy.reportTitle} - ${report.organization.name}`;
  workbook.created = new Date();

  const summary = workbook.addWorksheet(copy.summarySheet, {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  styleTitleRow(
    summary,
    "F",
    `${copy.reportTitle} - ${formatMonth(report.period.month, locale)}`
  );
  addMetadataRows(summary, report, locale, copy, "F");

  summary.getCell("A6").value = copy.appointments;
  summary.getCell("A6").font = { bold: true, size: 13, color: { argb: BRAND } };
  summary.getCell("D6").value = copy.costs;
  summary.getCell("D6").font = { bold: true, size: 13, color: { argb: BRAND } };

  const appointmentMetrics: Array<[string, string | number]> = [
    [copy.totalAppointments, report.summary.total],
    [copy.pending, report.summary.pending],
    [copy.confirmed, report.summary.confirmed],
    [copy.rescheduled, report.summary.rescheduled],
    [copy.upcoming, report.summary.upcoming],
    [copy.completed, report.summary.completed],
    [copy.cancelled, report.summary.cancelled],
    [copy.noShow, report.summary.noShow],
    [copy.completionRate, formatPercent(report.summary.completionRate, locale)],
    [
      copy.cancellationRate,
      formatPercent(report.summary.cancellationRate, locale),
    ],
    [copy.noShowRate, formatPercent(report.summary.noShowRate, locale)],
  ];

  const costMetrics: Array<[string, string | number]> = [
    [copy.coveredDoctors, report.costSummary.subscriptionCount],
    [
      copy.subscriptionPlan,
      planLabel(report.costSummary.subscriptionPlan, copy),
    ],
    [copy.subscriptionNet, report.costSummary.subscriptionNet],
    [copy.smsSent, report.costSummary.smsSent],
    [copy.smsNet, report.costSummary.smsNet],
    [copy.totalNet, report.costSummary.totalNet],
    [
      copy.costPerCompleted,
      report.costSummary.costPerCompletedAppointment,
    ],
    [copy.currency, report.costSummary.currency],
  ];

  appointmentMetrics.forEach(([label, value], index) => {
    const row = 7 + index;
    summary.getCell(row, 1).value = label;
    summary.getCell(row, 2).value = value;
    summary.getCell(row, 1).font = { bold: true, color: { argb: "FF374151" } };
  });

  costMetrics.forEach(([label, value], index) => {
    const row = 7 + index;
    summary.getCell(row, 4).value = label;
    summary.getCell(row, 5).value = value;
    summary.getCell(row, 4).font = { bold: true, color: { argb: "FF374151" } };
  });

  for (const row of [9, 11, 12, 13]) {
    summary.getCell(row, 5).numFmt = "#,##0.00";
  }

  const noticeRow = Math.max(19, 8 + appointmentMetrics.length);
  summary.mergeCells(`A${noticeRow}:F${noticeRow}`);
  summary.getCell(`A${noticeRow}`).value = copy.netNotice;
  summary.getCell(`A${noticeRow}`).font = {
    italic: true,
    color: { argb: "FF1E3A5F" },
  };
  summary.getCell(`A${noticeRow}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFF6FF" },
  };
  summary.getCell(`A${noticeRow}`).alignment = { wrapText: true };
  summary.getRow(noticeRow).height = 32;
  summary.columns = [
    { width: 31 },
    { width: 18 },
    { width: 4 },
    { width: 31 },
    { width: 20 },
    { width: 4 },
  ];

  const doctors = workbook.addWorksheet(copy.doctorsSheet, {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  styleTitleRow(doctors, "M", copy.doctorsSheet);
  addMetadataRows(doctors, report, locale, copy, "M");
  doctors.addRow([
    copy.doctor,
    copy.location,
    copy.subscriptionPlan,
    copy.totalAppointments,
    copy.completed,
    copy.cancelled,
    copy.noShow,
    copy.subscriptionNet,
    copy.smsSent,
    copy.smsNet,
    copy.totalNet,
    copy.costPerCompleted,
    copy.currency,
  ]);
  styleHeaderRow(doctors.getRow(5));

  for (const row of buildDoctorRows(report)) {
    const excelRow = doctors.addRow([
      row.doctorName,
      row.clinicNames.length > 0
        ? row.clinicNames.join(", ")
        : copy.unspecifiedLocation,
      planLabel(row.subscriptionPlan, copy),
      row.total,
      row.completed,
      row.cancelled,
      row.noShow,
      row.subscriptionNet,
      row.smsSent,
      row.smsNet,
      row.totalNet,
      row.costPerCompletedAppointment,
      row.currency,
    ]);
    for (const column of [8, 10, 11, 12]) {
      excelRow.getCell(column).numFmt = "#,##0.00";
    }
  }
  doctors.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: Math.max(5, doctors.rowCount), column: 13 },
  };
  styleDataRows(doctors, 6);
  [28, 36, 18, 18, 14, 14, 14, 18, 14, 16, 16, 24, 12].forEach(
    (width, index) => {
      doctors.getColumn(index + 1).width = width;
    }
  );

  const locations = workbook.addWorksheet(copy.locationsSheet, {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  styleTitleRow(locations, "E", copy.locationsSheet);
  addMetadataRows(locations, report, locale, copy, "E");
  locations.addRow([
    copy.location,
    copy.totalAppointments,
    copy.completed,
    copy.cancelled,
    copy.noShow,
  ]);
  styleHeaderRow(locations.getRow(5));
  for (const row of report.byClinic) {
    locations.addRow([
      row.clinicName ?? copy.unspecifiedLocation,
      row.total,
      row.completed,
      row.cancelled,
      row.noShow,
    ]);
  }
  locations.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: Math.max(5, locations.rowCount), column: 5 },
  };
  styleDataRows(locations, 6);
  locations.columns = [
    { width: 42 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ];

  const daily = workbook.addWorksheet(copy.dailySheet, {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  styleTitleRow(daily, "E", copy.dailySheet);
  addMetadataRows(daily, report, locale, copy, "E");
  daily.addRow([
    copy.date,
    copy.totalAppointments,
    copy.completed,
    copy.cancelled,
    copy.noShow,
  ]);
  styleHeaderRow(daily.getRow(5));
  for (const row of report.timeline) {
    daily.addRow([
      formatDate(row.date, locale),
      row.total,
      row.completed,
      row.cancelled,
      row.noShow,
    ]);
  }
  styleDataRows(daily, 6);
  daily.columns = [
    { width: 22 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ];

  const breakdowns = workbook.addWorksheet(copy.breakdownsSheet, {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  styleTitleRow(breakdowns, "E", copy.breakdownsSheet);
  addMetadataRows(breakdowns, report, locale, copy, "E");
  breakdowns.getCell("A5").value = copy.status;
  breakdowns.getCell("B5").value = copy.count;
  breakdowns.getCell("D5").value = copy.source;
  breakdowns.getCell("E5").value = copy.count;
  for (const cell of ["A5", "B5", "D5", "E5"]) {
    breakdowns.getCell(cell).font = { bold: true, color: { argb: "FFFFFFFF" } };
    breakdowns.getCell(cell).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: ACCENT },
    };
  }
  const maximumRows = Math.max(report.byStatus.length, report.bySource.length);
  for (let index = 0; index < maximumRows; index += 1) {
    const rowNumber = 6 + index;
    const status = report.byStatus[index];
    const source = report.bySource[index];
    if (status) {
      breakdowns.getCell(rowNumber, 1).value =
        copy.statuses[status.status] ?? status.status;
      breakdowns.getCell(rowNumber, 2).value = status.count;
    }
    if (source) {
      breakdowns.getCell(rowNumber, 4).value =
        copy.sources[source.source] ?? source.source;
      breakdowns.getCell(rowNumber, 5).value = source.count;
    }
  }
  styleDataRows(breakdowns, 6);
  breakdowns.columns = [
    { width: 28 },
    { width: 14 },
    { width: 4 },
    { width: 28 },
    { width: 14 },
  ];

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

type PdfMakeWithVirtualFileSystem = typeof pdfMake & {
  addVirtualFileSystem: (virtualFileSystem: unknown) => void;
};

const pdfMakeWithVirtualFileSystem = pdfMake as PdfMakeWithVirtualFileSystem;
pdfMakeWithVirtualFileSystem.addVirtualFileSystem(pdfFonts);

function createPdfBuffer(definition: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(definition).getBuffer((buffer) => {
        resolve(Buffer.from(buffer));
      });
    } catch (error) {
      reject(error);
    }
  });
}

function metricCell(label: string, value: string | number): Content {
  return {
    stack: [
      { text: label, fontSize: 7.5, color: "#6B7280", bold: true },
      { text: String(value), fontSize: 13, color: "#111827", bold: true },
    ],
    margin: [7, 6, 7, 6],
  };
}

function tableHeader(text: string): Content {
  return {
    text,
    bold: true,
    color: "#FFFFFF",
    fillColor: "#9A4F35",
    margin: [3, 3, 3, 3],
  };
}

function sectionTitle(text: string): Content {
  return {
    text,
    style: "section",
  };
}

export async function buildClinicManagerReportPdf({
  report,
  locale,
}: {
  report: ClinicManagerOperationalReport;
  locale: AppLocale;
}) {
  const copy = COPY[locale];
  const filters = selectedFilterNames(report);
  const currency = report.costSummary.currency;
  const doctorRows = buildDoctorRows(report);

  const content: Content[] = [
    { text: "RomDoc", style: "brand" },
    {
      text: copy.reportTitle,
      style: "title",
    },
    {
      text: `${copy.organization}: ${report.organization.name}`,
      style: "subtitle",
    },
    {
      text: `${copy.period}: ${formatMonth(report.period.month, locale)} (${
        report.period.startDate
      } - ${report.period.endDate})`,
      style: "subtitle",
    },
    {
      text: `${copy.filters}: ${copy.location}: ${
        filters.clinicName ?? copy.allLocations
      } | ${copy.doctor}: ${filters.doctorName ?? copy.allDoctors}`,
      style: "subtitle",
    },
    {
      text: `${copy.generatedAt}: ${formatDateTime(new Date(), locale)}`,
      style: "subtitle",
    },
    sectionTitle(copy.appointments),
    {
      table: {
        widths: ["*", "*", "*", "*", "*", "*"],
        body: [
          [
            metricCell(copy.totalAppointments, report.summary.total),
            metricCell(copy.pending, report.summary.pending),
            metricCell(copy.upcoming, report.summary.upcoming),
            metricCell(copy.completed, report.summary.completed),
            metricCell(copy.cancelled, report.summary.cancelled),
            metricCell(copy.noShow, report.summary.noShow),
          ],
        ],
      },
      layout: {
        hLineColor: () => "#E5E7EB",
        vLineColor: () => "#E5E7EB",
      },
    },
    {
      margin: [0, 7, 0, 0],
      table: {
        widths: ["*", "*", "*"],
        body: [
          [
            metricCell(
              copy.completionRate,
              formatPercent(report.summary.completionRate, locale)
            ),
            metricCell(
              copy.cancellationRate,
              formatPercent(report.summary.cancellationRate, locale)
            ),
            metricCell(
              copy.noShowRate,
              formatPercent(report.summary.noShowRate, locale)
            ),
          ],
        ],
      },
      layout: {
        hLineColor: () => "#E5E7EB",
        vLineColor: () => "#E5E7EB",
      },
    },
    sectionTitle(copy.costs),
    {
      table: {
        widths: ["*", "*", "*", "*"],
        body: [
          [
            metricCell(
              copy.subscriptionNet,
              formatMoney(report.costSummary.subscriptionNet, locale, currency)
            ),
            metricCell(
              copy.smsNet,
              formatMoney(report.costSummary.smsNet, locale, currency)
            ),
            metricCell(
              copy.totalNet,
              formatMoney(report.costSummary.totalNet, locale, currency)
            ),
            metricCell(
              copy.costPerCompleted,
              formatMoney(
                report.costSummary.costPerCompletedAppointment,
                locale,
                currency
              )
            ),
          ],
        ],
      },
      layout: {
        hLineColor: () => "#E5E7EB",
        vLineColor: () => "#E5E7EB",
      },
    },
    {
      text: `${report.costSummary.subscriptionCount} ${copy.coveredDoctors} | ${report.costSummary.smsSent} ${copy.smsSent} | ${copy.currency}: ${currency}`,
      margin: [0, 7, 0, 0],
      fontSize: 8.5,
      color: "#4B5563",
    },
    {
      text: copy.netNotice,
      margin: [0, 8, 0, 0],
      color: "#1E3A5F",
      fillColor: "#EFF6FF",
      fontSize: 8.5,
    },
  ];

  if (doctorRows.length > 0) {
    content.push(
      sectionTitle(copy.doctorsSheet),
      {
        table: {
          headerRows: 1,
          widths: [85, 100, 42, 40, 44, 57, 42, 57, 64],
          body: [
            [
              tableHeader(copy.doctor),
              tableHeader(copy.location),
              tableHeader(copy.subscriptionPlan),
              tableHeader(copy.total),
              tableHeader(copy.completed),
              tableHeader(copy.subscriptionNet),
              tableHeader(copy.smsSent),
              tableHeader(copy.totalNet),
              tableHeader(copy.costPerCompleted),
            ],
            ...doctorRows.map((row) => [
              row.doctorName,
              row.clinicNames.length > 0
                ? row.clinicNames.join(", ")
                : copy.unspecifiedLocation,
              planLabel(row.subscriptionPlan, copy),
              String(row.total),
              String(row.completed),
              formatMoney(row.subscriptionNet, locale, row.currency),
              String(row.smsSent),
              formatMoney(row.totalNet, locale, row.currency),
              formatMoney(
                row.costPerCompletedAppointment,
                locale,
                row.currency
              ),
            ]),
          ],
        },
        layout: "lightHorizontalLines",
        fontSize: 7.2,
      }
    );
  }

  content.push(
    sectionTitle(copy.locationsSheet),
    {
      table: {
        headerRows: 1,
        widths: ["*", 58, 58, 58, 62],
        body: [
          [
            tableHeader(copy.location),
            tableHeader(copy.total),
            tableHeader(copy.completed),
            tableHeader(copy.cancelled),
            tableHeader(copy.noShow),
          ],
          ...report.byClinic.map((row) => [
            row.clinicName ?? copy.unspecifiedLocation,
            String(row.total),
            String(row.completed),
            String(row.cancelled),
            String(row.noShow),
          ]),
        ],
      },
      layout: "lightHorizontalLines",
      fontSize: 8,
    },
    sectionTitle(copy.breakdownsSheet),
    {
      columns: [
        {
          width: "*",
          table: {
            headerRows: 1,
            widths: ["*", 58],
            body: [
              [tableHeader(copy.status), tableHeader(copy.count)],
              ...report.byStatus.map((row) => [
                copy.statuses[row.status] ?? row.status,
                String(row.count),
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        },
        {
          width: "*",
          table: {
            headerRows: 1,
            widths: ["*", 58],
            body: [
              [tableHeader(copy.source), tableHeader(copy.count)],
              ...report.bySource.map((row) => [
                copy.sources[row.source] ?? row.source,
                String(row.count),
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
      columnGap: 16,
      fontSize: 8,
    },
    sectionTitle(copy.dailySheet),
    {
      table: {
        headerRows: 1,
        widths: [90, 70, 70, 70, 75],
        body: [
          [
            tableHeader(copy.date),
            tableHeader(copy.total),
            tableHeader(copy.completed),
            tableHeader(copy.cancelled),
            tableHeader(copy.noShow),
          ],
          ...report.timeline.map((row) => [
            formatDate(row.date, locale),
            String(row.total),
            String(row.completed),
            String(row.cancelled),
            String(row.noShow),
          ]),
        ],
      },
      layout: "lightHorizontalLines",
      fontSize: 8,
    }
  );

  const definition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [30, 30, 30, 34],
    defaultStyle: {
      font: "Roboto",
      fontSize: 8.5,
      lineHeight: 1.25,
      color: "#1F2937",
    },
    content,
    styles: {
      brand: {
        fontSize: 13,
        bold: true,
        color: "#036661",
      },
      title: {
        margin: [0, 5, 0, 2],
        fontSize: 20,
        bold: true,
        color: "#111827",
      },
      subtitle: {
        margin: [0, 2, 0, 0],
        fontSize: 8,
        color: "#6B7280",
      },
      section: {
        margin: [0, 14, 0, 6],
        fontSize: 11,
        bold: true,
        color: "#036661",
      },
    },
    footer: (currentPage, pageCount) => ({
      text: `${copy.page} ${currentPage} ${copy.of} ${pageCount}`,
      alignment: "center",
      fontSize: 7,
      color: "#6B7280",
      margin: [0, 8, 0, 0],
    }),
    info: {
      title: `${copy.reportTitle} - ${report.organization.name}`,
      author: "RomDoc",
      subject: `${copy.reportTitle} ${report.period.month}`,
      creator: "RomDoc",
    },
  };

  return createPdfBuffer(definition);
}
