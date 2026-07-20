import fs from "node:fs";
import path from "node:path";

const root =
  process.cwd();

const checks = [];

function read(relativePath) {
  const fullPath =
    path.join(
      root,
      relativePath
    );

  if (
    !fs.existsSync(
      fullPath
    )
  ) {
    throw new Error(
      `Missing required file: ${relativePath}`
    );
  }

  return fs.readFileSync(
    fullPath,
    "utf8"
  );
}

function requireText(
  file,
  text,
  message
) {
  checks.push({
    ok:
      file.includes(
        text
      ),
    message,
  });
}

function forbidPattern(
  file,
  pattern,
  message
) {
  checks.push({
    ok:
      !pattern.test(
        file
      ),
    message,
  });
}

const placeDetails =
  read(
    "src/lib/google-maps/get-place-details.ts"
  );

const loader =
  read(
    "src/lib/google-maps/load-google-maps.ts"
  );

const clinicAutocomplete =
  read(
    "src/components/clinic/google-place-autocomplete.tsx"
  );

const cityMatcher =
  read(
    "src/lib/locations/match-or-create-city.ts"
  );

const routing =
  read(
    "src/i18n/routing.ts"
  );

const routeWrapper =
  read(
    "src/app/[locale]/medici/cautare/page.tsx"
  );

const nearbyApi =
  read(
    "src/app/api/public/doctors/nearby/route.ts"
  );

const clinicMapApi =
  read(
    "src/app/api/public/clinics/map/route.ts"
  );

forbidPattern(
  placeDetails,
  /countryCode\s*!==\s*["']RO["']/,
  "Place Details does not reject non-RO countries"
);

forbidPattern(
  clinicAutocomplete,
  /includedRegionCodes\s*:\s*\[\s*["']ro["']/,
  "Clinic autocomplete is not restricted to Romania"
);

forbidPattern(
  loader,
  /\bregion\s*:\s*["']RO["']/,
  "Google Maps loader does not force region=RO"
);

forbidPattern(
  loader,
  /\blanguage\s*:\s*["']ro["']/,
  "Google Maps loader does not force Romanian"
);

requireText(
  placeDetails,
  '"languageCode",\n    locale',
  "Place Details uses the requested RomDoc locale"
);

requireText(
  cityMatcher,
  'return `${baseSlug}-${countryCode.toLowerCase()}`;',
  "Non-Romanian city slugs include the country code"
);

requireText(
  routing,
  '"/medici/cautare"',
  "Geographic Doctor search has a localized pathname"
);

requireText(
  routing,
  'en: "/doctors/search"',
  "English Doctor-search pathname exists"
);

requireText(
  routing,
  'de: "/aerzte/suche"',
  "German Doctor-search pathname exists"
);

requireText(
  routeWrapper,
  'from "@/app/medici/cautare/page"',
  "Localized search route wrapper exists"
);

requireText(
  nearbyApi,
  "normalizeAppLocale",
  "Nearby Doctor API selects the requested locale"
);

requireText(
  clinicMapApi,
  "getRequestAppLocale",
  "Clinic-map API resolves the public-page locale"
);

const failed =
  checks.filter(
    (
      check
    ) =>
      !check.ok
  );

for (
  const check of
    checks
) {
  console.log(
    `${check.ok ? "PASS" : "FAIL"}: ${check.message}`
  );
}

if (
  failed.length >
  0
) {
  console.error(
    `\nInternational Places audit failed: ${failed.length} check(s).`
  );

  process.exit(1);
}

console.log(
  `\nInternational Places audit passed: ${checks.length} checks.`
);
