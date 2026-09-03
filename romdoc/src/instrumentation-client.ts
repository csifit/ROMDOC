import {
  applyAppAppearance,
  isDarkSurfacePath,
  readStoredAppAppearance,
} from "@/lib/theme/app-theme";

try {
  applyAppAppearance(readStoredAppAppearance());
  document.documentElement.dataset.romdocSurface = isDarkSurfacePath(
    window.location.pathname
  )
    ? "dashboard"
    : "public";
} catch {
  const root = document.documentElement;
  root.dataset.appearance = "system";
  root.dataset.theme = "light";
  root.dataset.romdocSurface = "public";
}
