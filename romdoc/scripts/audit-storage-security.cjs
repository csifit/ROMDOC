#!/usr/bin/env node

/**
 * RomDoc Step 66C
 * Source-code audit for Supabase Storage and signed URLs.
 *
 * Exact destination:
 * ROMDOC/romdoc/scripts/audit-storage-security.cjs
 *
 * Run from ROMDOC/romdoc:
 * node scripts/audit-storage-security.cjs
 */

const fs =
  require("node:fs");
const path =
  require("node:path");
const process =
  require("node:process");

const root = process.cwd();

const sourceRoot =
  path.join(root, "src");

const extensions =
  new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".cjs",
    ".mjs",
  ]);

const ignored =
  new Set([
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
  ]);

const findings = [];

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];

  for (
    const entry of
    fs.readdirSync(
      directory,
      {
        withFileTypes: true,
      }
    )
  ) {
    if (
      ignored.has(entry.name)
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
    } else if (
      extensions.has(
        path.extname(entry.name)
      )
    ) {
      files.push(absolute);
    }
  }

  return files;
}

function lineAt(
  source,
  index
) {
  return (
    source
      .slice(0, index)
      .split("\n")
      .length
  );
}

function addFinding({
  severity,
  file,
  line,
  rule,
  sample,
}) {
  findings.push({
    severity,
    file:
      path.relative(
        root,
        file
      ).replace(/\\/g, "/"),
    line,
    rule,
    sample:
      sample
        .replace(/\s+/g, " ")
        .slice(0, 220),
  });
}

function scanFile(file) {
  const source =
    fs.readFileSync(
      file,
      "utf8"
    );

  const rules = [
    {
      severity: "CRITICAL",
      rule:
        "getPublicUrl used in application source",
      regex:
        /\.getPublicUrl\s*\(/g,
    },
    {
      severity: "HIGH",
      rule:
        "Signed URL lifetime exceeds one hour",
      regex:
        /\.createSignedUrl\s*\(\s*[^,]+,\s*(\d+)/g,
      validate(match) {
        return (
          Number(match[1]) > 3600
        );
      },
    },
    {
      severity: "MEDIUM",
      rule:
        "Signed URL lifetime exceeds five minutes",
      regex:
        /\.createSignedUrl\s*\(\s*[^,]+,\s*(\d+)/g,
      validate(match) {
        const ttl =
          Number(match[1]);

        return (
          ttl > 300 &&
          ttl <= 3600
        );
      },
    },
    {
      severity: "HIGH",
      rule:
        "Signed upload URL generation",
      regex:
        /\.createSignedUploadUrl\s*\(/g,
    },
    {
      severity: "REVIEW",
      rule:
        "Signed URL generation",
      regex:
        /\.createSignedUrl\s*\(/g,
    },
    {
      severity: "REVIEW",
      rule:
        "Direct storage download",
      regex:
        /\.download\s*\(/g,
    },
    {
      severity: "REVIEW",
      rule:
        "Storage upload",
      regex:
        /\.upload\s*\(/g,
    },
    {
      severity: "REVIEW",
      rule:
        "Storage object removal",
      regex:
        /\.remove\s*\(/g,
    },
    {
      severity: "HIGH",
      rule:
        "Service-role key appears in client component",
      regex:
        /SUPABASE_SERVICE_ROLE_KEY/g,
      validate(_match) {
        return (
          source
            .trimStart()
            .startsWith(
              '"use client"'
            ) ||
          source
            .trimStart()
            .startsWith(
              "'use client'"
            )
        );
      },
    },
    {
      severity: "HIGH",
      rule:
        "Signed URL returned without obvious authentication call in same file",
      regex:
        /\.createSignedUrl\s*\(/g,
      validate() {
        return !(
          source.includes(
            "auth.getUser"
          ) ||
          source.includes(
            "requireAdmin"
          ) ||
          source.includes(
            "requireDoctor"
          ) ||
          source.includes(
            "requirePatient"
          ) ||
          source.includes(
            "requireActiveProfile"
          )
        );
      },
    },
    {
      severity: "HIGH",
      rule:
        "Admin client creates signed URL without an obvious authorization check",
      regex:
        /createAdminClient\s*\(\)[\s\S]{0,5000}?createSignedUrl\s*\(/g,
      validate() {
        return !(
          source.includes(
            "auth.getUser"
          ) ||
          source.includes(
            "requireAdmin"
          ) ||
          source.includes(
            "requireDoctor"
          ) ||
          source.includes(
            "requirePatient"
          ) ||
          source.includes(
            ".rpc("
          )
        );
      },
    },
  ];

  for (const rule of rules) {
    const regex =
      new RegExp(
        rule.regex.source,
        rule.regex.flags.includes(
          "g"
        )
          ? rule.regex.flags
          : `${rule.regex.flags}g`
      );

    let match;

    while (
      (
        match =
          regex.exec(source)
      ) !== null
    ) {
      if (
        rule.validate &&
        !rule.validate(match)
      ) {
        continue;
      }

      addFinding({
        severity:
          rule.severity,
        file,
        line:
          lineAt(
            source,
            match.index
          ),
        rule:
          rule.rule,
        sample:
          match[0],
      });
    }
  }
}

for (
  const file of walk(sourceRoot)
) {
  scanFile(file);
}

const order = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  REVIEW: 3,
};

findings.sort(
  (a, b) =>
    order[a.severity] -
      order[b.severity] ||
    a.file.localeCompare(
      b.file
    ) ||
    a.line - b.line
);

console.log(
  "\nRomDoc storage security source audit"
);
console.log(
  "====================================\n"
);

if (findings.length === 0) {
  console.log(
    "No storage API usage was detected."
  );
  process.exit(0);
}

for (const finding of findings) {
  console.log(
    `[${finding.severity}] ${finding.file}:${finding.line}`
  );
  console.log(
    `  Rule: ${finding.rule}`
  );
  console.log(
    `  Match: ${finding.sample}\n`
  );
}

const totals =
  findings.reduce(
    (result, finding) => {
      result[
        finding.severity
      ] =
        (
          result[
            finding.severity
          ] || 0
        ) + 1;

      return result;
    },
    {}
  );

console.log("Summary");
console.log("-------");

for (
  const severity of [
    "CRITICAL",
    "HIGH",
    "MEDIUM",
    "REVIEW",
  ]
) {
  console.log(
    `${severity}: ${
      totals[severity] || 0
    }`
  );
}

if (
  (totals.CRITICAL || 0) > 0 ||
  (totals.HIGH || 0) > 0
) {
  process.exitCode = 1;
}
