import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeliveryReportPayload = Record<string, string>;

type NormalizedReport = {
  providerMessageId: string | null;
  reportStatus: "accepted" | "delivered" | "failed" | "expired" | "unknown";
  providerStatusCode: string | null;
  providerStatusMessage: string | null;
  raw: DeliveryReportPayload;
};

function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "Unauthorized delivery report request.",
    },
    { status: 401 }
  );
}

function getReportSecret() {
  return process.env.SMSLINK_DELIVERY_REPORT_SECRET?.trim() ?? "";
}

function isAuthorized(request: NextRequest) {
  const expectedSecret = getReportSecret();

  if (!expectedSecret) {
    return false;
  }

  const urlToken = request.nextUrl.searchParams.get("token")?.trim();
  const headerToken = request.headers
    .get("x-smslink-delivery-secret")
    ?.trim();

  return urlToken === expectedSecret || headerToken === expectedSecret;
}

function firstPresent(
  payload: DeliveryReportPayload,
  keys: string[]
) {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeStatus(value: string | null) {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (
    [
      "delivered",
      "delivery",
      "livrat",
      "livrata",
      "delivrd",
      "success",
      "successful",
      "ok",
    ].includes(normalized)
  ) {
    return "delivered" as const;
  }

  if (
    [
      "accepted",
      "sent",
      "submitted",
      "queued",
      "trimis",
      "transmis",
      "in progress",
      "pending",
    ].includes(normalized)
  ) {
    return "accepted" as const;
  }

  if (
    [
      "failed",
      "failure",
      "undelivered",
      "rejected",
      "rejectd",
      "error",
      "failed delivery",
      "nelivrat",
      "esuat",
      "eroare",
    ].includes(normalized)
  ) {
    return "failed" as const;
  }

  if (
    [
      "expired",
      "expirat",
      "timeout",
      "timed out",
    ].includes(normalized)
  ) {
    return "expired" as const;
  }

  return "unknown" as const;
}

function payloadFromSearchParams(searchParams: URLSearchParams) {
  const payload: DeliveryReportPayload = {};

  searchParams.forEach((value, key) => {
    if (key !== "token") {
      payload[key] = value;
    }
  });

  return payload;
}

async function payloadFromRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!json) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [
        key,
        typeof value === "string"
          ? value
          : value === null || value === undefined
            ? ""
            : String(value),
      ])
    ) as DeliveryReportPayload;
  }

  const body = await request.text().catch(() => "");

  if (!body.trim()) {
    return {};
  }

  return payloadFromSearchParams(new URLSearchParams(body));
}

function normalizeReport(payload: DeliveryReportPayload): NormalizedReport {
  const providerMessageId = firstPresent(payload, [
    "message_id",
    "messageId",
    "sms_id",
    "smsId",
    "id_sms",
    "idsms",
    "id",
    "msg_id",
    "msgId",
    "provider_message_id",
    "providerMessageId",
  ]);

  const providerStatusCode = firstPresent(payload, [
    "status_code",
    "statusCode",
    "code",
    "delivery_code",
    "deliveryCode",
    "dlr_status",
    "dlrStatus",
  ]);

  const providerStatusMessage = firstPresent(payload, [
    "status",
    "delivery_status",
    "deliveryStatus",
    "message_status",
    "messageStatus",
    "description",
    "status_description",
    "statusDescription",
    "reason",
    "message",
  ]);

  return {
    providerMessageId,
    reportStatus: normalizeStatus(providerStatusMessage ?? providerStatusCode),
    providerStatusCode,
    providerStatusMessage,
    raw: payload,
  };
}

async function updateSmsDeliveryLog(report: NormalizedReport) {
  if (!report.providerMessageId) {
    return {
      matched: false,
      reason: "missing_provider_message_id",
    };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const updatePayload = {
    delivery_report_status: report.reportStatus,
    delivery_report_received_at: now,
    delivery_report_raw: report.raw,
    provider_status_code: report.providerStatusCode,
    provider_status_message: report.providerStatusMessage,
    delivered_at: report.reportStatus === "delivered" ? now : null,
    failed_at:
      report.reportStatus === "failed" || report.reportStatus === "expired"
        ? now
        : null,
  };

  const { data, error } = await admin
    .from("sms_delivery_logs")
    .update(updatePayload)
    .eq("provider", "smslink")
    .eq("provider_message_id", report.providerMessageId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("SMSLink delivery report update failed:", error);

    return {
      matched: false,
      reason: "database_error",
    };
  }

  return {
    matched: Boolean(data),
    reason: data ? "updated" : "message_not_found",
  };
}

async function handleDeliveryReport(
  request: NextRequest,
  requestBodyPayload: DeliveryReportPayload = {}
) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const payload = {
    ...payloadFromSearchParams(request.nextUrl.searchParams),
    ...requestBodyPayload,
  };

  const report = normalizeReport(payload);
  const result = await updateSmsDeliveryLog(report);

  return NextResponse.json(
    {
      ok: true,
      matched: result.matched,
      reason: result.reason,
      providerMessageId: report.providerMessageId,
      normalizedStatus: report.reportStatus,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  return handleDeliveryReport(request);
}

export async function POST(request: NextRequest) {
  const bodyPayload = await payloadFromRequest(request);

  return handleDeliveryReport(request, bodyPayload);
}
