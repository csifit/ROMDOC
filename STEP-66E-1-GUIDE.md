# Step 66E-1 — Selected API rate limits

## Limits

| Endpoint | Limit |
|---|---:|
| Google Places details | 60 requests per IP per 30 minutes |
| Medical PDF generation | 20 requests per authenticated account per hour |
| Patient document share/revoke | 30 changes per patient per hour |
| Patient appointment scheduling | 10 requests per patient per hour |

## Replace these complete files

- `ROMDOC/romdoc/src/app/api/google/places/details/route.ts`
- `ROMDOC/romdoc/src/app/api/medical-folder/pdf/route.ts`
- `ROMDOC/romdoc/src/app/api/patient/folder/shares/route.ts`

## Patch the appointment route

Place:

`ROMDOC/romdoc/scripts/apply-step66e1-appointment-rate-limit.cjs`

Run from `ROMDOC/romdoc`:

```bash
node scripts/apply-step66e1-appointment-rate-limit.cjs
```

The script modifies:

`ROMDOC/romdoc/src/app/api/appointments/route.ts`

## Prerequisites

These must already exist:

- `ROMDOC/romdoc/src/lib/security/rate-limit.ts`
- Supabase RPC `consume_api_rate_limit`
- table `public.api_rate_limits`

## Test

```bash
cd ROMDOC/romdoc
npm run build
npm run dev
```
