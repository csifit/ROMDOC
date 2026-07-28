import "server-only";

const MAX_CONTRACT_HTML_LENGTH =
  500_000;

export function sanitizeAdminContractHtml(
  value: unknown
) {
  const source =
    typeof value === "string"
      ? value.slice(
          0,
          MAX_CONTRACT_HTML_LENGTH
        )
      : "";

  return source
    .replace(
      /<(script|style|iframe|object|embed|svg|math|form)\b[^>]*>[\s\S]*?<\/\1>/gi,
      ""
    )
    .replace(
      /<\/?(?:script|style|iframe|object|embed|svg|math|form|base|meta|link|input|button|select|textarea)\b[^>]*>/gi,
      ""
    )
    .replace(
      /\s(?:on[a-z]+|srcdoc|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
      ""
    )
    .replace(
      /\s(?:href|src)\s*=\s*("|')\s*(?:javascript|data):[\s\S]*?\1/gi,
      ""
    )
    .replace(
      /javascript\s*:/gi,
      ""
    )
    .trim();
}
