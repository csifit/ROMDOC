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

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control":
    "no-store",
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

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  const adminOnly =
    requireAdministratorCapability(
      authorization.role,
      "Doar administratorii pot invita organizații clinice."
    );

  if (
    adminOnly
  ) {
    return adminOnly;
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
        authorization.profileId,
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
