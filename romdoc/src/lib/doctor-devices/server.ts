import {
  createHash,
  randomBytes,
} from "node:crypto";

import type {
  NextResponse,
} from "next/server";

import {
  isDoctorDeviceCredential,
} from "@/lib/doctor-linked-devices";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const DOCTOR_DEVICE_COOKIE_NAME =
  "romdoc_doctor_device";

const DOCTOR_DEVICE_COOKIE_MAX_AGE =
  60 * 60 * 24 * 365;

export type ResolvedDoctorLinkedDevice = {
  linkedDeviceId: string;
  doctorId: string;
  doctorProfileId: string;
  deviceName: string;
  credentialHint: string;
  linkedAt: string;
  lastUsedAt: string;
  doctorSlug: string;
  doctorFirstName: string | null;
  doctorLastName: string | null;
};

type ResolvedDeviceRpcRow = {
  linked_device_id: string;
  doctor_id: string;
  doctor_profile_id: string;
  device_name: string;
  credential_hint: string;
  linked_at: string;
  last_used_at: string;
  doctor_slug: string;
  doctor_first_name: string | null;
  doctor_last_name: string | null;
};

export function createDoctorDevicePairingToken() {
  return `rdpair_${randomBytes(32).toString("base64url")}`;
}

export function createDoctorDeviceCredential() {
  return `rddv_${randomBytes(32).toString("base64url")}`;
}

export function hashDoctorDeviceSecret(
  value: string
) {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

export function getDoctorDeviceTokenHint(
  value: string
) {
  return value.slice(-8);
}

export function summarizeUserAgent(
  value: string | null
) {
  const normalized =
    value
      ?.replace(/\s+/g, " ")
      .trim() ??
    "";

  return normalized
    ? normalized.slice(0, 255)
    : null;
}

export function getRomDocSiteUrl(
  requestOrigin?: string
) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    "";

  if (configured.trim()) {
    return configured
      .trim()
      .replace(/\/$/, "");
  }

  if (requestOrigin?.trim()) {
    return requestOrigin
      .trim()
      .replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
      .replace(/\/$/, "");
  }

  return "https://www.romdoc.fit";
}

export function setDoctorDeviceCookie(
  response: NextResponse,
  credential: string
) {
  response.cookies.set({
    name: DOCTOR_DEVICE_COOKIE_NAME,
    value: credential,
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax",
    path: "/api/doctor/mobile",
    maxAge:
      DOCTOR_DEVICE_COOKIE_MAX_AGE,
  });
}

export function clearDoctorDeviceCookie(
  response: NextResponse
) {
  response.cookies.set({
    name: DOCTOR_DEVICE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax",
    path: "/api/doctor/mobile",
    maxAge: 0,
  });
}

export async function requireActiveDoctorContext() {
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
    return {
      ok: false,
      status: 401,
      error:
        "authentication_required",
      message:
        "Trebuie să fii autentificat.",
    } as const;
  }

  const [
    profileResult,
    doctorResult,
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "role, account_status"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("doctors")
        .select(
          "id, slug, status"
        )
        .eq(
          "profile_id",
          user.id
        )
        .maybeSingle(),
    ]);

  const profile =
    profileResult.data;
  const doctor =
    doctorResult.data;

  if (
    profileResult.error ||
    doctorResult.error ||
    !profile ||
    !doctor ||
    profile.role !== "doctor" ||
    profile.account_status !==
      "active" ||
    doctor.status !== "active"
  ) {
    return {
      ok: false,
      status: 403,
      error:
        "active_doctor_account_required",
      message:
        "Este necesar un cont activ de medic.",
    } as const;
  }

  return {
    ok: true,
    supabase,
    user,
    doctor: {
      id: doctor.id,
      slug: doctor.slug,
    },
  } as const;
}

export async function resolveDoctorLinkedDeviceCredential(
  credential: string
): Promise<
  ResolvedDoctorLinkedDevice |
  null
> {
  if (
    !isDoctorDeviceCredential(
      credential
    )
  ) {
    return null;
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "resolve_doctor_linked_device",
      {
        target_credential_hash:
          hashDoctorDeviceSecret(
            credential
          ),
      }
    );

  if (error) {
    console.error(
      "Doctor linked-device resolution failed:",
      error
    );
    return null;
  }

  const row =
    (
      Array.isArray(data)
        ? data[0]
        : data
    ) as
      ResolvedDeviceRpcRow |
      null;

  if (!row) {
    return null;
  }

  return {
    linkedDeviceId:
      row.linked_device_id,
    doctorId:
      row.doctor_id,
    doctorProfileId:
      row.doctor_profile_id,
    deviceName:
      row.device_name,
    credentialHint:
      row.credential_hint,
    linkedAt:
      row.linked_at,
    lastUsedAt:
      row.last_used_at,
    doctorSlug:
      row.doctor_slug,
    doctorFirstName:
      row.doctor_first_name,
    doctorLastName:
      row.doctor_last_name,
  };
}
