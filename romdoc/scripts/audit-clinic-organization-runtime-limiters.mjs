import {
  access,
  readFile,
  readdir,
} from "node:fs/promises";
import path from "node:path";

const projectRoot =
  process.cwd();

const apiRoot =
  path.join(
    projectRoot,
    "src",
    "app",
    "api",
    "clinic-manager"
  );

const migrationPath =
  path.join(
    projectRoot,
    "..",
    "database",
    "87-remove-api-rate-limits.sql"
  );

const forbiddenPatterns = [
  {
    label:
      "legacy rate-limit function",
    expression:
      /consume_api_rate_limit/i,
  },
  {
    label:
      "legacy rate-limit table",
    expression:
      /\bapi_rate_limits\b/i,
  },
  {
    label:
      "HTTP 429 application blocker",
    expression:
      /status\s*:\s*429\b/i,
  },
  {
    label:
      "rate-limited response code",
    expression:
      /\brate_limited\b/i,
  },
  {
    label:
      "quota-exceeded response code",
    expression:
      /\bquota_exceeded\b/i,
  },
  {
    label:
      "subscription-required blocker",
    expression:
      /\bsubscription_required\b/i,
  },
  {
    label:
      "payment-required blocker",
    expression:
      /\bpayment_required\b/i,
  },
  {
    label:
      "Doctor-count limit",
    expression:
      /\bdoctor_limit\b/i,
  },
  {
    label:
      "invitation-count limit",
    expression:
      /\binvitation_limit\b/i,
  },
  {
    label:
      "location-count limit",
    expression:
      /\blocation_limit\b/i,
  },
  {
    label:
      "SMS usage limit",
    expression:
      /\bsms_limit\b/i,
  },
  {
    label:
      "billing responsibility used as an assignment gate",
    expression:
      /payment_responsibility\s*!==?\s*["']clinic_paid["']/i,
  },
  {
    label:
      "coverage state used as an active-usage gate",
    expression:
      /coverage_status\s*!==?\s*["']active["']/i,
  },
];

async function exists(
  filePath
) {
  try {
    await access(
      filePath
    );

    return true;
  } catch {
    return false;
  }
}

async function collectFiles(
  directory
) {
  const entries =
    await readdir(
      directory,
      {
        withFileTypes:
          true,
      }
    );

  const files = [];

  for (
    const entry of entries
  ) {
    const fullPath =
      path.join(
        directory,
        entry.name
      );

    if (
      entry.isDirectory()
    ) {
      files.push(
        ...await collectFiles(
          fullPath
        )
      );

      continue;
    }

    if (
      entry.isFile() &&
      /\.(ts|tsx|js|mjs)$/.test(
        entry.name
      )
    ) {
      files.push(
        fullPath
      );
    }
  }

  return files;
}

async function main() {
  const packageFile =
    path.join(
      projectRoot,
      "package.json"
    );

  if (
    !(await exists(
      packageFile
    ))
  ) {
    throw new Error(
      "Run this audit from ROMDOC/romdoc."
    );
  }

  if (
    !(await exists(
      apiRoot
    ))
  ) {
    throw new Error(
      "Clinic Manager API directory was not found."
    );
  }

  if (
    !(await exists(
      migrationPath
    ))
  ) {
    throw new Error(
      "database/87-remove-api-rate-limits.sql was not found."
    );
  }

  const migration =
    await readFile(
      migrationPath,
      "utf8"
    );

  const migrationChecks = [
    "drop function if exists",
    "public.consume_api_rate_limit",
    "drop table if exists",
    "public.api_rate_limits",
  ];

  for (
    const check of
    migrationChecks
  ) {
    if (
      !migration
        .toLowerCase()
        .includes(
          check.toLowerCase()
        )
    ) {
      throw new Error(
        `Migration 87 is missing: ${check}`
      );
    }
  }

  const files =
    await collectFiles(
      apiRoot
    );

  const findings = [];

  for (
    const file of files
  ) {
    const source =
      await readFile(
        file,
        "utf8"
      );

    for (
      const pattern of
      forbiddenPatterns
    ) {
      if (
        pattern.expression
          .test(
            source
          )
      ) {
        findings.push({
          file:
            path.relative(
              projectRoot,
              file
            ).replaceAll(
              "\\",
              "/"
            ),
          label:
            pattern.label,
        });
      }
    }
  }

  if (
    findings.length > 0
  ) {
    console.error(
      "\nClinic Organisation usage-blocker audit failed:\n"
    );

    for (
      const finding of
      findings
    ) {
      console.error(
        `- ${finding.file}: ${finding.label}`
      );
    }

    process.exitCode =
      1;

    return;
  }

  console.log(
    "\nClinic Organisation usage-blocker audit passed."
  );

  console.log(
    `Scanned ${files.length} Clinic Manager API files.`
  );

  console.log(
    "No custom 429, quota, subscription-state, payment-state, billing-responsibility or coverage-state usage blocker was found."
  );

  console.log(
    "Migration 87 still removes the legacy custom API rate-limit function and table."
  );

  console.log(
    "Authentication, active membership, active organisation status and approved-location rules remain outside this audit and must remain enforced."
  );
}

main().catch(
  (
    error
  ) => {
    console.error(
      "\nClinic Organisation usage-blocker audit could not run:"
    );

    console.error(
      error instanceof
        Error
        ? error.message
        : error
    );

    process.exitCode =
      1;
  }
);
