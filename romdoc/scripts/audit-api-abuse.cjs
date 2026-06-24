#!/usr/bin/env node

const fs =
  require("node:fs");
const path =
  require("node:path");
const process =
  require("node:process");

const root = process.cwd();

const scanRoots = [
  path.join(root, "src"),
];

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

    const full =
      path.join(
        directory,
        entry.name
      );

    if (entry.isDirectory()) {
      files.push(
        ...walk(full)
      );
    } else if (
      extensions.has(
        path.extname(entry.name)
      )
    ) {
      files.push(full);
    }
  }

  return files;
}

function lineNumber(
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

for (
  const rootPath of scanRoots
) {
  for (
    const file of walk(rootPath)
  ) {
    const source =
      fs.readFileSync(
        file,
        "utf8"
      );

    const patterns = [
      {
        label:
          "Upload limit above 2 MB",
        regex:
          /(\d+)\s*\*\s*1024\s*\*\s*1024/g,
        validate(match) {
          return (
            Number(match[1]) > 2
          );
        },
      },
      {
        label:
          "User-facing upload text above 2 MB",
        regex:
          /\b(3|4|5|6|7|8|9|10|15|20|25|50|100)\s*MB\b/g,
        validate() {
          return true;
        },
      },
      {
        label:
          "Mutation route without visible rate-limit helper",
        regex:
          /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(/g,
        validate() {
          return !source.includes(
            "consumeRateLimit"
          );
        },
      },
    ];

    for (
      const pattern of
      patterns
    ) {
      let match;

      while (
        (
          match =
            pattern.regex.exec(source)
        ) !== null
      ) {
        if (
          !pattern.validate(
            match
          )
        ) {
          continue;
        }

        findings.push({
          file:
            path
              .relative(
                root,
                file
              )
              .replace(
                /\\/g,
                "/"
              ),
          line:
            lineNumber(
              source,
              match.index
            ),
          label:
            pattern.label,
          match:
            match[0],
        });
      }
    }
  }
}

console.log(
  "\nRomDoc API abuse audit"
);
console.log(
  "======================\n"
);

for (
  const finding of
  findings
) {
  console.log(
    `${finding.file}:${finding.line}`
  );
  console.log(
    `  ${finding.label}`
  );
  console.log(
    `  ${finding.match}\n`
  );
}

console.log(
  `Total findings: ${findings.length}`
);

if (
  findings.some(
    (finding) =>
      finding.label.includes(
        "above 2 MB"
      )
  )
) {
  process.exitCode = 1;
}
