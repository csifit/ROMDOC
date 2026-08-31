import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  validateClinicOrganizationInvitationInput,
} from "@/lib/admin/clinic-organization-invitations";
import {
  createClinicOrganizationInvitation,
} from "@/lib/admin/create-clinic-organization-invitation";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control":
    "no-store",
};

type OrganizationRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

type InvitationRow = {
  id: string;
  organization_id: string | null;
  organization_name: string;
  email: string;
  first_name: string;
  last_name: string;
  locale: "ro" | "en" | "de";
  trial_months: number;
  status: string;
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  resend_count: number;
  last_resent_at: string | null;
  last_resend_failure_at: string | null;
  last_resend_failure_code: string | null;
  last_resend_failure_message: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};

type InvitationEventRow = {
  id: string;
  invitation_id: string;
  event_type: string;
  reason: string | null;
  created_at: string;
};

function json(
  body: unknown,
  status = 200
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

async function requireAdmin() {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (
    authorization.response
  ) {
    return {
      authorization:
        null,
      response:
        authorization.response,
    };
  }

  const adminOnly =
    requireAdministratorCapability(
      authorization.role,
      "Doar administratorii pot gestiona invitațiile organizațiilor clinice."
    );

  if (
    adminOnly
  ) {
    return {
      authorization:
        null,
      response:
        adminOnly,
    };
  }

  return {
    authorization,
    response:
      null,
  };
}

export async function GET(): Promise<Response> {
  const access =
    await requireAdmin();

  if (
    access.response ||
    !access.authorization
  ) {
    return access.response as Response;
  }

  const admin =
    createAdminClient();

  const [
    organizationsResult,
    invitationsResult,
    eventsResult,
  ] =
    await Promise.all([
      admin
        .from(
          "clinic_organizations"
        )
        .select(
          "id, name, status, created_at"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      admin
        .from(
          "clinic_organization_invitations"
        )
        .select(`
          id,
          organization_id,
          organization_name,
          email,
          first_name,
          last_name,
          locale,
          trial_months,
          status,
          sent_at,
          accepted_at,
          expires_at,
          cancelled_at,
          trial_started_at,
          trial_ends_at,
          resend_count,
          last_resent_at,
          last_resend_failure_at,
          last_resend_failure_code,
          last_resend_failure_message,
          failure_code,
          failure_message,
          created_at,
          updated_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      admin
        .from(
          "clinic_organization_invitation_events"
        )
        .select(
          "id, invitation_id, event_type, reason, created_at"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    organizationsResult.error
  ) {
    console.error(
      "Clinic Organisation invitation history organizations query failed:",
      organizationsResult.error
    );

    return json(
      {
        code:
          "clinic_organization_invitation_history_organizations_failed",
        error:
          "Organizațiile nu au putut fi încărcate.",
      },
      500
    );
  }

  if (
    invitationsResult.error
  ) {
    console.error(
      "Clinic Organisation invitation history invitations query failed:",
      invitationsResult.error
    );

    return json(
      {
        code:
          "clinic_organization_invitation_history_invitations_failed",
        error:
          "Invitațiile nu au putut fi încărcate.",
      },
      500
    );
  }

  if (
    eventsResult.error
  ) {
    console.error(
      "Clinic Organisation invitation history events query failed:",
      eventsResult.error
    );

    return json(
      {
        code:
          "clinic_organization_invitation_history_events_failed",
        error:
          "Istoricul invitațiilor nu a putut fi încărcat.",
      },
      500
    );
  }

  const organizations =
    (
      organizationsResult
        .data ??
      []
    ) as
      OrganizationRow[];

  const invitations =
    (
      invitationsResult
        .data ??
      []
    ) as
      InvitationRow[];

  const events =
    (
      eventsResult
        .data ??
      []
    ) as
      InvitationEventRow[];

  const eventsByInvitation =
    new Map<
      string,
      InvitationEventRow[]
    >();

  for (
    const event of
      events
  ) {
    const current =
      eventsByInvitation
        .get(
          event.invitation_id
        ) ??
      [];

    current.push(
      event
    );

    eventsByInvitation
      .set(
        event.invitation_id,
        current
      );
  }

  const invitationsByOrganization =
    new Map<
      string,
      InvitationRow[]
    >();

  const unlinkedInvitations:
    InvitationRow[] =
      [];

  for (
    const invitation of
      invitations
  ) {
    if (
      !invitation.organization_id
    ) {
      unlinkedInvitations
        .push(
          invitation
        );

      continue;
    }

    const current =
      invitationsByOrganization
        .get(
          invitation.organization_id
        ) ??
      [];

    current.push(
      invitation
    );

    invitationsByOrganization
      .set(
        invitation.organization_id,
        current
      );
  }

  const serializeInvitation =
    (
      invitation:
        InvitationRow
    ) => ({
      ...invitation,
      events:
        eventsByInvitation
          .get(
            invitation.id
          ) ??
        [],
    });

  return json({
    organizations:
      organizations.map(
        (
          organization
        ) => {
          const organizationInvitations =
            invitationsByOrganization
              .get(
                organization.id
              ) ??
            [];

          return {
            ...organization,
            invitations:
              organizationInvitations.map(
                serializeInvitation
              ),
          };
        }
      ),

    unlinkedInvitations:
      unlinkedInvitations.map(
        serializeInvitation
      ),
  });
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const access =
    await requireAdmin();

  if (
    access.response ||
    !access.authorization
  ) {
    return access.response as Response;
  }

  let body:
    unknown;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        code:
          "clinic_organization_invitation_invalid_json",
        error:
          "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const validation =
    validateClinicOrganizationInvitationInput(
      body
    );

  if (
    !validation.ok
  ) {
    return json(
      {
        code:
          "clinic_organization_invitation_invalid_payload",
        error:
          validation.error,
        field:
          validation.field ??
          null,
      },
      400
    );
  }

  const result =
    await createClinicOrganizationInvitation({
      actorProfileId:
        access.authorization.profileId,
      input:
        validation.value,
    });

  if (
    !result.ok
  ) {
    return json(
      {
        code:
          result.code,
        error:
          result.error,
        invitationId:
          result.invitationId ??
          null,
      },
      result.status
    );
  }

  return json(
    {
      code:
        result.code,
      message:
        result.message,
      invitation:
        result.invitation,
    },
    result.status
  );
}
