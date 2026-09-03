Project: RomDoc

Stack:
- Next.js
- Supabase/PostgreSQL
- Vercel
- Supabase Auth/Storage
- Stripe
- Resend
- next-intl
- Romanian / English / German

Development rules:
- Keep solutions simple. Do not over-engineer.
- Inspect existing implementation before modifying it.
- Preserve existing role and security boundaries.
- Never commit or push to GitHub unless explicitly requested.
- Always create SQL migrations for database schema changes.
- Never put secrets in repository files.
- Run npm build after relevant application changes.
Do not commit.
Do not push.
Do not create pull requests.
The user performs Git commits and pushes manually.


Telehealth:
- Professional verification is completely separate from telehealth.
- Never use verification_status in telehealth eligibility.
- Doctor decides whether remote care is appropriate.
- No specialty/service eligibility authority in RomDoc.
- Patient may choose in-person or video where offered.
- Independent doctor controls own telehealth price and Stripe relationship.
- Clinic organisation controls price and Stripe relationship for clinic-invited doctors.
- Payment application fee = 0.
- Payment recipient issues invoice/receipt.
- Payment recipient handles refunds.
- Daily is the video provider.
- Video/audio are never recorded or stored.
- Make this explicit to Patient and Doctor.
- Desktop video opens in a modal.
- Mobile video opens in a new tab.
- Patient and Doctor use the same RomDoc appointment video URL.
- Room remains available through appointment date + 1 day.
- Admin can restrict telehealth for individual Doctor accounts.