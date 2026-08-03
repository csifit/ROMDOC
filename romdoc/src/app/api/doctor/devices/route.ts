import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  DOCTOR_DEVICE_LIMIT,
  isUuid,
  type DoctorDeviceApiError,
  type DoctorDeviceBulkMutationResponse,
  type DoctorDeviceMutationResponse,
  type DoctorDevicePairingResponse,
  type DoctorLinkedDeviceListItem,
  type DoctorLinkedDeviceListResponse,
  type DoctorLinkedDeviceStatus,
} from "@/lib/doctor-linked-devices";
import {
  createDoctorDevicePairingToken,
  getDoctorDeviceTokenHint,
  getRomDocSiteUrl,
  hashDoctorDeviceSecret,
  requireActiveDoctorContext,
} from "@/lib/doctor-devices/server";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

type LinkedDeviceRow = {
  id: string;
  device_name: string;
  credential_hint: string;
  user_agent_summary: string | null;
  status: DoctorLinkedDeviceStatus;
  linked_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type PairingRpcRow = {
  pairing_code_id: string;
  pairing_expires_at: string;
};

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-store, max-age=0",
    Pragma: "no-cache",
    "Referrer-Policy":
      "no-referrer",
    "X-Content-Type-Options":
      "nosniff",
  };
}

function errorResponse(
  error: string,
  message: string,
  status: number
) {
  const payload:
    DoctorDeviceApiError = {
      error,
      message,
    };

  return NextResponse.json(
    payload,
    {
      status,
      headers:
        noStoreHeaders(),
    }
  );
}

function mapDatabaseError(
  message: string
) {
  switch (message) {
    case "doctor_device_limit_reached":
      return {
        error:
          "doctor_device_limit_reached",
        message:
          "Ai atins limita de trei dispozitive active.",
        status: 409,
      };

    case "doctor_linked_device_not_found":
      return {
        error:
          "doctor_linked_device_not_found",
        message:
          "Dispozitivul nu a fost găsit sau este deja revocat.",
        status: 404,
      };

    case "authentication_required":
      return {
        error:
          "authentication_required",
        message:
          "Trebuie să fii autentificat.",
        status: 401,
      };

    case "active_doctor_account_required":
      return {
        error:
          "active_doctor_account_required",
        message:
          "Este necesar un cont activ de medic.",
        status: 403,
      };

    default:
      return {
        error:
          "doctor_device_operation_failed",
        message:
          "Operațiunea pentru dispozitiv nu a putut fi finalizată.",
        status: 500,
      };
  }
}

function toListItem(
  row: LinkedDeviceRow
): DoctorLinkedDeviceListItem {
  return {
    id: row.id,
    deviceName:
      row.device_name,
    credentialHint:
      row.credential_hint,
    userAgentSummary:
      row.user_agent_summary,
    status: row.status,
    linkedAt:
      row.linked_at,
    lastUsedAt:
      row.last_used_at,
    revokedAt:
      row.revoked_at,
  };
}

export async function GET() {
  const context =
    await requireActiveDoctorContext();

  if (!context.ok) {
    return errorResponse(
      context.error,
      context.message,
      context.status
    );
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "doctor_linked_devices"
      )
      .select(`
        id,
        device_name,
        credential_hint,
        user_agent_summary,
        status,
        linked_at,
        last_used_at,
        revoked_at
      `)
      .eq(
        "doctor_id",
        context.doctor.id
      )
      .order(
        "status",
        {
          ascending: true,
        }
      )
      .order(
        "linked_at",
        {
          ascending: false,
        }
      )
      .limit(50);

  if (error) {
    console.error(
      "Doctor linked-device list failed:",
      error
    );

    return errorResponse(
      "doctor_device_list_failed",
      "Dispozitivele conectate nu au putut fi încărcate.",
      500
    );
  }

  const devices =
    (
      data ?? []
    ) as LinkedDeviceRow[];

  const response:
    DoctorLinkedDeviceListResponse = {
      devices:
        devices.map(
          toListItem
        ),
      activeDeviceCount:
        devices.filter(
          (device) =>
            device.status ===
            "active"
        ).length,
      maximumActiveDevices:
        DOCTOR_DEVICE_LIMIT,
    };

  return NextResponse.json(
    response,
    {
      status: 200,
      headers:
        noStoreHeaders(),
    }
  );
}

export async function POST(
  request: NextRequest
) {
  const context =
    await requireActiveDoctorContext();

  if (!context.ok) {
    return errorResponse(
      context.error,
      context.message,
      context.status
    );
  }

  let body: {
    action?: unknown;
    deviceId?: unknown;
  };

  try {
    body =
      await request.json() as {
        action?: unknown;
        deviceId?: unknown;
      };
  } catch {
    return errorResponse(
      "invalid_request",
      "Datele trimise nu sunt valide.",
      400
    );
  }

  if (
    body.action ===
    "create_pairing"
  ) {
    const pairingToken =
      createDoctorDevicePairingToken();

    const tokenHint =
      getDoctorDeviceTokenHint(
        pairingToken
      );

    const {
      data,
      error,
    } =
      await context.supabase.rpc(
        "create_own_doctor_device_pairing_code",
        {
          target_token_hash:
            hashDoctorDeviceSecret(
              pairingToken
            ),
          target_token_hint:
            tokenHint,
        }
      );

    if (error) {
      const mapped =
        mapDatabaseError(
          error.message
        );

      return errorResponse(
        mapped.error,
        mapped.message,
        mapped.status
      );
    }

    const row =
      (
        Array.isArray(data)
          ? data[0]
          : data
      ) as
        PairingRpcRow |
        null;

    if (
      !row ||
      typeof row.pairing_expires_at !==
        "string"
    ) {
      return errorResponse(
        "doctor_device_pairing_failed",
        "Codul de conectare nu a putut fi generat.",
        500
      );
    }

    const baseUrl =
      getRomDocSiteUrl(
        request.nextUrl.origin
      );

    const pairingUrl =
      `${baseUrl}/doctor-mobile/pair#token=${encodeURIComponent(
        pairingToken
      )}`;

    const response:
      DoctorDevicePairingResponse = {
        success: true,
        pairingUrl,
        tokenHint,
        expiresAt:
          row.pairing_expires_at,
      };

    return NextResponse.json(
      response,
      {
        status: 201,
        headers:
          noStoreHeaders(),
      }
    );
  }

  if (
    body.action ===
    "revoke_all"
  ) {
    const {
      data,
      error,
    } =
      await context.supabase.rpc(
        "revoke_all_own_doctor_linked_devices",
        {}
      );

    if (error) {
      const mapped =
        mapDatabaseError(
          error.message
        );

      return errorResponse(
        mapped.error,
        mapped.message,
        mapped.status
      );
    }

    const response:
      DoctorDeviceBulkMutationResponse = {
        success: true,
        revokedCount:
          typeof data === "number"
            ? data
            : 0,
      };

    return NextResponse.json(
      response,
      {
        status: 200,
        headers:
          noStoreHeaders(),
      }
    );
  }

  if (
    body.action === "revoke"
  ) {
    if (!isUuid(body.deviceId)) {
      return errorResponse(
        "invalid_device_id",
        "Dispozitivul selectat nu este valid.",
        400
      );
    }

    const {
      data,
      error,
    } =
      await context.supabase.rpc(
        "revoke_own_doctor_linked_device",
        {
          target_device_id:
            body.deviceId.trim(),
        }
      );

    if (error) {
      const mapped =
        mapDatabaseError(
          error.message
        );

      return errorResponse(
        mapped.error,
        mapped.message,
        mapped.status
      );
    }

    const response:
      DoctorDeviceMutationResponse = {
        success: true,
        deviceId:
          typeof data === "string"
            ? data
            : body.deviceId.trim(),
      };

    return NextResponse.json(
      response,
      {
        status: 200,
        headers:
          noStoreHeaders(),
      }
    );
  }

  return errorResponse(
    "invalid_action",
    "Acțiunea solicitată nu este validă.",
    400
  );
}
