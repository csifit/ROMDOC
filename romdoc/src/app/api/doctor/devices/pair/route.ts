import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isDoctorDevicePairingToken,
  normalizeDoctorDeviceName,
  type DoctorDeviceApiError,
  type DoctorDevicePairingCompletionResponse,
} from "@/lib/doctor-linked-devices";
import {
  createDoctorDeviceCredential,
  getDoctorDeviceTokenHint,
  hashDoctorDeviceSecret,
  requireActiveDoctorContext,
  setDoctorDeviceCookie,
  summarizeUserAgent,
} from "@/lib/doctor-devices/server";

export const runtime = "nodejs";

type PairingCompletionRpcRow = {
  linked_device_id: string;
  linked_device_name: string;
  linked_at: string;
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
    case "doctor_device_pairing_not_found":
      return {
        error:
          "doctor_device_pairing_not_found",
        message:
          "Codul de conectare nu a fost găsit.",
        status: 404,
      };

    case "doctor_device_pairing_expired":
      return {
        error:
          "doctor_device_pairing_expired",
        message:
          "Codul de conectare a expirat. Generează un cod nou din dashboard.",
        status: 409,
      };

    case "doctor_device_pairing_invalidated":
      return {
        error:
          "doctor_device_pairing_invalidated",
        message:
          "Acest cod a fost înlocuit. Folosește cel mai nou cod generat.",
        status: 409,
      };

    case "doctor_device_pairing_already_used":
      return {
        error:
          "doctor_device_pairing_already_used",
        message:
          "Codul de conectare a fost deja folosit.",
        status: 409,
      };

    case "doctor_device_pairing_account_mismatch":
      return {
        error:
          "doctor_device_pairing_account_mismatch",
        message:
          "Autentifică-te pe telefon cu același cont de medic care a generat codul.",
        status: 403,
      };

    case "doctor_device_limit_reached":
      return {
        error:
          "doctor_device_limit_reached",
        message:
          "Ai atins limita de trei dispozitive active.",
        status: 409,
      };

    case "authentication_required":
      return {
        error:
          "authentication_required",
        message:
          "Autentifică-te pe telefon înainte de conectarea dispozitivului.",
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

    case "invalid_doctor_device_name":
      return {
        error:
          "invalid_doctor_device_name",
        message:
          "Numele dispozitivului trebuie să conțină între 2 și 80 de caractere.",
        status: 400,
      };

    default:
      return {
        error:
          "doctor_device_pairing_failed",
        message:
          "Telefonul nu a putut fi conectat.",
        status: 500,
      };
  }
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
    pairingToken?: unknown;
    deviceName?: unknown;
  };

  try {
    body =
      await request.json() as {
        pairingToken?: unknown;
        deviceName?: unknown;
      };
  } catch {
    return errorResponse(
      "invalid_request",
      "Datele trimise nu sunt valide.",
      400
    );
  }

  if (
    !isDoctorDevicePairingToken(
      body.pairingToken
    )
  ) {
    return errorResponse(
      "invalid_pairing_token",
      "Codul de conectare nu este valid.",
      400
    );
  }

  const deviceName =
    normalizeDoctorDeviceName(
      body.deviceName
    );

  if (!deviceName) {
    return errorResponse(
      "invalid_doctor_device_name",
      "Numele dispozitivului trebuie să conțină între 2 și 80 de caractere.",
      400
    );
  }

  const deviceCredential =
    createDoctorDeviceCredential();

  const credentialHint =
    getDoctorDeviceTokenHint(
      deviceCredential
    );

  const {
    data,
    error,
  } =
    await context.supabase.rpc(
      "complete_own_doctor_device_pairing",
      {
        target_pairing_token_hash:
          hashDoctorDeviceSecret(
            body.pairingToken.trim()
          ),
        target_credential_hash:
          hashDoctorDeviceSecret(
            deviceCredential
          ),
        target_credential_hint:
          credentialHint,
        target_device_name:
          deviceName,
        target_user_agent_summary:
          summarizeUserAgent(
            request.headers.get(
              "user-agent"
            )
          ),
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
      PairingCompletionRpcRow |
      null;

  if (
    !row ||
    typeof row.linked_device_id !==
      "string" ||
    typeof row.linked_at !==
      "string"
  ) {
    return errorResponse(
      "doctor_device_pairing_failed",
      "Telefonul nu a putut fi conectat.",
      500
    );
  }

  const payload:
    DoctorDevicePairingCompletionResponse = {
      success: true,
      device: {
        id:
          row.linked_device_id,
        deviceName:
          row.linked_device_name,
        credentialHint,
        userAgentSummary:
          summarizeUserAgent(
            request.headers.get(
              "user-agent"
            )
          ),
        status: "active",
        linkedAt:
          row.linked_at,
        lastUsedAt: null,
        revokedAt: null,
      },
    };

  const response =
    NextResponse.json(
      payload,
      {
        status: 201,
        headers:
          noStoreHeaders(),
      }
    );

  setDoctorDeviceCookie(
    response,
    deviceCredential
  );

  return response;
}
