#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();

const roMessagesPath = path.join(
  projectRoot,
  "messages",
  "ro.json"
);

const enMessagesPath = path.join(
  projectRoot,
  "messages",
  "en.json"
);

const sourceRoots = [
  path.join(
    projectRoot,
    "src",
    "app",
    "[locale]"
  ),
  path.join(
    projectRoot,
    "src",
    "components",
    "public"
  ),
  path.join(
    projectRoot,
    "src",
    "components",
    "reviews"
  ),
  path.join(
    projectRoot,
    "src",
    "app",
    "doctor"
  ),
  path.join(
    projectRoot,
    "src",
    "app",
    "medici"
  ),
  path.join(
    projectRoot,
    "src",
    "app",
    "specialitati"
  ),
];

const ignoredDirectories = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
]);

const sourceExtensions =
  new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
  ]);

const romanianIndicators = [
  /\bAcasă\b/i,
  /\bAdresă\b/i,
  /\bAutentificare\b/i,
  /\bBeneficii\b/i,
  /\bBucurești\b/i,
  /\bCaută\b/i,
  /\bClinică\b/i,
  /\bClinici\b/i,
  /\bConsultație\b/i,
  /\bCum se folosește\b/i,
  /\bDescriere\b/i,
  /\bGăsește\b/i,
  /\bInformații\b/i,
  /\bLocații\b/i,
  /\bMedic\b/i,
  /\bMedici\b/i,
  /\bOraș\b/i,
  /\bOrașe\b/i,
  /\bPacient\b/i,
  /\bProgramare\b/i,
  /\bProgramări\b/i,
  /\bRecenzie\b/i,
  /\bRecenzii\b/i,
  /\bServicii\b/i,
  /\bSpecializare\b/i,
  /\bSpecializări\b/i,
  /\bVerificare\b/i,
  /[ăâîșțĂÂÎȘȚ]/,
];

const allowedRomanianFiles = new Set([
  path.normalize(
    "src/app/[locale]/ghid-pacienti/page.tsx"
  ),
]);

function readJson(filePath) {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8"
    )
  );
}

function flattenKeys(
  value,
  prefix = ""
) {
  const result = new Map();

  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    result.set(prefix, value);
    return result;
  }

  for (
    const [key, child] of
    Object.entries(value)
  ) {
    const nextPrefix =
      prefix
        ? `${prefix}.${key}`
        : key;

    if (
      child !== null &&
      typeof child === "object" &&
      !Array.isArray(child)
    ) {
      for (
        const [childKey, childValue] of
        flattenKeys(
          child,
          nextPrefix
        )
      ) {
        result.set(
          childKey,
          childValue
        );
      }
    } else {
      result.set(
        nextPrefix,
        child
      );
    }
  }

  return result;
}

function walkFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const entries =
    fs.readdirSync(
      root,
      {
        withFileTypes: true,
      }
    );

  const files = [];

  for (const entry of entries) {
    if (
      ignoredDirectories.has(
        entry.name
      )
    ) {
      continue;
    }

    const absolutePath =
      path.join(
        root,
        entry.name
      );

    if (entry.isDirectory()) {
      files.push(
        ...walkFiles(
          absolutePath
        )
      );

      continue;
    }

    if (
      sourceExtensions.has(
        path.extname(
          entry.name
        )
      )
    ) {
      files.push(
        absolutePath
      );
    }
  }

  return files;
}

function lineNumberAt(
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

function auditMessageParity() {
  const roMessages =
    flattenKeys(
      readJson(
        roMessagesPath
      )
    );

  const enMessages =
    flattenKeys(
      readJson(
        enMessagesPath
      )
    );

  const missingInEnglish = [];
  const missingInRomanian = [];
  const emptyEnglishValues = [];
  const emptyRomanianValues = [];

  for (
    const [key, value] of
    roMessages
  ) {
    if (!enMessages.has(key)) {
      missingInEnglish.push(key);
    }

    if (
      typeof value === "string" &&
      value.trim() === ""
    ) {
      emptyRomanianValues.push(
        key
      );
    }
  }

  for (
    const [key, value] of
    enMessages
  ) {
    if (!roMessages.has(key)) {
      missingInRomanian.push(
        key
      );
    }

    if (
      typeof value === "string" &&
      value.trim() === ""
    ) {
      emptyEnglishValues.push(
        key
      );
    }
  }

  return {
    missingInEnglish,
    missingInRomanian,
    emptyEnglishValues,
    emptyRomanianValues,
  };
}

function auditHardcodedRomanian() {
  const findings = [];

  const files = [
    ...new Set(
      sourceRoots.flatMap(
        walkFiles
      )
    ),
  ];

  for (const filePath of files) {
    const relativePath =
      path.normalize(
        path.relative(
          projectRoot,
          filePath
        )
      );

    if (
      allowedRomanianFiles.has(
        relativePath
      )
    ) {
      continue;
    }

    const source =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    for (
      const indicator of
      romanianIndicators
    ) {
      const regex =
        new RegExp(
          indicator.source,
          indicator.flags.includes(
            "g"
          )
            ? indicator.flags
            : `${indicator.flags}g`
        );

      let match;

      while (
        (
          match =
            regex.exec(source)
        ) !== null
      ) {
        findings.push({
          file:
            relativePath.replace(
              /\\/g,
              "/"
            ),
          line:
            lineNumberAt(
              source,
              match.index
            ),
          sample:
            match[0],
        });

        if (
          findings.length >= 500
        ) {
          return findings;
        }
      }
    }
  }

  return findings;
}

function printSection(
  title,
  rows
) {
  console.log(
    `\n${title}`
  );

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

function main() {
  if (
    !fs.existsSync(
      roMessagesPath
    ) ||
    !fs.existsSync(
      enMessagesPath
    )
  ) {
    console.error(
      "Translation audit failed: messages/ro.json and messages/en.json must both exist."
    );

    process.exit(1);
  }

  const messageAudit =
    auditMessageParity();

  const hardcodedFindings =
    auditHardcodedRomanian();

  printSection(
    "Missing keys in English",
    messageAudit
      .missingInEnglish
  );

  printSection(
    "Missing keys in Romanian",
    messageAudit
      .missingInRomanian
  );

  printSection(
    "Empty English values",
    messageAudit
      .emptyEnglishValues
  );

  printSection(
    "Empty Romanian values",
    messageAudit
      .emptyRomanianValues
  );

  printSection(
    "Possible hardcoded Romanian public UI text",
    hardcodedFindings.map(
      (finding) =>
        `${finding.file}:${finding.line} — ${finding.sample}`
    )
  );

  const errorCount =
    messageAudit
      .missingInEnglish
      .length +
    messageAudit
      .missingInRomanian
      .length +
    messageAudit
      .emptyEnglishValues
      .length +
    messageAudit
      .emptyRomanianValues
      .length;

  console.log(
    "\nAudit summary"
  );

  console.log(
    "-------------"
  );

  console.log(
    `Message-file errors: ${errorCount}`
  );

  console.log(
    `Hardcoded-text findings: ${hardcodedFindings.length}`
  );

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

main();
