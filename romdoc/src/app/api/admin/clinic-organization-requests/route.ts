import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  normalizeAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type RequestAction =
  | "approve"
  | "reject";

type RequestBody = {
  organizationId?: unknown;
  action?: unknown;
  comment?: unknown;
  locale?: unknown;
};

const COPY = {
  ro: {
    adminOnly:
      "Numai administratorii pot aproba sau respinge cereri pentru conturi de organizații medicale.",
    invalidJson:
      "Cererea nu conține date JSON valide.",
    organizationRequired:
      "Organizația lipsește.",
    invalidAction:
      "Acțiunea solicitată nu este validă.",
    notFound:
      "Cererea pentru organizația medicală nu a fost găsită.",
    pendingRequired:
      "Numai cererile în așteptare pot fi aprobate sau respinse.",
    approveFailed:
      "Cererea nu a putut fi aprobată. Este posibil ca statusul să fi fost modificat între timp.",
    rejectFailed:
      "Cererea nu a putut fi respinsă. Este posibil ca statusul să fi fost modificat între timp.",
    approved:
      "Contul organizației medicale a fost aprobat.",
    rejected:
      "Cererea pentru contul organizației medicale a fost respinsă.",
  },
  en: {
    adminOnly:
      "Only administrators can approve or reject clinic organisation account requests.",
    invalidJson:
      "The request does not contain valid JSON.",
    organizationRequired:
      "The clinic organisation is missing.",
    invalidAction:
      "The requested action is invalid.",
    notFound:
      "The clinic organisation account request was not found.",
    pendingRequired:
      "Only pending requests can be approved or rejected.",
    approveFailed:
      "The request could not be approved. Its status may have changed in the meantime.",
    rejectFailed:
      "The request could not be rejected. Its status may have changed in the meantime.",
    approved:
      "The clinic organisation account was approved.",
    rejected:
      "The clinic organisation account request was rejected.",
  },
  de: {
    adminOnly:
      "Nur Administratoren können Anträge für Klinikorganisationskonten genehmigen oder ablehnen.",
    invalidJson:
      "Die Anfrage enthält keine gültigen JSON-Daten.",
    organizationRequired:
      "Die Klinikorganisation fehlt.",
    invalidAction:
      "Die angeforderte Aktion ist ungültig.",
    notFound:
      "Der Antrag für das Klinikorganisationskonto wurde nicht gefunden.",
    pendingRequired:
      "Nur ausstehende Anträge können genehmigt oder abgelehnt werden.",
    approveFailed:
      "Der Antrag konnte nicht genehmigt werden. Sein Status wurde möglicherweise inzwischen geändert.",
    rejectFailed:
      "Der Antrag konnte nicht abgelehnt werden. Sein Status wurde möglicherweise inzwischen geändert.",
    approved:
      "Das Klinikorganisationskonto wurde genehmigt.",
    rejected:
      "Der Antrag für das Klinikorganisationskonto wurde abgelehnt.",
  },
} satisfies
  Record<
    AppLocale,
    Record<string, string>
  >;

const NO_STORE_HEADERS = {
  "Cache-Control":
    "no-store",
} as const;

function json(
  body:
    Record<string, unknown>,
  status =
    200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers:
        NO_STORE_HEADERS,
    }
  );
}

function normalizeString(
  value: unknown,
  maximumLength =
    2000
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .slice(
          0,
          maximumLength
        )
    : "";
}

export async function PATCH(
  request:
    NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  let body:
    RequestBody;

  try {
    body =
      (await request
        .json()) as
        RequestBody;
  } catch {
    const locale =
      normalizeAppLocale(
        request.nextUrl
          .searchParams
          .get(
            "locale"
          )
      );

    return json(
      {
        success:
          false,
        code:
          "invalid_json",
        error:
          COPY[locale]
            .invalidJson,
      },
      400
    );
  }

  const locale =
    normalizeAppLocale(
      typeof body.locale ===
        "string"
        ? body.locale
        : request.nextUrl
            .searchParams
            .get(
              "locale"
            )
    );

  const copy =
    COPY[locale];

  const adminOnly =
    requireAdministratorCapability(
      authorization.role,
      copy.adminOnly
    );

  if (adminOnly) {
    return adminOnly;
  }

  const organizationId =
    normalizeString(
      body.organizationId,
      100
    );

  const action =
    normalizeString(
      body.action,
      20
    ) as
      RequestAction;

  const comment =
    normalizeString(
      body.comment,
      2000
    ) ||
    null;

  if (!organizationId) {
    return json(
      {
        success:
          false,
        code:
          "organization_required",
        error:
          copy.organizationRequired,
      },
      400
    );
  }

  if (
    action !==
      "approve" &&
    action !==
      "reject"
  ) {
    return json(
      {
        success:
          false,
        code:
          "invalid_action",
        error:
          copy.invalidAction,
      },
      400
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      organization,
    error:
      organizationError,
  } =
    await admin
      .from(
        "clinic_organizations"
      )
      .select(
        "id, status"
      )
      .eq(
        "id",
        organizationId
      )
      .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    return json(
      {
        success:
          false,
        code:
          "organization_request_not_found",
        error:
          copy.notFound,
      },
      404
    );
  }

  if (
    organization.status !==
      "pending"
  ) {
    return json(
      {
        success:
          false,
        code:
          "organization_request_must_be_pending",
        error:
          copy.pendingRequired,
      },
      409
    );
  }

  const now =
    new Date()
      .toISOString();

  if (
    action ===
    "reject"
  ) {
    const {
      data:
        rejected,
      error:
        rejectError,
    } =
      await admin
        .from(
          "clinic_organizations"
        )
        .update({
          status:
            "rejected",
          approved_by_profile_id:
            null,
          approved_at:
            null,
          rejected_at:
            now,
          rejection_reason:
            comment,
          admin_notes:
            comment,
        })
        .eq(
          "id",
          organization.id
        )
        .eq(
          "status",
          "pending"
        )
        .select(
          "id"
        )
        .maybeSingle();

    if (
      rejectError ||
      !rejected
    ) {
      console.error(
        "Clinic Organisation account request rejection failed:",
        rejectError
      );

      return json(
        {
          success:
            false,
          code:
            "organization_request_reject_conflict",
          error:
            copy.rejectFailed,
        },
        409
      );
    }

    return json({
      success:
        true,
      code:
        "organization_request_rejected",
      message:
        copy.rejected,
    });
  }

  const {
    data:
      approved,
    error:
      approveError,
  } =
    await admin
      .from(
        "clinic_organizations"
      )
      .update({
        status:
          "active",
        approved_by_profile_id:
          authorization.profileId,
        approved_at:
          now,
        rejected_at:
          null,
        rejection_reason:
          null,
        admin_notes:
          comment,
      })
      .eq(
        "id",
        organization.id
      )
      .eq(
        "status",
        "pending"
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    approveError ||
    !approved
  ) {
    console.error(
      "Clinic Organisation account request approval failed:",
      approveError
    );

    return json(
      {
        success:
          false,
        code:
          "organization_request_approve_conflict",
        error:
          copy.approveFailed,
      },
      409
    );
  }

  return json({
    success:
      true,
    code:
      "organization_request_approved",
    message:
      copy.approved,
  });
}
