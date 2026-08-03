import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  type DoctorDeviceApiError,
  type DoctorDeviceMutationResponse,
  type DoctorMobileDeviceResponse,
} from "@/lib/doctor-linked-devices";
import {
  clearDoctorDeviceCookie,
  DOCTOR_DEVICE_COOKIE_NAME,
  hashDoctorDeviceSecret,
  resolveDoctorLinkedDeviceCredential,
} from "@/lib/doctor-devices/server";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

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

function getDoctorName(
  firstName: string | null,
  lastName: string | null,
  fallback: string
) {
  const fullName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName ||
    fallback
      .split("-")
      .map(
        (part) =>
          part.charAt(0)
            .toUpperCase() +
          part.slice(1)
      )
      .join(" ");
}

export async function GET(
  request: NextRequest
) {
  const credential =
    request.cookies.get(
      DOCTOR_DEVICE_COOKIE_NAME
    )?.value ??
    "";

  const resolved =
    await resolveDoctorLinkedDeviceCredential(
      credential
    );

  if (!resolved) {
    const response =
      errorResponse(
        "linked_device_required",
        "Acest telefon nu este conectat sau accesul a fost revocat.",
        401
      );

    clearDoctorDeviceCookie(
      response
    );

    return response;
  }

  const payload:
    DoctorMobileDeviceResponse = {
      linked: true,
      device: {
        id:
          resolved.linkedDeviceId,
        name:
          resolved.deviceName,
        credentialHint:
          resolved.credentialHint,
        linkedAt:
          resolved.linkedAt,
        lastUsedAt:
          resolved.lastUsedAt,
      },
      doctor: {
        id:
          resolved.doctorId,
        profileId:
          resolved.doctorProfileId,
        slug:
          resolved.doctorSlug,
        name:
          getDoctorName(
            resolved.doctorFirstName,
            resolved.doctorLastName,
            resolved.doctorSlug
          ),
      },
    };

  return NextResponse.json(
    payload,
    {
      status: 200,
      headers:
        noStoreHeaders(),
    }
  );
}

export async function DELETE(
  request: NextRequest
) {
  const credential =
    request.cookies.get(
      DOCTOR_DEVICE_COOKIE_NAME
    )?.value ??
    "";

  const resolved =
    await resolveDoctorLinkedDeviceCredential(
      credential
    );

  if (!resolved) {
    const response =
      errorResponse(
        "linked_device_required",
        "Acest telefon nu este conectat sau accesul a fost revocat.",
        401
      );

    clearDoctorDeviceCookie(
      response
    );

    return response;
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "revoke_doctor_linked_device_by_credential",
      {
        target_credential_hash:
          hashDoctorDeviceSecret(
            credential
          ),
      }
    );

  if (error) {
    console.error(
      "Current Doctor device revocation failed:",
      error
    );

    return errorResponse(
      "doctor_device_revoke_failed",
      "Dispozitivul nu a putut fi eliminat.",
      500
    );
  }

  const payload:
    DoctorDeviceMutationResponse = {
      success: true,
      deviceId:
        typeof data === "string"
          ? data
          : resolved.linkedDeviceId,
    };

  const response =
    NextResponse.json(
      payload,
      {
        status: 200,
        headers:
          noStoreHeaders(),
      }
    );

  clearDoctorDeviceCookie(
    response
  );

  return response;
}
