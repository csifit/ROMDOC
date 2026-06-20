export function createLocationSlug(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(/ș/g, "s")
    .replace(/ş/g, "s")
    .replace(/ț/g, "t")
    .replace(/ţ/g, "t")
    .replace(/ă/g, "a")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}