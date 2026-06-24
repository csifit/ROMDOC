# Step 66E — Authentication, CSRF, webhook/cron, and security-header checklist

## 1. Authentication and authorization

Every mutation route must be placed into exactly one category:

1. authenticated patient;
2. authenticated doctor;
3. authenticated staff;
4. authenticated admin;
5. signed Stripe webhook;
6. secret-authenticated cron;
7. intentionally public, rate-limited action.

For authenticated routes verify:

- `supabase.auth.getUser()` is used server-side;
- profile status is active;
- blocked users are rejected;
- role is checked;
- resource ownership is checked;
- service-role client is created only after authorization;
- client-supplied profile IDs are not trusted as identity.

## 2. CSRF and same-origin protection

Cookie-authenticated POST, PUT, PATCH, and DELETE routes should validate the request origin.

Recommended rule:

- accept requests whose `Origin` matches `NEXT_PUBLIC_SITE_URL`;
- in local development, also accept `request.nextUrl.origin`;
- reject missing or foreign origins for browser mutation routes;
- exempt Stripe webhooks and secret-authenticated cron routes;
- do not rely only on `Referer`;
- continue using `SameSite=Lax` or stricter auth cookies.

Test:

- valid same-origin browser request succeeds;
- foreign `Origin` receives `403`;
- Stripe webhook still succeeds;
- Vercel cron still succeeds.

## 3. Stripe webhook

Exact route:

`ROMDOC/romdoc/src/app/api/stripe/webhook/route.ts`

Required:

- raw body read with `request.text()`;
- `stripe-signature` header required;
- `stripe.webhooks.constructEvent()` used;
- invalid signature rejected before database access;
- service-role client created only after signature verification;
- webhook event ID stored for idempotency;
- duplicate event does not repeat business mutations;
- response does not expose internal errors or secrets;
- route must not use normal JSON body parsing before signature verification.

## 4. Cron endpoints

Review every route under:

`ROMDOC/romdoc/src/app/api/cron/`

Required:

- `Authorization: Bearer ${CRON_SECRET}` or equivalent strong secret;
- comparison is exact;
- missing secret fails closed;
- secret is server-only;
- endpoint does not accept user-controlled role/profile IDs;
- service-role client is used only after secret verification;
- response uses `Cache-Control: no-store`;
- route is not usable through ordinary browser authentication.

Known likely routes:

- verification expiration;
- medical-folder cleanup;
- appointment reminders.

## 5. Security headers

Recommended production headers:

- `Content-Security-Policy`;
- `Strict-Transport-Security`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy`;
- `frame-ancestors 'none'` or a deliberate allowlist;
- optionally `Cross-Origin-Opener-Policy`.

CSP must account for:

- Stripe Checkout;
- Google Maps and Places;
- Supabase;
- Resend has no browser requirement;
- images from the configured Supabase project;
- Next.js scripts and styles.

Do not copy a restrictive CSP into production without testing Google Maps, Stripe, images, and authentication.

## 6. Session and cookie checks

Verify Supabase SSR cookie handling:

- cookies are `Secure` in production;
- `HttpOnly` where controlled by the auth library;
- SameSite is not `None` unless required;
- logout clears the session;
- blocked accounts are signed out;
- no access token is placed in localStorage by custom code;
- service-role key never appears in client bundles.

## 7. Request validation

For every mutation route verify:

- JSON parse errors return `400`;
- content type is expected;
- UUIDs are validated;
- enums are allowlisted;
- strings have maximum lengths;
- numbers have min/max bounds;
- arrays have maximum item counts;
- file MIME and size are validated;
- database errors are not returned verbatim;
- unknown request fields are ignored or rejected intentionally.

## 8. Abuse protection

Prioritize persistent rate limits for:

- registration;
- login-adjacent email actions;
- appointment creation;
- review submission;
- contact/support forms;
- doctor application;
- upload routes;
- signed URL generation;
- Stripe checkout creation;
- Google Places proxy endpoints.

Webhook and cron endpoints use signatures/secrets rather than user-based rate limiting, but may still benefit from platform-level protection.

## 9. Completion criteria

Step 66E audit is complete when:

- no mutation route lacks a documented authentication category;
- no ordinary mutation route uses the admin client before authorization;
- every cron route verifies `CRON_SECRET`;
- Stripe webhook verifies the signature before database access;
- foreign-origin mutation requests are rejected;
- required security headers are present and tested;
- no service-role key is reachable from browser code;
- all high-risk script findings are resolved or documented;
- `npm run build` succeeds.
