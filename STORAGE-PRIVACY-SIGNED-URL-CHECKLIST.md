# Step 66C — Storage privacy and signed-URL audit checklist

## Known RomDoc buckets

Review at least:

- `doctor-profile-photos`
- `doctor-photo-staging`
- `doctor-verification-documents`
- `patient-medical-folder`

Expected privacy:

| Bucket | Expected |
|---|---|
| `doctor-profile-photos` | Public, final approved profile images only |
| `doctor-photo-staging` | Private |
| `doctor-verification-documents` | Private |
| `patient-medical-folder` | Private |

## Signed URL targets

### Doctor medical-document download

Expected route:

`ROMDOC/romdoc/src/app/api/doctor/patient-folder/download/route.ts`

Required:

- authenticated user;
- doctor access RPC before admin lookup;
- exact document ID validation;
- deleted documents rejected;
- file content only;
- signed URL generated with admin client only after authorization;
- TTL no more than 60–300 seconds;
- download event recorded;
- URL never persisted in the database.

Current observed TTL: **60 seconds**.

### Admin verification-document download

Expected route:

`ROMDOC/romdoc/src/app/api/admin/verifications/route.ts`

Required:

- authenticated active admin;
- document existence check;
- deleted documents rejected;
- private bucket;
- signed URL TTL no more than 300 seconds;
- URL never written to logs or database.

Current observed TTL: **300 seconds**.

## General signed URL rules

- Never use `getPublicUrl` for a private bucket.
- Never store a signed URL in a table.
- Never include a signed URL in email, logs, analytics, or audit metadata unless explicitly justified.
- Generate a new URL only after authorization.
- Authorize the database metadata row before calling the admin storage client.
- Reject client-supplied bucket names and storage paths whenever possible.
- Prefer a database document ID as the client input.
- Read the trusted bucket and object path from the authorized database row.
- Use download disposition for sensitive files.
- Use 60 seconds for medical documents when practical.
- Use at most 300 seconds for admin verification review.
- Do not cache signed-URL API responses.
- Add `Cache-Control: no-store` to routes returning signed URLs.
- Avoid returning both raw object paths and signed URLs to clients.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.

## Upload rules

- Authenticate before reading the file body where practical.
- Restrict MIME type.
- Restrict file size.
- Generate random object names.
- Do not place email, phone, CNP, patient name, or original filename in the storage path.
- Set `upsert: false` unless replacement is intentional.
- Insert metadata only after upload succeeds.
- Remove the uploaded object if metadata insertion fails.
- Validate document ownership before deletion.
- Do not allow clients to choose arbitrary bucket IDs.
- Consider server-side content inspection for high-risk documents in a later phase.

## Profile photo rules

- Staging bucket must remain private.
- Final public bucket must contain only approved doctor profile images.
- Strip EXIF metadata before public publication where practical.
- Do not publish identity-document images as profile images.
- Use randomized filenames.
- Restrict MIME types to supported images.
- Restrict maximum dimensions and file size.
- Delete replaced public images when no longer referenced.

## Medical-folder rules

- Patients may access only their own records.
- Doctors require an active, valid share or appointment-based authorization.
- Staff must have no medical-folder access.
- Admin access should be exceptional and audited.
- Only the uploading doctor may delete a doctor-uploaded item.
- Patient revocation must block generation of new signed URLs.
- Existing signed URLs remain usable until TTL expiry; keep TTL short.
- Every doctor download should create an audit event.
- Deleted or expired documents must never receive a new signed URL.

## Browser tests

Use test accounts and non-sensitive files.

1. Logged-out request to every signed-URL route → `401`.
2. Patient A requesting Patient B file → `403` or `404`.
3. Doctor without share requesting a file → `403`.
4. Doctor with valid share requesting a file → success.
5. Revoke share, request again → `403`.
6. Existing URL expires after its documented TTL.
7. Deleted metadata row or soft-deleted document → no URL.
8. Alter document ID → no unauthorized URL.
9. Attempt direct Supabase public URL for private bucket → denied.
10. Staff account medical-folder attempt → denied.
11. Admin verification download works only for active admin.
12. Blocked admin or doctor cannot generate new URL.

## Completion criteria

Step 66C audit is complete when:

- sensitive public bucket count is zero;
- no public URL call targets a private bucket;
- no signed URL route lacks authentication and object-level authorization;
- all medical signed URLs use a TTL no greater than 300 seconds;
- private storage metadata has no missing objects;
- orphan objects are reviewed;
- service-role keys do not appear in client components;
- all signed-URL responses use `Cache-Control: no-store`;
- browser isolation tests pass.
