import {
  readFile,
} from "node:fs/promises";
import {
  dirname,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const currentFile =
  fileURLToPath(import.meta.url);
const projectRoot =
  join(dirname(currentFile), "..");

const locales = [
  "ro",
  "en",
  "de",
];

function flattenMessages(
  value,
  prefix = ""
) {
  const flattened = new Map();

  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    flattened.set(prefix, value);
    return flattened;
  }

  for (
    const [key, childValue]
    of Object.entries(value)
  ) {
    const childPath =
      prefix
        ? `${prefix}.${key}`
        : key;

    if (
      childValue !== null &&
      !Array.isArray(childValue) &&
      typeof childValue === "object"
    ) {
      const nested =
        flattenMessages(
          childValue,
          childPath
        );

      for (
        const [nestedKey, nestedValue]
        of nested
      ) {
        flattened.set(
          nestedKey,
          nestedValue
        );
      }

      continue;
    }

    flattened.set(
      childPath,
      childValue
    );
  }

  return flattened;
}

function isEmptyTranslation(value) {
  return (
    value === null ||
    value === undefined ||
    (
      typeof value === "string" &&
      value.trim().length === 0
    )
  );
}

function extractPlaceholders(value) {
  if (
    typeof value !== "string"
  ) {
    return [];
  }

  const placeholders =
    new Set();

  const pattern =
    /\{([a-zA-Z0-9_]+)(?:\s*,[^}]*)?\}/g;

  for (
    const match of
    value.matchAll(pattern)
  ) {
    placeholders.add(
      match[1]
    );
  }

  return [
    ...placeholders,
  ].sort();
}

function sameStringArray(
  first,
  second
) {
  return (
    first.length ===
      second.length &&
    first.every(
      (
        value,
        index
      ) =>
        value ===
        second[index]
    )
  );
}

async function loadLocale(locale) {
  const filePath =
    join(
      projectRoot,
      "messages",
      `${locale}.json`
    );

  let raw;

  try {
    raw = await readFile(
      filePath,
      "utf8"
    );
  } catch (error) {
    throw new Error(
      `Could not read ${filePath}: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }

  let messages;

  try {
    messages = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${filePath}: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }

  if (
    messages === null ||
    Array.isArray(messages) ||
    typeof messages !== "object"
  ) {
    throw new Error(
      `${filePath} must contain a JSON object at its root.`
    );
  }

  return {
    locale,
    filePath,
    flattened:
      flattenMessages(messages),
  };
}

function valueType(value) {
  if (Array.isArray(value)) {
    return "array";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}

async function main() {
  const loadedLocales =
    await Promise.all(
      locales.map(loadLocale)
    );

  const referenceLocale =
    loadedLocales.find(
      ({ locale }) =>
        locale === "ro"
    ) ??
    loadedLocales[0];

  const allKeys =
    new Set(
      loadedLocales.flatMap(
        ({ flattened }) =>
          Array.from(
            flattened.keys()
          )
      )
    );

  const problems = [];

  for (const key of allKeys) {
    const localeValues =
      loadedLocales.map(
        ({ locale, flattened }) => ({
          locale,
          hasKey:
            flattened.has(key),
          value:
            flattened.get(key),
        })
      );

    for (
      const {
        locale,
        hasKey,
        value,
      } of localeValues
    ) {
      if (!hasKey) {
        problems.push(
          `[${locale}] Missing key: ${key}`
        );
        continue;
      }

      if (isEmptyTranslation(value)) {
        problems.push(
          `[${locale}] Empty translation: ${key}`
        );
      }
    }

    const existingValues =
      localeValues.filter(
        ({ hasKey }) => hasKey
      );

    if (existingValues.length > 1) {
      const expectedType =
        valueType(
          existingValues[0].value
        );

      for (
        const {
          locale,
          value,
        } of existingValues.slice(1)
      ) {
        const actualType =
          valueType(value);

        if (
          actualType !== expectedType
        ) {
          problems.push(
            `[${locale}] Type mismatch at ${key}: expected ${expectedType}, received ${actualType}`
          );
        }
      }
    }

    const referenceValue =
      referenceLocale
        .flattened
        .get(key);

    if (
      typeof referenceValue ===
        "string"
    ) {
      const expectedPlaceholders =
        extractPlaceholders(
          referenceValue
        );

      for (
        const {
          locale,
          hasKey,
          value,
        } of localeValues
      ) {
        if (
          !hasKey ||
          typeof value !==
            "string"
        ) {
          continue;
        }

        const actualPlaceholders =
          extractPlaceholders(
            value
          );

        if (
          !sameStringArray(
            expectedPlaceholders,
            actualPlaceholders
          )
        ) {
          problems.push(
            `[${locale}] Placeholder mismatch at ${key}: expected {${expectedPlaceholders.join(
              ", "
            )}}, received {${actualPlaceholders.join(
              ", "
            )}}`
          );
        }
      }
    }
  }

  if (problems.length > 0) {
    console.error(
      "\nTranslation audit failed:\n"
    );

    for (const problem of problems) {
      console.error(
        `- ${problem}`
      );
    }

    console.error(
      `\nFound ${problems.length} translation problem${
        problems.length === 1
          ? ""
          : "s"
      } across ${locales.join(", ")}.\n`
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    `Translation audit passed: ${allKeys.size} keys are present, non-empty and placeholder-compatible in ${locales.join(", ")}.`
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exitCode = 1;
});
