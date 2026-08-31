import { NextRequest, NextResponse } from "next/server";

import {
  sendClinicOrganisationLeadNotification,
} from "@/lib/clinics/send-clinic-organisation-lead-notification";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 25_000;

const SOLUTIONS = new Set(["integrated", "romdoc"]);
const PRIORITIES = new Set([
  "online_booking",
  "reduce_phone_calls",
  "multi_location_management",
  "existing_system_integration",
  "patient_acquisition",
  "sms_services",
  "patient_communication",
  "other",
]);
const ORGANISATION_TYPES = new Set([
  "independent_clinic",
  "multi_location_clinic",
  "medical_centre",
  "private_hospital",
  "diagnostic_imaging",
  "laboratory",
  "other",
]);
const DOCTOR_COUNT_RANGES = new Set([
  "1_5",
  "6_20",
  "21_50",
  "51_100",
  "100_plus",
]);
const NEXT_STEPS = new Set([
  "intro_meeting",
  "demo",
  "integration_discussion",
  "email_information",
  "custom_solution",
]);
const LOCALES = new Set(["ro", "en", "de"]);

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function normalizeString(value: unknown, maximumLength: number) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string) {
  return /^[+()\d\s./-]{6,30}$/.test(value);
}

type Body = {
  preferredSolution?: unknown;
  priorities?: unknown;
  organizationType?: unknown;
  doctorCountRange?: unknown;
  desiredNextStep?: unknown;
  organizationName?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  notes?: unknown;
  locale?: unknown;
  website?: unknown;
};

export async function POST(request: NextRequest): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json(
      {
        error: "Request too large.",
      },
      413
    );
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return json(
      {
        error: "Invalid request.",
      },
      400
    );
  }

  // Quietly accept obvious bot submissions without creating a lead.
  if (normalizeString(body.website, 200)) {
    return json({ success: true }, 201);
  }

  const preferredSolution = normalizeString(body.preferredSolution, 30);
  const organizationType = normalizeString(body.organizationType, 50);
  const doctorCountRange = normalizeString(body.doctorCountRange, 30);
  const desiredNextStep = normalizeString(body.desiredNextStep, 50);
  const organizationName = normalizeString(body.organizationName, 180);
  const contactName = normalizeString(body.contactName, 140);
  const email = normalizeString(body.email, 254).toLowerCase();
  const phone = normalizeString(body.phone, 30);
  const notes = normalizeString(body.notes, 2000);
  const locale = normalizeString(body.locale, 5) || "ro";

  const priorities = Array.isArray(body.priorities)
    ? Array.from(
        new Set(
          body.priorities
            .map((item) => normalizeString(item, 60))
            .filter((item) => PRIORITIES.has(item))
        )
      )
    : [];

  if (!SOLUTIONS.has(preferredSolution)) {
    return json({ error: "Please choose a solution." }, 400);
  }

  if (priorities.length === 0) {
    return json({ error: "Please choose at least one priority." }, 400);
  }

  if (!ORGANISATION_TYPES.has(organizationType)) {
    return json({ error: "Please choose an organisation type." }, 400);
  }

  if (!DOCTOR_COUNT_RANGES.has(doctorCountRange)) {
    return json({ error: "Please choose the approximate number of doctors." }, 400);
  }

  if (!NEXT_STEPS.has(desiredNextStep)) {
    return json({ error: "Please choose the preferred next step." }, 400);
  }

  if (organizationName.length < 2) {
    return json({ error: "Organisation name is required." }, 400);
  }

  if (!isEmail(email)) {
    return json({ error: "A valid email address is required." }, 400);
  }

  if (!isPhone(phone)) {
    return json({ error: "A valid phone number is required." }, 400);
  }

  if (!LOCALES.has(locale)) {
    return json({ error: "Invalid locale." }, 400);
  }

  const admin = createAdminClient();
  const { data: lead, error: insertError } = await admin
    .from("clinic_organisation_leads")
    .insert({
      preferred_solution: preferredSolution,
      priorities,
      organization_type: organizationType,
      doctor_count_range: doctorCountRange,
      desired_next_step: desiredNextStep,
      organization_name: organizationName,
      contact_name: contactName || null,
      email,
      phone,
      notes: notes || null,
      locale,
      status: "new",
      notification_status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !lead) {
    console.error("Clinic organisation lead insert failed:", insertError);
    return json(
      {
        error: "Your request could not be submitted. Please try again.",
      },
      500
    );
  }

  const notification = await sendClinicOrganisationLeadNotification({
    leadId: lead.id,
    preferredSolution: preferredSolution as "integrated" | "romdoc",
    priorities,
    organizationType,
    doctorCountRange,
    desiredNextStep,
    organizationName,
    contactName: contactName || null,
    email,
    phone,
    notes: notes || null,
    locale: locale as "ro" | "en" | "de",
  });

  const notificationStatus = notification.sent
    ? "sent"
    : notification.skipped
      ? "skipped"
      : "failed";

  const { error: notificationUpdateError } = await admin
    .from("clinic_organisation_leads")
    .update({
      notification_status: notificationStatus,
      notification_provider_message_id: notification.providerMessageId,
      notification_error: notification.errorMessage?.slice(0, 1000) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  if (notificationUpdateError) {
    console.error(
      "Clinic organisation lead notification status update failed:",
      notificationUpdateError
    );
  }

  return json(
    {
      success: true,
      leadId: lead.id,
    },
    201
  );
}
