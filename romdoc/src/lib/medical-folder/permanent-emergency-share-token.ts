import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  isPermanentEmergencyShareToken,
  isUuid,
  permanentEmergencyShareTokenHint,
} from "@/lib/medical-folder-share-grants";

const TOKEN_CONTEXT =
  "romdoc-permanent-emergency-share:v1";

function emergencyShareSecret() {
  const secret =
    process.env
      .MEDICAL_FOLDER_EMERGENCY_SHARE_SECRET
      ?.trim() ?? "";

  if (secret.length < 32) {
    throw new Error(
      "permanent_emergency_share_secret_missing"
    );
  }

  return secret;
}

function compactGrantId(
  grantId: string
) {
  return grantId
    .toLowerCase()
    .replaceAll("-", "");
}

function expandGrantId(
  compact: string
) {
  const grantId = [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join("-");

  return isUuid(grantId)
    ? grantId
    : null;
}

function signatureFor(
  grantId: string
) {
  return createHmac(
    "sha256",
    emergencyShareSecret()
  )
    .update(
      `${TOKEN_CONTEXT}:${grantId}`,
      "utf8"
    )
    .digest("hex");
}

export function createPermanentEmergencyShareToken(
  grantId: string
) {
  if (!isUuid(grantId)) {
    throw new Error(
      "invalid_permanent_emergency_share_grant_id"
    );
  }

  const normalizedGrantId =
    grantId.trim().toLowerCase();

  return `rdem_${compactGrantId(
    normalizedGrantId
  )}_${signatureFor(
    normalizedGrantId
  )}`;
}

export function verifyPermanentEmergencyShareToken(
  value: unknown
) {
  if (
    !isPermanentEmergencyShareToken(
      value
    )
  ) {
    return null;
  }

  const [
    ,
    compactId,
    suppliedSignature,
  ] = value.split("_");

  const grantId =
    expandGrantId(
      compactId
    );

  if (!grantId) {
    return null;
  }

  const expectedSignature =
    signatureFor(grantId);

  const suppliedBuffer =
    Buffer.from(
      suppliedSignature,
      "hex"
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "hex"
    );

  if (
    suppliedBuffer.length !==
      expectedBuffer.length ||
    !timingSafeEqual(
      suppliedBuffer,
      expectedBuffer
    )
  ) {
    return null;
  }

  return {
    grantId,
    tokenHint:
      permanentEmergencyShareTokenHint(
        value
      ) ?? "rdem_",
  };
}
