import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  createRequire,
} from "node:module";
import {
  basename,
  dirname,
  join,
  relative,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = join(dirname(currentFile), "..");

const locales = ["ro", "en", "de"];
const referenceLocaleCode = "ro";
const platformDictionaryPattern = /^platform-operator-.*\.ts$/;

function flattenMessages(value, prefix = "") {
  const flattened = new Map();

  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    flattened.set(prefix, value);
    return flattened;
  }

  for (const [key, childValue] of Object.entries(value)) {
    const childPath = prefix ? `${prefix}.${key}` : key;

    if (
      childValue !== null &&
      !Array.isArray(childValue) &&
      typeof childValue === "object"
    ) {
      const nested = flattenMessages(childValue, childPath);

      for (const [nestedKey, nestedValue] of nested) {
        flattened.set(nestedKey, nestedValue);
      }

      continue;
    }

    flattened.set(childPath, childValue);
  }

  return flattened;
}

function isEmptyTranslation(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0)
  );
}

function extractPlaceholders(value) {
  if (typeof value !== "string") {
    return [];
  }

  const placeholders = new Set();
  const pattern = /\{([a-zA-Z0-9_]+)(?:\s*,[^}]*)?\}/g;

  for (const match of value.matchAll(pattern)) {
    placeholders.add(match[1]);
  }

  return [...placeholders].sort();
}

function sameStringArray(first, second) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
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

function auditLocaleCollection({
  sourceLabel,
  loadedLocales,
}) {
  const referenceLocale =
    loadedLocales.find(({ locale }) => locale === referenceLocaleCode) ??
    loadedLocales[0];

  const allKeys = new Set(
    loadedLocales.flatMap(({ flattened }) =>
      Array.from(flattened.keys())
    )
  );

  const problems = [];

  for (const key of allKeys) {
    const localeValues = loadedLocales.map(
      ({ locale, flattened }) => ({
        locale,
        hasKey: flattened.has(key),
        value: flattened.get(key),
      })
    );

    for (const { locale, hasKey, value } of localeValues) {
      if (!hasKey) {
        problems.push(
          `[${sourceLabel}] [${locale}] Missing key: ${key}`
        );
        continue;
      }

      if (isEmptyTranslation(value)) {
        problems.push(
          `[${sourceLabel}] [${locale}] Empty translation: ${key}`
        );
      }
    }

    const existingValues = localeValues.filter(({ hasKey }) => hasKey);

    if (existingValues.length > 1) {
      const expectedType = valueType(existingValues[0].value);

      for (const { locale, value } of existingValues.slice(1)) {
        const actualType = valueType(value);

        if (actualType !== expectedType) {
          problems.push(
            `[${sourceLabel}] [${locale}] Type mismatch at ${key}: expected ${expectedType}, received ${actualType}`
          );
        }
      }
    }

    const referenceValue = referenceLocale.flattened.get(key);

    if (typeof referenceValue === "string") {
      const expectedPlaceholders = extractPlaceholders(referenceValue);

      for (const { locale, hasKey, value } of localeValues) {
        if (!hasKey || typeof value !== "string") {
          continue;
        }

        const actualPlaceholders = extractPlaceholders(value);

        if (!sameStringArray(expectedPlaceholders, actualPlaceholders)) {
          problems.push(
            `[${sourceLabel}] [${locale}] Placeholder mismatch at ${key}: expected {${expectedPlaceholders.join(
              ", "
            )}}, received {${actualPlaceholders.join(", ")}}`
          );
        }
      }
    }
  }

  return {
    keyCount: allKeys.size,
    problems,
  };
}

async function loadJsonLocale(locale) {
  const filePath = join(projectRoot, "messages", `${locale}.json`);

  let raw;

  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(
      `Could not read ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  let messages;

  try {
    messages = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${filePath}: ${
        error instanceof Error ? error.message : String(error)
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
    flattened: flattenMessages(messages),
  };
}

async function auditJsonMessages() {
  const loadedLocales = await Promise.all(locales.map(loadJsonLocale));

  return auditLocaleCollection({
    sourceLabel: "messages JSON",
    loadedLocales,
  });
}

async function findPlatformDictionaryFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    throw new Error(
      `Could not read ${directory}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findPlatformDictionaryFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && platformDictionaryPattern.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort((first, second) => first.localeCompare(second));
}

function unwrapExpression(expression) {
  let current = expression;

  while (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function getPropertyName(propertyName) {
  if (
    ts.isIdentifier(propertyName) ||
    ts.isStringLiteral(propertyName) ||
    ts.isNumericLiteral(propertyName)
  ) {
    return propertyName.text;
  }

  throw new Error(
    "Computed property names are not supported inside translation dictionaries."
  );
}

function getObjectPropertyAssignments(objectLiteral) {
  const properties = new Map();

  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) {
      throw new Error(
        "Translation dictionaries may contain only explicit property assignments."
      );
    }

    const key = getPropertyName(property.name);

    if (properties.has(key)) {
      throw new Error(`Duplicate property "${key}".`);
    }

    properties.set(key, property.initializer);
  }

  return properties;
}

function expressionToPlainValue(expression, pathLabel) {
  const valueExpression = unwrapExpression(expression);

  if (
    ts.isStringLiteral(valueExpression) ||
    ts.isNoSubstitutionTemplateLiteral(valueExpression)
  ) {
    return valueExpression.text;
  }

  if (ts.isNumericLiteral(valueExpression)) {
    return Number(valueExpression.text);
  }

  if (valueExpression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (valueExpression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (valueExpression.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }

  if (
    ts.isPrefixUnaryExpression(valueExpression) &&
    ts.isNumericLiteral(valueExpression.operand)
  ) {
    const numericValue = Number(valueExpression.operand.text);

    if (valueExpression.operator === ts.SyntaxKind.MinusToken) {
      return -numericValue;
    }

    if (valueExpression.operator === ts.SyntaxKind.PlusToken) {
      return numericValue;
    }
  }

  if (ts.isArrayLiteralExpression(valueExpression)) {
    return valueExpression.elements.map((element, index) =>
      expressionToPlainValue(element, `${pathLabel}[${index}]`)
    );
  }

  if (ts.isObjectLiteralExpression(valueExpression)) {
    const result = {};
    const properties = getObjectPropertyAssignments(valueExpression);

    for (const [key, initializer] of properties) {
      result[key] = expressionToPlainValue(
        initializer,
        pathLabel ? `${pathLabel}.${key}` : key
      );
    }

    return result;
  }

  throw new Error(
    `Unsupported TypeScript expression at ${pathLabel}. Use literal strings, numbers, booleans, null, arrays or nested objects.`
  );
}

function formatDiagnostic(sourceFile, diagnostic) {
  const message = ts.flattenDiagnosticMessageText(
    diagnostic.messageText,
    "\n"
  );

  if (diagnostic.start === undefined) {
    return message;
  }

  const position = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);

  return `${position.line + 1}:${position.character + 1} ${message}`;
}

function findLocaleDictionaryDeclarations(sourceFile) {
  const dictionaries = [];

  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const initializer = unwrapExpression(node.initializer);

      if (ts.isObjectLiteralExpression(initializer)) {
        let properties;

        try {
          properties = getObjectPropertyAssignments(initializer);
        } catch {
          properties = null;
        }

        if (properties) {
          const localeExpressions = locales.map((locale) => ({
            locale,
            expression: properties.get(locale),
          }));

          const containsEveryLocale = localeExpressions.every(
            ({ expression }) => {
              if (!expression) {
                return false;
              }

              const localeObject = unwrapExpression(expression);

              if (!ts.isObjectLiteralExpression(localeObject)) {
                return false;
              }

              try {
                getObjectPropertyAssignments(localeObject);
                return true;
              } catch {
                return false;
              }
            }
          );

          if (containsEveryLocale) {
            const declarationName = ts.isIdentifier(node.name)
              ? node.name.text
              : `dictionary-${dictionaries.length + 1}`;

            dictionaries.push({
              declarationName,
              localeExpressions,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return dictionaries;
}

async function loadTypeScriptDictionaries(filePath) {
  const raw = await readFile(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    raw,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  if (sourceFile.parseDiagnostics.length > 0) {
    const diagnostics = sourceFile.parseDiagnostics
      .map((diagnostic) => formatDiagnostic(sourceFile, diagnostic))
      .join("; ");

    throw new Error(`TypeScript parse error: ${diagnostics}`);
  }

  const declarations = findLocaleDictionaryDeclarations(sourceFile);

  return declarations.map(({ declarationName, localeExpressions }) => ({
    declarationName,
    loadedLocales: localeExpressions.map(({ locale, expression }) => {
      const value = expressionToPlainValue(
        expression,
        `${declarationName}.${locale}`
      );

      if (
        value === null ||
        Array.isArray(value) ||
        typeof value !== "object"
      ) {
        throw new Error(
          `${declarationName}.${locale} must contain an object.`
        );
      }

      return {
        locale,
        filePath,
        flattened: flattenMessages(value),
      };
    }),
  }));
}

async function auditTypeScriptDictionaries() {
  const i18nDirectory = join(projectRoot, "src", "lib", "i18n");
  const files = await findPlatformDictionaryFiles(i18nDirectory);
  const problems = [];
  const summaries = [];

  if (files.length === 0) {
    return {
      dictionaryCount: 0,
      fileCount: 0,
      keyCount: 0,
      problems: [
        `[TypeScript dictionaries] No platform-operator-*.ts files were found in ${i18nDirectory}.`,
      ],
      summaries,
    };
  }

  let totalKeyCount = 0;
  let dictionaryCount = 0;

  for (const filePath of files) {
    const relativeFilePath = relative(projectRoot, filePath);

    try {
      const dictionaries = await loadTypeScriptDictionaries(filePath);

      if (dictionaries.length === 0) {
        problems.push(
          `[TypeScript dictionaries] No complete ro/en/de dictionary was found in ${relativeFilePath}.`
        );
        continue;
      }

      for (const { declarationName, loadedLocales } of dictionaries) {
        const sourceLabel = `${relativeFilePath} > ${declarationName}`;
        const result = auditLocaleCollection({
          sourceLabel,
          loadedLocales,
        });

        dictionaryCount += 1;
        totalKeyCount += result.keyCount;
        problems.push(...result.problems);
        summaries.push({
          sourceLabel,
          keyCount: result.keyCount,
        });
      }
    } catch (error) {
      problems.push(
        `[TypeScript dictionaries] ${relativeFilePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return {
    dictionaryCount,
    fileCount: files.length,
    keyCount: totalKeyCount,
    problems,
    summaries,
  };
}

async function main() {
  const allProblems = [];
  let jsonResult = null;
  let typeScriptResult = null;

  console.log("[1/2] Auditing next-intl JSON messages...");

  try {
    jsonResult = await auditJsonMessages();
    allProblems.push(...jsonResult.problems);

    if (jsonResult.problems.length === 0) {
      console.log(
        `  Passed: ${jsonResult.keyCount} JSON keys are present, non-empty and placeholder-compatible in ${locales.join(
          ", "
        )}.`
      );
    }
  } catch (error) {
    allProblems.push(
      `[messages JSON] ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  console.log(
    "[2/2] Auditing TypeScript platform-operator dictionaries..."
  );

  try {
    typeScriptResult = await auditTypeScriptDictionaries();
    allProblems.push(...typeScriptResult.problems);

    for (const summary of typeScriptResult.summaries) {
      console.log(
        `  Checked: ${summary.sourceLabel} (${summary.keyCount} keys)`
      );
    }

    if (typeScriptResult.problems.length === 0) {
      console.log(
        `  Passed: ${typeScriptResult.dictionaryCount} TypeScript dictionar${
          typeScriptResult.dictionaryCount === 1 ? "y" : "ies"
        } across ${typeScriptResult.fileCount} file${
          typeScriptResult.fileCount === 1 ? "" : "s"
        }.`
      );
    }
  } catch (error) {
    allProblems.push(
      `[TypeScript dictionaries] ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (allProblems.length > 0) {
    console.error("\nTranslation audit failed:\n");

    for (const problem of allProblems) {
      console.error(`- ${problem}`);
    }

    console.error(
      `\nFound ${allProblems.length} translation problem${
        allProblems.length === 1 ? "" : "s"
      } across the JSON and TypeScript audits.\n`
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    `\nTranslation audit passed: ${jsonResult?.keyCount ?? 0} JSON keys and ${
      typeScriptResult?.keyCount ?? 0
    } TypeScript dictionary keys were checked across ${locales.join(
      ", "
    )}.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
