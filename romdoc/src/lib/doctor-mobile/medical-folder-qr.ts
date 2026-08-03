import {
  isAnyMedicalFolderShareToken,
} from "@/lib/medical-folder-share-grants";

const MEDICAL_FOLDER_SHARE_PATH =
  "/share/medical-folder";

export type ParsedMedicalFolderQr = {
  token: string;
  source:
    | "raw_token"
    | "secure_url";
};

export function parseMedicalFolderQrValue(
  value: string
): ParsedMedicalFolderQr | null {
  const normalized =
    value.trim();

  if (
    isAnyMedicalFolderShareToken(
      normalized
    )
  ) {
    return {
      token: normalized,
      source: "raw_token",
    };
  }

  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  if (
    url.pathname !==
      MEDICAL_FOLDER_SHARE_PATH
  ) {
    return null;
  }

  const fragment =
    new URLSearchParams(
      url.hash.replace(/^#/, "")
    );

  const token =
    fragment.get("token") ??
    url.searchParams.get("token") ??
    "";

  if (
    !isAnyMedicalFolderShareToken(
      token
    )
  ) {
    return null;
  }

  return {
    token,
    source: "secure_url",
  };
}
