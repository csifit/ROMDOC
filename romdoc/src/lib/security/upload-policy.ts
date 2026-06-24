export const MAX_UPLOAD_BYTES =
  2 * 1024 * 1024;

export const MAX_UPLOAD_LABEL =
  "2 MB";

export const ALLOWED_IMAGE_MIME_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

export const ALLOWED_DOCUMENT_MIME_TYPES =
  new Set([
    "application/pdf",
    ...ALLOWED_IMAGE_MIME_TYPES,
  ]);

type UploadValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export function validateUploadFile({
  file,
  allowedMimeTypes,
  emptyMessage,
  typeMessage,
}: {
  file: File;
  allowedMimeTypes:
    ReadonlySet<string>;
  emptyMessage: string;
  typeMessage: string;
}): UploadValidationResult {
  if (file.size <= 0) {
    return {
      ok: false,
      error: emptyMessage,
    };
  }

  if (
    !allowedMimeTypes.has(
      file.type
    )
  ) {
    return {
      ok: false,
      error: typeMessage,
    };
  }

  if (
    file.size >
    MAX_UPLOAD_BYTES
  ) {
    return {
      ok: false,
      error:
        `Fișierul trebuie să aibă maximum ${MAX_UPLOAD_LABEL}.`,
    };
  }

  return {
    ok: true,
  };
}
