export type AppAppearance = "light" | "dark" | "system";
export type ResolvedAppTheme = "light" | "dark";

export const APP_APPEARANCE_STORAGE_KEY = "romdoc-appearance";
export const APP_APPEARANCE_CHANGE_EVENT = "romdoc:appearance-change";

export const DASHBOARD_PATH_PREFIXES = [
  "/dashboard",
  "/admin",
  "/manager-dashboard",
  "/clinic-manager-dashboard",
  "/doctor-dashboard",
  "/staff-dashboard",
  "/patient-dashboard",
] as const;

/**
 * Authenticated workflow pages that live outside the dashboard URL trees.
 * They should inherit the dashboard appearance, but they should not receive
 * the standalone dashboard footer automatically.
 */
export const PROTECTED_WORKFLOW_PATH_PREFIXES = [
  "/appointments",
  "/medical-folder",
] as const;

function matchesPathPrefix(
  pathname: string,
  prefixes: readonly string[]
) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function normalizeAppAppearance(
  value: string | null | undefined
): AppAppearance {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "system";
}

export function isDashboardPath(pathname: string) {
  return matchesPathPrefix(pathname, DASHBOARD_PATH_PREFIXES);
}

export function isDarkSurfacePath(pathname: string) {
  return (
    isDashboardPath(pathname) ||
    matchesPathPrefix(pathname, PROTECTED_WORKFLOW_PATH_PREFIXES)
  );
}

export function resolveAppTheme(
  appearance: AppAppearance,
  prefersDark: boolean
): ResolvedAppTheme {
  if (appearance === "system") {
    return prefersDark ? "dark" : "light";
  }

  return appearance;
}

export function readStoredAppAppearance(): AppAppearance {
  if (typeof window === "undefined") return "system";

  try {
    return normalizeAppAppearance(
      window.localStorage.getItem(APP_APPEARANCE_STORAGE_KEY)
    );
  } catch {
    return "system";
  }
}

export function applyAppAppearance(appearance: AppAppearance) {
  if (typeof window === "undefined") return;

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const resolvedTheme = resolveAppTheme(appearance, media.matches);
  const root = document.documentElement;

  root.dataset.appearance = appearance;
  root.dataset.theme = resolvedTheme;
}

export function storeAppAppearance(appearance: AppAppearance) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(APP_APPEARANCE_STORAGE_KEY, appearance);
  } catch {
    // The preference still applies to the current page if storage is blocked.
  }

  applyAppAppearance(appearance);
  window.dispatchEvent(
    new CustomEvent<AppAppearance>(APP_APPEARANCE_CHANGE_EVENT, {
      detail: appearance,
    })
  );
}
