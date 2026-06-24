# Step 66D route changes

Apply these exact changes after creating:

- `ROMDOC/romdoc/src/lib/security/upload-policy.ts`
- `ROMDOC/romdoc/src/lib/security/rate-limit.ts`

---

## A. Doctor profile photo upload

Exact file:

`ROMDOC/romdoc/src/app/api/doctor/photo/route.ts`

### Replace the imports

Add:

```ts
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  validateUploadFile,
} from "@/lib/security/upload-policy";
```

### Delete these declarations

```ts
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
```

### Change the POST signature

From:

```ts
export async function POST(request: Request): Promise<Response>
```

To:

```ts
export async function POST(
  request: NextRequest
): Promise<Response>
```

Also change the Next.js import to:

```ts
import {
  NextRequest,
  NextResponse,
} from "next/server";
```

### Immediately after successful doctor authorization

Add:

```ts
const rateLimit =
  await consumeRateLimit({
    namespace:
      "doctor-photo-upload",
    identifier:
      authorization.doctor.profile_id,
    limit: 10,
    windowSeconds: 60 * 60,
  });

if (!rateLimit.allowed) {
  return rateLimitResponse(
    rateLimit
  );
}
```

### Replace file validation

Replace the MIME and size checks with:

```ts
const validation =
  validateUploadFile({
    file,
    allowedMimeTypes:
      ALLOWED_IMAGE_MIME_TYPES,
    emptyMessage:
      "Selectează o fotografie.",
    typeMessage:
      "Fotografia trebuie să fie JPG, PNG sau WebP.",
  });

if (!validation.ok) {
  return NextResponse.json(
    {
      error:
        validation.error,
    },
    {
      status: 400,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
```

### Replace staged-size check

Change:

```ts
stagedBytes.byteLength > MAX_FILE_SIZE
```

to:

```ts
stagedBytes.byteLength > MAX_UPLOAD_BYTES
```

The maximum user-facing size is now `2 MB`.

---

## B. Doctor verification document upload

Exact file:

`ROMDOC/romdoc/src/app/api/doctor/verification/documents/route.ts`

### Add imports

```ts
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_UPLOAD_LABEL,
  validateUploadFile,
} from "@/lib/security/upload-policy";
```

### Delete

```ts
const MAX_FILE_SIZE = 10 * 1024 * 1024;
```

and delete the local `allowedMimeTypes` set.

### Immediately after successful doctor authorization

Add:

```ts
const rateLimit =
  await consumeRateLimit({
    namespace:
      "doctor-verification-upload",
    identifier: user.id,
    limit: 20,
    windowSeconds: 60 * 60,
  });

if (!rateLimit.allowed) {
  return rateLimitResponse(
    rateLimit
  );
}
```

### Replace MIME and size checks

Use:

```ts
const validation =
  validateUploadFile({
    file: fileValue,
    allowedMimeTypes:
      ALLOWED_DOCUMENT_MIME_TYPES,
    emptyMessage:
      "Selectează un document pentru încărcare.",
    typeMessage:
      "Sunt acceptate numai fișiere PDF, JPEG, PNG sau WebP.",
  });

if (!validation.ok) {
  return NextResponse.json(
    {
      error:
        validation.error,
    },
    {
      status: 400,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
```

Remove the old text that says `10 MB`.

---

## C. Doctor medical-folder upload

Exact file:

`ROMDOC/romdoc/src/app/api/doctor/patient-folder/route.ts`

### Add imports

```ts
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
} from "@/lib/security/upload-policy";
```

### Replace

```ts
const MAX_FILE_SIZE =
  20 * 1024 * 1024;
```

with:

```ts
const MAX_FILE_SIZE =
  MAX_UPLOAD_BYTES;
```

### Replace the local MIME set

Replace:

```ts
const allowedMimeTypes =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
```

with:

```ts
const allowedMimeTypes =
  ALLOWED_DOCUMENT_MIME_TYPES;
```

### Immediately after successful doctor authorization in POST

Add:

```ts
const rateLimit =
  await consumeRateLimit({
    namespace:
      "doctor-medical-folder-upload",
    identifier:
      result.authorization.userId,
    limit: 30,
    windowSeconds: 60 * 60,
  });

if (!rateLimit.allowed) {
  return rateLimitResponse(
    rateLimit
  );
}
```

### Replace the 20 MB error text

From:

```ts
"Sunt acceptate fișiere PDF, JPEG, PNG sau WebP de maximum 20 MB."
```

To:

```ts
`Sunt acceptate fișiere PDF, JPEG, PNG sau WebP de maximum ${MAX_UPLOAD_LABEL}.`
```

Also add the missing empty-size rejection:

```ts
file.size <= 0 ||
```

so the full condition becomes:

```ts
if (
  !allowedMimeTypes.has(file.type) ||
  file.size <= 0 ||
  file.size > MAX_FILE_SIZE
) {
```

---

## D. Stripe checkout abuse protection

Exact file:

`ROMDOC/romdoc/src/app/api/stripe/create-checkout-session/route.ts`

### Add imports

```ts
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
```

### After authentication and email confirmation

Add:

```ts
const rateLimit =
  await consumeRateLimit({
    namespace:
      "stripe-doctor-checkout",
    identifier: user.id,
    limit: 8,
    windowSeconds: 15 * 60,
  });

if (!rateLimit.allowed) {
  return rateLimitResponse(
    rateLimit
  );
}
```

This allows eight checkout-session attempts per account per 15 minutes.

---

## E. Signed URL no-cache response

Exact file:

`ROMDOC/romdoc/src/app/api/doctor/patient-folder/download/route.ts`

Replace the final response with:

```ts
return NextResponse.json(
  {
    signedUrl:
      signed.signedUrl,
    expiresIn:
      URL_TTL_SECONDS,
  },
  {
    headers: {
      "Cache-Control":
        "no-store",
    },
  }
);
```

Exact file:

`ROMDOC/romdoc/src/app/api/admin/verifications/route.ts`

For the signed-URL response, add:

```ts
{
  headers: {
    "Cache-Control":
      "no-store",
  },
}
```

to `NextResponse.json`.

---

## F. Client-side labels

Search the project for:

```text
5 MB
10 MB
20 MB
```

Replace upload guidance with:

```text
2 MB
```

Likely components include:

- `ROMDOC/romdoc/src/components/doctor/doctor-photo-manager.tsx`
- `ROMDOC/romdoc/src/components/doctor/doctor-verification-form.tsx`
- `ROMDOC/romdoc/src/components/doctor/doctor-patient-folder-manager.tsx`

Client checks improve UX, but server and bucket checks remain authoritative.
