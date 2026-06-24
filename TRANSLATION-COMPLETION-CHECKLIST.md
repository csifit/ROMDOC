# RomDoc translation completion checklist

Use this checklist after running both audits.

## Public routes

- `/ro`
- `/en`
- `/ro/medici`
- `/en/doctors`
- `/ro/medici/[specialty]`
- `/en/doctors/[specialty]`
- `/ro/medici/[specialty]/[city]`
- `/en/doctors/[specialty]/[city]`
- `/ro/doctor/[slug]`
- `/en/doctor/[slug]`
- `/ro/specialitati`
- `/en/specialties`
- `/ro/ghid-pacienti`
- `/en/patient-guide`

For each pair, verify:

- visible headings use the selected locale;
- buttons and links use the selected locale;
- empty-state text uses the selected locale;
- form labels and validation messages use the selected locale;
- dates and numbers use the appropriate locale;
- internal links stay in the same locale;
- language switching preserves the logical page;
- metadata title and description use the selected locale;
- canonical points to the current locale;
- `hreflang` links to the alternate locale;
- structured data uses the selected locale where translations exist.

## Database entities

For all active or approved public entities, verify both `ro` and `en` rows:

- doctors;
- clinics;
- specialties;
- cities.

## Translation quality

- Do not copy Romanian text into an English row as a final translation.
- Keep professional titles medically accurate.
- Avoid translating proper names and stable doctor slugs.
- Use natural phrases rather than literal word-for-word translations.
- Keep meta descriptions factual and under approximately 160 characters.
- Avoid guarantees such as “best doctor” unless supported and legally appropriate.
- Preserve Romanian diacritics.
- Review English medical terminology manually.

## Completion rule

Step 65G is complete only when:

1. `npm run translations:audit` reports zero message-file errors;
2. every hardcoded-text finding is reviewed;
3. the SQL audit has no missing required locale rows for public entities;
4. every English public route is manually spot-checked;
5. `npm run build` succeeds.
