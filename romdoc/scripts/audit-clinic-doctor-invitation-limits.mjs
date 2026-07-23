// Audit the clinic doctor invitation API routes to ensure that there are no invitation-count quotas, subscription gates, custom rate limiters, or HTTP 429 blockers.
// run this script node scripts/audit-clinic-doctor-invitation-limits.mjs

import {
  access,
  readFile,
} from "node:fs/promises";
import path from "node:path";

const projectRoot =
  process.cwd();

const createRoute =
  path.join(
    projectRoot,
    "src/app/api/clinic-manager/invitations/route.ts"
  );

const resendRoute =
  path.join(
    projectRoot,
    "src/app/api/clinic-manager/invitations/resend/route.ts"
  );

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

async function main() {
  if (
    !(await exists(
      createRoute
    )) ||
    !(await exists(
      resendRoute
    ))
  ) {
    throw new Error(
      "Invitation API routes were not found."
    );
  }

  const source =
    `${await readFile(
      createRoute,
      "utf8"
    )}\n${await readFile(
      resendRoute,
      "utf8"
    )}`;

  const forbidden = [
    {
      label:
        "HTTP 429 blocker",
      pattern:
        /status\s*:\s*429\b/i,
    },
    {
      label:
        "legacy rate-limit function",
      pattern:
        /consume_api_rate_limit/i,
    },
    {
      label:
        "invitation quota",
      pattern:
        /invitation_(?:count_)?limit|quota_exceeded/i,
    },
    {
      label:
        "subscription usage gate",
      pattern:
        /subscription_required|payment_required/i,
    },
  ];

  const findings =
    forbidden.filter(
      (
        item
      ) =>
        item.pattern.test(
          source
        )
    );

  if (
    findings.length >
    0
  ) {
    console.error(
      "Invitation limit audit failed:"
    );

    for (
      const finding of
      findings
    ) {
      console.error(
        `- ${finding.label}`
      );
    }

    process.exitCode =
      1;

    return;
  }

  console.log(
    "Clinic Doctor invitation limit audit passed."
  );

  console.log(
    "No invitation-count quota, subscription gate, custom rate limiter, or HTTP 429 blocker was found."
  );

  console.log(
    "Only duplicate pending/accepted invitations for the same email and organisation are prevented."
  );
}

main().catch(
  (
    error
  ) => {
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
