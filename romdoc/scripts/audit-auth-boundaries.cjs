#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");

const root = process.cwd();

const routeRoot = path.join(
  root,
  "src",
  "app",
  "api"
);

const configCandidates = [
  path.join(root, "next.config.js"),
  path.join(root, "next.config.mjs"),
  path.join(root, "next.config.ts"),
  path.join(root, "src", "proxy.ts"),
  path.join(root, "src", "middleware.ts"),
  path.join(root, "vercel.json"),
];

const ignoredDirectories = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
]);

const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];

  for (
    const entry of fs.readdirSync(
      directory,
      { withFileTypes: true }
    )
  ) {
    if (
      ignoredDirectories.has(
        entry.name
      )
    ) {
      continue;
    }

    const absolute =
      path.join(
        directory,
        entry.name
      );

    if (entry.isDirectory()) {
      files.push(
        ...walk(absolute)
      );

      continue;
    }

    if (
      sourceExtensions.has(
        path.extname(entry.name)
      )
    ) {
      files.push(absolute);
    }
  }

  return files;
}

function relative(file) {
  return path
    .relative(root, file)
    .replace(/\\/g, "/");
}

function lineNumber(
  source,
  index
) {
  return source
    .slice(0, index)
    .split("\n")
    .length;
}

function hasAny(
  source,
  values
) {
  return values.some(
    (value) =>
      source.includes(value)
  );
}

function printSection(
  title,
  rows
) {
  console.log(`\n${title}`);
  console.log(
    "-".repeat(title.length)
  );

  if (rows.length === 0) {
    console.log("✓ None");
    return;
  }

  for (const row of rows) {
    console.log(`- ${row}`);
  }
}

const routeFiles =
  walk(routeRoot).filter(
    (file) =>
      path.basename(file) ===
      "route.ts" ||
      path.basename(file) ===
      "route.js"
  );

const routeInventory = [];
const highRiskFindings = [];
const reviewFindings = [];

for (const file of routeFiles) {
  const source =
    fs.readFileSync(
      file,
      "utf8"
    );

  const methods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ].filter(
    (method) =>
      new RegExp(
        `export\\s+async\\s+function\\s+${method}\\s*\\(`
      ).test(source)
  );

  const isMutation =
    methods.some(
      (method) =>
        method !== "GET"
    );

  const isCron =
    relative(file).includes(
      "/api/cron/"
    );

  const isWebhook =
    relative(file).includes(
      "/api/stripe/webhook"
    ) ||
    source.includes(
      "stripe-signature"
    ) ||
    source.includes(
      "constructEvent"
    );

  const hasAuth =
    hasAny(
      source,
      [
        "auth.getUser",
        "requireAdmin",
        "requireDoctor",
        "requirePatient",
        "requireActiveProfile",
        "requireStaff",
      ]
    );

  const hasRoleCheck =
    hasAny(
      source,
      [
        'role !== "admin"',
        'role !== "doctor"',
        'role !== "patient"',
        'role !== "staff"',
        'role === "admin"',
        'role === "doctor"',
        'role === "patient"',
        'role === "staff"',
        "is_admin",
      ]
    );

  const hasRateLimit =
    source.includes(
      "consumeRateLimit"
    );

  const hasOriginCheck =
    hasAny(
      source,
      [
        "request.headers.get(\"origin\")",
        "request.headers.get('origin')",
        "assertSameOrigin",
        "validateRequestOrigin",
        "verifySameOrigin",
      ]
    );

  const hasJsonParsing =
    hasAny(
      source,
      [
        "request.json()",
        "request.formData()",
        "request.text()",
      ]
    );

  const hasValidation =
    hasAny(
      source,
      [
        "typeof ",
        "instanceof File",
        "isUuid(",
        "normalize",
        "validate",
        "allowedMimeTypes",
        "allowedDocumentTypes",
      ]
    );

  const hasAdminClient =
    source.includes(
      "createAdminClient"
    );

  const hasCronSecret =
    hasAny(
      source,
      [
        "CRON_SECRET",
        "x-cron-secret",
        "Bearer ",
        "authorization",
      ]
    );

  const hasStripeSignature =
    source.includes(
      "stripe-signature"
    ) &&
    source.includes(
      "constructEvent"
    );

  const hasNoStore =
    source.includes(
      "Cache-Control"
    ) &&
    source.includes(
      "no-store"
    );

  routeInventory.push(
    [
      relative(file),
      methods.join(",") || "unknown",
      hasAuth ? "auth" : "no-auth",
      hasRoleCheck
        ? "role-check"
        : "no-role-check",
      hasRateLimit
        ? "rate-limit"
        : "no-rate-limit",
      isCron ? "cron" : "",
      isWebhook ? "webhook" : "",
    ]
      .filter(Boolean)
      .join(" | ")
  );

  if (
    isMutation &&
    !isWebhook &&
    !isCron &&
    !hasAuth
  ) {
    highRiskFindings.push(
      `${relative(file)} — mutation route has no obvious authentication`
    );
  }

  if (
    isMutation &&
    hasAdminClient &&
    !hasAuth &&
    !isWebhook &&
    !isCron
  ) {
    highRiskFindings.push(
      `${relative(file)} — admin client used without obvious caller authentication`
    );
  }

  if (
    isCron &&
    !hasCronSecret
  ) {
    highRiskFindings.push(
      `${relative(file)} — cron route has no obvious secret verification`
    );
  }

  if (
    isWebhook &&
    !hasStripeSignature
  ) {
    highRiskFindings.push(
      `${relative(file)} — webhook route has no complete Stripe signature verification`
    );
  }

  if (
    isMutation &&
    hasJsonParsing &&
    !hasValidation
  ) {
    reviewFindings.push(
      `${relative(file)} — request body parsing found without obvious validation`
    );
  }

  if (
    isMutation &&
    hasAuth &&
    !hasOriginCheck &&
    !isWebhook &&
    !isCron
  ) {
    reviewFindings.push(
      `${relative(file)} — authenticated cookie-backed mutation has no explicit same-origin check`
    );
  }

  if (
    isMutation &&
    !hasRateLimit &&
    !isWebhook &&
    !isCron
  ) {
    reviewFindings.push(
      `${relative(file)} — mutation route has no visible persistent rate limit`
    );
  }

  if (
    hasAdminClient &&
    !hasRoleCheck &&
    !isWebhook &&
    !isCron
  ) {
    reviewFindings.push(
      `${relative(file)} — admin client used without an obvious role check in the same file`
    );
  }

  if (
    (source.includes(
      "createSignedUrl"
    ) ||
      source.includes(
        "signedUrl"
      )) &&
    !hasNoStore
  ) {
    reviewFindings.push(
      `${relative(file)} — signed/private URL response may be missing Cache-Control: no-store`
    );
  }
}

const headerFiles =
  configCandidates.filter(
    fs.existsSync
  );

const combinedConfig =
  headerFiles
    .map(
      (file) =>
        fs.readFileSync(
          file,
          "utf8"
        )
    )
    .join("\n");

const expectedHeaders = [
  {
    name:
      "Content-Security-Policy",
    patterns: [
      "Content-Security-Policy",
      "content-security-policy",
    ],
  },
  {
    name:
      "X-Content-Type-Options",
    patterns: [
      "X-Content-Type-Options",
      "x-content-type-options",
    ],
  },
  {
    name:
      "Referrer-Policy",
    patterns: [
      "Referrer-Policy",
      "referrer-policy",
    ],
  },
  {
    name:
      "Permissions-Policy",
    patterns: [
      "Permissions-Policy",
      "permissions-policy",
    ],
  },
  {
    name:
      "Strict-Transport-Security",
    patterns: [
      "Strict-Transport-Security",
      "strict-transport-security",
    ],
  },
  {
    name:
      "frame-ancestors or X-Frame-Options",
    patterns: [
      "frame-ancestors",
      "X-Frame-Options",
      "x-frame-options",
    ],
  },
];

const missingHeaders =
  expectedHeaders
    .filter(
      (header) =>
        !hasAny(
          combinedConfig,
          header.patterns
        )
    )
    .map(
      (header) =>
        header.name
    );

printSection(
  "API route inventory",
  routeInventory
);

printSection(
  "High-risk findings",
  highRiskFindings
);

printSection(
  "Review findings",
  reviewFindings
);

printSection(
  "Missing security headers",
  missingHeaders
);

console.log(
  "\nSummary"
);
console.log(
  "-------"
);
console.log(
  `API routes scanned: ${routeFiles.length}`
);
console.log(
  `High-risk findings: ${highRiskFindings.length}`
);
console.log(
  `Review findings: ${reviewFindings.length}`
);
console.log(
  `Missing headers: ${missingHeaders.length}`
);

if (
  highRiskFindings.length > 0
) {
  process.exitCode = 1;
}
