import {
  NextRequest,
} from "next/server";

import {
  stableApiError,
  stableApiSuccess,
} from "@/lib/api/stable-api-response";
import {
  type AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getRequestAppLocale,
} from "@/lib/i18n/request-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

const CODES = {
  invalidJson:
    "invalid_json",
  authenticationRequired:
    "authentication_required",
  clinicManagerRequired:
    "clinic_manager_required",
  activeManagerRequired:
    "active_manager_required",
  relationshipRequired:
    "relationship_required",
  invalidAction:
    "invalid_action",
  relationshipNotFound:
    "doctor_relationship_not_found",
  organizationAccessDenied:
    "organization_access_denied",
  organizationNotActive:
    "organization_not_active",
  acceptedDoctorRequired:
    "accepted_doctor_required",
  doctorAlreadySuspended:
    "doctor_already_suspended",
  doctorNotSuspended:
    "doctor_not_suspended",
  approvedLocationRequired:
    "approved_location_required",
  doctorSuspendFailed:
    "doctor_suspend_failed",
  doctorReactivateFailed:
    "doctor_reactivate_failed",
  doctorSuspended:
    "doctor_suspended",
  doctorReactivated:
    "doctor_reactivated",
} as const;

type Code =
  (typeof CODES)[keyof typeof CODES];

type Action =
  | "suspend"
  | "reactivate";

type Body = {
  relationshipId?: unknown;
  action?: unknown;
  comment?: unknown;
  locale?: unknown;
};

type RelationshipRow = {
  id: string;
  organization_id: string;
  clinic_id:
    | string
    | null;
  doctor_id:
    | string
    | null;
  invitation_status: string;
  coverage_status: string;
  pause_reason:
    | string
    | null;
  paused_at:
    | string
    | null;
};

const COPY:
  Record<
    AppLocale,
    Record<Code, string>
  > = {
    ro: {
      invalid_json:
        "Cererea nu conține date JSON valide.",
      authentication_required:
        "Trebuie să fii autentificat.",
      clinic_manager_required:
        "Doar un Clinic Manager poate suspenda sau reactiva un medic al organizației.",
      active_manager_required:
        "Contul Clinic Manager trebuie să fie activ.",
      relationship_required:
        "Relația medic-organizație lipsește.",
      invalid_action:
        "Acțiunea solicitată nu este validă.",
      doctor_relationship_not_found:
        "Medicul administrat de organizație nu a fost găsit.",
      organization_access_denied:
        "Nu ai acces la organizația acestui medic.",
      organization_not_active:
        "Organizația clinicii nu este activă.",
      accepted_doctor_required:
        "Poate fi suspendat numai un medic care a acceptat invitația și are cont creat.",
      doctor_already_suspended:
        "Medicul este deja suspendat în această organizație.",
      doctor_not_suspended:
        "Medicul nu este suspendat în această organizație.",
      approved_location_required:
        "Medicul trebuie să aibă o locație activă și aprobată înainte de reactivare.",
      doctor_suspend_failed:
        "Medicul nu a putut fi suspendat în organizație.",
      doctor_reactivate_failed:
        "Medicul nu a putut fi reactivat în organizație.",
      doctor_suspended:
        "Medicul a fost suspendat în această organizație. Contul său RomDoc nu a fost șters sau suspendat global.",
      doctor_reactivated:
        "Medicul a fost reactivat în această organizație.",
    },
    en: {
      invalid_json:
        "The request does not contain valid JSON.",
      authentication_required:
        "You must be signed in.",
      clinic_manager_required:
        "Only a Clinic Manager can suspend or reactivate an organisation Doctor.",
      active_manager_required:
        "The Clinic Manager account must be active.",
      relationship_required:
        "The Doctor-organisation relationship is missing.",
      invalid_action:
        "The requested action is invalid.",
      doctor_relationship_not_found:
        "The Doctor managed by the organisation was not found.",
      organization_access_denied:
        "You do not have access to this Doctor's organisation.",
      organization_not_active:
        "The clinic organisation is not active.",
      accepted_doctor_required:
        "Only a Doctor who accepted the invitation and created an account can be suspended.",
      doctor_already_suspended:
        "The Doctor is already suspended in this organisation.",
      doctor_not_suspended:
        "The Doctor is not suspended in this organisation.",
      approved_location_required:
        "The Doctor must have an active approved location before reactivation.",
      doctor_suspend_failed:
        "The Doctor could not be suspended in the organisation.",
      doctor_reactivate_failed:
        "The Doctor could not be reactivated in the organisation.",
      doctor_suspended:
        "The Doctor was suspended in this organisation. Their RomDoc account was not deleted or globally suspended.",
      doctor_reactivated:
        "The Doctor was reactivated in this organisation.",
    },
    de: {
      invalid_json:
        "Die Anfrage enthält keine gültigen JSON-Daten.",
      authentication_required:
        "Sie müssen angemeldet sein.",
      clinic_manager_required:
        "Nur ein Klinikmanager kann einen Arzt der Organisation sperren oder reaktivieren.",
      active_manager_required:
        "Das Klinikmanager-Konto muss aktiv sein.",
      relationship_required:
        "Die Beziehung zwischen Arzt und Organisation fehlt.",
      invalid_action:
        "Die angeforderte Aktion ist ungültig.",
      doctor_relationship_not_found:
        "Der von der Organisation verwaltete Arzt wurde nicht gefunden.",
      organization_access_denied:
        "Sie haben keinen Zugriff auf die Organisation dieses Arztes.",
      organization_not_active:
        "Die Klinikorganisation ist nicht aktiv.",
      accepted_doctor_required:
        "Nur ein Arzt, der die Einladung angenommen und ein Konto erstellt hat, kann gesperrt werden.",
      doctor_already_suspended:
        "Der Arzt ist in dieser Organisation bereits gesperrt.",
      doctor_not_suspended:
        "Der Arzt ist in dieser Organisation nicht gesperrt.",
      approved_location_required:
        "Der Arzt benötigt vor der Reaktivierung einen aktiven freigegebenen Standort.",
      doctor_suspend_failed:
        "Der Arzt konnte in der Organisation nicht gesperrt werden.",
      doctor_reactivate_failed:
        "Der Arzt konnte in der Organisation nicht reaktiviert werden.",
      doctor_suspended:
        "Der Arzt wurde in dieser Organisation gesperrt. Sein RomDoc-Konto wurde nicht gelöscht oder global gesperrt.",
      doctor_reactivated:
        "Der Arzt wurde in dieser Organisation reaktiviert.",
    },
  };

function normalizeString(
  value: unknown,
  maximumLength =
    1000
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

function errorResponse(
  locale: AppLocale,
  code: Code,
  status: number
) {
  return stableApiError(
    code,
    COPY[locale][code],
    status
  );
}

export async function PATCH(
  request:
    NextRequest
): Promise<Response> {
  let body:
    Body;

  try {
    body =
      (await request
        .json()) as
        Body;
  } catch {
    const locale =
      getRequestAppLocale(
        request
      );

    return errorResponse(
      locale,
      CODES.invalidJson,
      400
    );
  }

  const locale =
    getRequestAppLocale(
      request,
      body.locale
    );

  const relationshipId =
    normalizeString(
      body.relationshipId,
      100
    );

  const action =
    normalizeString(
      body.action,
      20
    ) as
      Action;

  const comment =
    normalizeString(
      body.comment,
      1000
    ) ||
    null;

  if (!relationshipId) {
    return errorResponse(
      locale,
      CODES.relationshipRequired,
      400
    );
  }

  if (
    ![
      "suspend",
      "reactivate",
    ].includes(
      action
    )
  ) {
    return errorResponse(
      locale,
      CODES.invalidAction,
      400
    );
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    return errorResponse(
      locale,
      CODES.authenticationRequired,
      401
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await admin
      .from(
        "profiles"
      )
      .select(
        "role, account_status"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "clinic_manager"
  ) {
    return errorResponse(
      locale,
      CODES.clinicManagerRequired,
      403
    );
  }

  if (
    profile.account_status !==
      "active"
  ) {
    return errorResponse(
      locale,
      CODES.activeManagerRequired,
      403
    );
  }

  const {
    data:
      relationshipData,
    error:
      relationshipError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .select(`
        id,
        organization_id,
        clinic_id,
        doctor_id,
        invitation_status,
        coverage_status,
        pause_reason,
        paused_at
      `)
      .eq(
        "id",
        relationshipId
      )
      .maybeSingle();

  const relationship =
    relationshipData as
      | RelationshipRow
      | null;

  if (
    relationshipError ||
    !relationship
  ) {
    return errorResponse(
      locale,
      CODES.relationshipNotFound,
      relationshipError
        ? 500
        : 404
    );
  }

  const {
    data:
      membership,
    error:
      membershipError,
  } =
    await admin
      .from(
        "clinic_organization_members"
      )
      .select(
        "id"
      )
      .eq(
        "organization_id",
        relationship
          .organization_id
      )
      .eq(
        "profile_id",
        user.id
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    return errorResponse(
      locale,
      CODES.organizationAccessDenied,
      403
    );
  }

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
        relationship
          .organization_id
      )
      .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    return errorResponse(
      locale,
      CODES.organizationAccessDenied,
      404
    );
  }

  if (
    organization.status !==
      "active"
  ) {
    return errorResponse(
      locale,
      CODES.organizationNotActive,
      409
    );
  }

  if (
    relationship
      .invitation_status !==
      "accepted" ||
    !relationship.doctor_id
  ) {
    return errorResponse(
      locale,
      CODES.acceptedDoctorRequired,
      409
    );
  }

  if (
    action ===
    "suspend"
  ) {
    if (
      relationship
        .coverage_status ===
        "paused"
    ) {
      return errorResponse(
        locale,
        CODES.doctorAlreadySuspended,
        409
      );
    }

    const {
      data:
        updatedRelationship,
      error:
        updateError,
    } =
      await admin
        .from(
          "clinic_doctor_relationships"
        )
        .update({
          coverage_status:
            "paused",
          paused_at:
            new Date()
              .toISOString(),
          pause_reason:
            comment,
        })
        .eq(
          "id",
          relationship.id
        )
        .select(
          "id, coverage_status, pause_reason, paused_at"
        )
        .maybeSingle();

    if (
      updateError ||
      !updatedRelationship
    ) {
      console.error(
        "Clinic Doctor suspension update failed:",
        updateError
      );

      return errorResponse(
        locale,
        CODES.doctorSuspendFailed,
        500
      );
    }

    if (
      relationship.clinic_id
    ) {
      const {
        error:
          clinicLinkError,
      } =
        await admin
          .from(
            "doctor_clinics"
          )
          .delete()
          .eq(
            "doctor_id",
            relationship
              .doctor_id
          )
          .eq(
            "clinic_id",
            relationship
              .clinic_id
          );

      if (
        clinicLinkError
      ) {
        console.error(
          "Suspended Clinic Doctor location cleanup failed:",
          clinicLinkError
        );
      }
    }

    return stableApiSuccess(
      CODES.doctorSuspended,
      {
        message:
          COPY[locale][
            CODES
              .doctorSuspended
          ],
        relationship:
          updatedRelationship,
      }
    );
  }

  if (
    relationship
      .coverage_status !==
      "paused"
  ) {
    return errorResponse(
      locale,
      CODES.doctorNotSuspended,
      409
    );
  }

  if (
    !relationship.clinic_id
  ) {
    return errorResponse(
      locale,
      CODES.approvedLocationRequired,
      409
    );
  }

  const {
    data:
      organizationClinic,
    error:
      organizationClinicError,
  } =
    await admin
      .from(
        "clinic_organization_clinics"
      )
      .select(
        "id"
      )
      .eq(
        "organization_id",
        relationship
          .organization_id
      )
      .eq(
        "clinic_id",
        relationship
          .clinic_id
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

  const {
    data:
      clinic,
    error:
      clinicError,
  } =
    await admin
      .from(
        "clinics"
      )
      .select(
        "id"
      )
      .eq(
        "id",
        relationship
          .clinic_id
      )
      .eq(
        "status",
        "approved"
      )
      .maybeSingle();

  if (
    organizationClinicError ||
    clinicError ||
    !organizationClinic ||
    !clinic
  ) {
    return errorResponse(
      locale,
      CODES.approvedLocationRequired,
      409
    );
  }

  const {
    data:
      reactivatedRelationship,
    error:
      reactivateError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .update({
        coverage_status:
          "active",
      })
      .eq(
        "id",
        relationship.id
      )
      .select(
        "id, coverage_status, pause_reason, paused_at"
      )
      .maybeSingle();

  if (
    reactivateError ||
    !reactivatedRelationship
  ) {
    console.error(
      "Clinic Doctor reactivation update failed:",
      reactivateError
    );

    return errorResponse(
      locale,
      CODES.doctorReactivateFailed,
      500
    );
  }

  const {
    error:
      doctorClinicError,
  } =
    await admin
      .from(
        "doctor_clinics"
      )
      .upsert(
        {
          doctor_id:
            relationship
              .doctor_id,
          clinic_id:
            relationship
              .clinic_id,
        },
        {
          onConflict:
            "doctor_id,clinic_id",
        }
      );

  if (
    doctorClinicError
  ) {
    console.error(
      "Reactivated Clinic Doctor location sync failed:",
      doctorClinicError
    );

    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .update({
        coverage_status:
          "paused",
      })
      .eq(
        "id",
        relationship.id
      );

    return errorResponse(
      locale,
      CODES.doctorReactivateFailed,
      500
    );
  }

  return stableApiSuccess(
    CODES.doctorReactivated,
    {
      message:
        COPY[locale][
          CODES
            .doctorReactivated
        ],
      relationship:
        reactivatedRelationship,
    }
  );
}
