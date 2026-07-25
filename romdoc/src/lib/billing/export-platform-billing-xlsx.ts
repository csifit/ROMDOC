import ExcelJS from "exceljs";

import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  formatPlatformBillingMonth,
  type PlatformBillingCurrency,
  type PlatformInvoicingData,
} from "@/lib/billing/platform-invoicing";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";
import { getPlatformOperatorBillingHistory } from "@/lib/i18n/platform-operator-billing-history";

function totalByCurrency(data: PlatformInvoicingData) {
  const totals = new Map<
    PlatformBillingCurrency,
    { subtotal: number; vat: number; total: number; clients: number }
  >();

  for (const row of data.rows) {
    const currency = row.invoiceRecord?.currency ?? row.currency;
    const current = totals.get(currency) ?? {
      subtotal: 0,
      vat: 0,
      total: 0,
      clients: 0,
    };
    current.subtotal += row.subtotal;
    current.vat += row.vatAmount;
    current.total += row.invoiceRecord?.amount ?? row.total;
    current.clients += 1;
    totals.set(currency, current);
  }

  return totals;
}

export async function buildPlatformBillingUsageXlsx({
  data,
  locale,
}: {
  data: PlatformInvoicingData;
  locale: AppLocale;
}) {
  const copy = getPlatformOperatorBillingHistory(locale);
  const oldCopy = getPlatformOperatorBilling(locale);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RomDoc";
  workbook.company = "RomDoc";
  workbook.subject = `Billing usage ${data.range.month}`;
  workbook.title = `${copy.history.title} — ${formatPlatformBillingMonth(
    data.range.month,
    locale
  )}`;
  workbook.created = new Date();

  const usage = workbook.addWorksheet(copy.xlsx.usageSheet, {
    views: [{ state: "frozen", ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  usage.mergeCells("A1:Z1");
  usage.getCell("A1").value = `${copy.history.title} — ${formatPlatformBillingMonth(
    data.range.month,
    locale
  )}`;
  usage.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FFFFFFFF" },
  };
  usage.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF036661" },
  };
  usage.getCell("A1").alignment = { vertical: "middle" };
  usage.getRow(1).height = 28;

  usage.mergeCells("A2:Z2");
  usage.getCell("A2").value = copy.history.liveCalculation;
  usage.getCell("A2").font = { italic: true, color: { argb: "FF4B5563" } };
  usage.getCell("A2").alignment = { wrapText: true };

  const headers = [
    oldCopy.amounts.clientType,
    oldCopy.amounts.client,
    copy.history.invoiceTo,
    oldCopy.amounts.invoiceDetails.taxId,
    copy.xlsx.tradeRegister,
    oldCopy.amounts.invoiceDetails.vatNumber,
    copy.xlsx.billingEmail,
    oldCopy.amounts.invoiceDetails.address,
    copy.xlsx.country,
    copy.xlsx.currency,
    oldCopy.amounts.subscriptions,
    copy.history.subscriptionPrice,
    copy.xlsx.subscriptionAmount,
    oldCopy.amounts.confirmationSms,
    oldCopy.amounts.reminderSms,
    copy.history.otherSms,
    oldCopy.amounts.smsSent,
    copy.history.smsPrice,
    copy.xlsx.smsAmount,
    copy.history.subtotal,
    copy.xlsx.vatPercent,
    copy.history.vatTreatment,
    copy.history.vatReason,
    copy.history.vat,
    copy.history.total,
    copy.xlsx.status,
  ];

  usage.addRow(headers);
  const headerRow = usage.getRow(3);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF9A4F35" },
  };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  headerRow.height = 34;

  for (const row of data.rows) {
    const invoice = row.invoiceRecord;
    const status = invoice
      ? invoice.status === "paid"
        ? copy.history.paidBadge
        : copy.history.invoicedBadge
      : copy.history.readyBadge;

    usage.addRow([
      row.clientType === "independent_doctor"
        ? oldCopy.amounts.independentDoctor
        : oldCopy.amounts.clinicOrganization,
      row.clientName,
      row.billingDetails?.legalName ?? row.clientName,
      row.billingDetails?.taxId ?? null,
      row.billingDetails?.tradeRegisterNumber ?? null,
      row.billingDetails?.vatNumber ?? null,
      row.billingDetails?.billingEmail ?? null,
      row.billingDetails?.billingAddress ?? null,
      row.billingDetails?.country ?? null,
      row.currency,
      row.subscriptionCount,
      row.subscriptionUnitPrice,
      row.subscriptionAmount,
      row.confirmationSmsCount,
      row.reminder24hSmsCount,
      row.otherSmsCount,
      row.totalSmsCount,
      row.smsUnitPrice,
      row.smsAmount,
      row.subtotal,
      row.vatRate,
      copy.vatTreatment[row.vatTreatment],
      row.vatReason ?? null,
      row.vatAmount,
      invoice?.amount ?? row.total,
      status,
    ]);
  }

  usage.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: Math.max(3, usage.rowCount), column: headers.length },
  };

  const widths = [
    22, 30, 30, 18, 20, 18, 28, 42, 18, 12, 15, 18, 18, 16, 16, 16, 14, 14,
    16, 16, 12, 24, 32, 16, 16, 18,
  ];
  widths.forEach((width, index) => {
    usage.getColumn(index + 1).width = width;
  });

  for (let index = 4; index <= usage.rowCount; index += 1) {
    const row = usage.getRow(index);
    row.alignment = { vertical: "top", wrapText: true };
    row.getCell(11).numFmt = "0";
    row.getCell(12).numFmt = "0.0000";
    row.getCell(13).numFmt = "0.00";
    row.getCell(14).numFmt = "0";
    row.getCell(15).numFmt = "0";
    row.getCell(16).numFmt = "0";
    row.getCell(17).numFmt = "0";
    row.getCell(18).numFmt = "0.0000";
    row.getCell(19).numFmt = "0.00";
    row.getCell(20).numFmt = "0.00";
    row.getCell(21).numFmt = "0.00%";
    row.getCell(24).numFmt = "0.00";
    row.getCell(25).numFmt = "0.00";
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  }

  const summary = workbook.addWorksheet(copy.xlsx.summarySheet, {
    views: [{ state: "frozen", ySplit: 3 }],
  });
  summary.mergeCells("A1:E1");
  summary.getCell("A1").value = `${copy.history.title} — ${formatPlatformBillingMonth(
    data.range.month,
    locale
  )}`;
  summary.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FFFFFFFF" },
  };
  summary.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF036661" },
  };
  summary.mergeCells("A2:E2");
  summary.getCell("A2").value = copy.history.noMixedTotal;
  summary.getCell("A2").font = {
    italic: true,
    color: { argb: "FF4B5563" },
  };
  summary.addRow([
    copy.xlsx.currency,
    copy.xlsx.clientCount,
    copy.history.subtotal,
    copy.history.vat,
    copy.history.total,
  ]);
  const summaryHeader = summary.getRow(3);
  summaryHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  summaryHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF9A4F35" },
  };

  for (const currency of ["EUR", "RON"] as PlatformBillingCurrency[]) {
    const value = totalByCurrency(data).get(currency);
    if (!value) continue;
    const row = summary.addRow([
      currency,
      value.clients,
      value.subtotal,
      value.vat,
      value.total,
    ]);
    row.getCell(2).numFmt = "0";
    row.getCell(3).numFmt = "0.00";
    row.getCell(4).numFmt = "0.00";
    row.getCell(5).numFmt = "0.00";
  }

  summary.columns = [
    { width: 14 },
    { width: 16 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
