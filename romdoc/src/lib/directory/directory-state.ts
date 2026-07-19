"use client";

const DIRECTORY_STATE_STORAGE_KEY =
  "romdoc.directory-state.v1";

const DIRECTORY_STATE_MAX_AGE_MS =
  2 * 60 * 60 * 1000;

type DirectoryState = {
  version: 1;
  url: string;
  scrollY: number;
  createdAt: number;
};

function isDirectoryPath(
  pathname: string
) {
  return (
    pathname === "/medici" ||
    pathname.endsWith(
      "/medici"
    )
  );
}

function isDoctorProfilePath(
  pathname: string
) {
  return (
    pathname.startsWith(
      "/doctor/"
    ) ||
    pathname.includes(
      "/doctor/"
    )
  );
}

function isValidState(
  value: unknown
): value is DirectoryState {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const state =
    value as Partial<DirectoryState>;

  return (
    state.version === 1 &&
    typeof state.url ===
      "string" &&
    state.url.length > 0 &&
    typeof state.scrollY ===
      "number" &&
    Number.isFinite(
      state.scrollY
    ) &&
    state.scrollY >= 0 &&
    typeof state.createdAt ===
      "number" &&
    Number.isFinite(
      state.createdAt
    )
  );
}

function currentDirectoryUrl() {
  return (
    window.location.pathname +
    window.location.search
  );
}

export function saveDirectoryState() {
  if (
    typeof window ===
      "undefined" ||
    !isDirectoryPath(
      window.location.pathname
    )
  ) {
    return;
  }

  const state: DirectoryState = {
    version: 1,
    url:
      currentDirectoryUrl(),
    scrollY:
      Math.max(
        0,
        window.scrollY
      ),
    createdAt:
      Date.now(),
  };

  window.localStorage.setItem(
    DIRECTORY_STATE_STORAGE_KEY,
    JSON.stringify(
      state
    )
  );
}

export function shouldSaveDirectoryStateForHref(
  href: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  try {
    const url =
      new URL(
        href,
        window.location.origin
      );

    return (
      url.origin ===
        window.location.origin &&
      isDoctorProfilePath(
        url.pathname
      )
    );
  } catch {
    return false;
  }
}

export function restoreDirectoryState() {
  if (
    typeof window ===
      "undefined" ||
    !isDirectoryPath(
      window.location.pathname
    )
  ) {
    return false;
  }

  const raw =
    window.localStorage.getItem(
      DIRECTORY_STATE_STORAGE_KEY
    );

  if (!raw) {
    return false;
  }

  try {
    const parsed: unknown =
      JSON.parse(raw);

    if (
      !isValidState(
        parsed
      )
    ) {
      clearDirectoryState();
      return false;
    }

    const expired =
      Date.now() -
        parsed.createdAt >
      DIRECTORY_STATE_MAX_AGE_MS;

    const sameDirectoryUrl =
      parsed.url ===
      currentDirectoryUrl();

    if (
      expired ||
      !sameDirectoryUrl
    ) {
      clearDirectoryState();
      return false;
    }

    const targetScrollY =
      parsed.scrollY;

    clearDirectoryState();

    window.requestAnimationFrame(
      () => {
        window.requestAnimationFrame(
          () => {
            window.scrollTo({
              top:
                targetScrollY,
              behavior:
                "instant",
            });
          }
        );
      }
    );

    return true;
  } catch {
    clearDirectoryState();
    return false;
  }
}

export function clearDirectoryState() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.removeItem(
    DIRECTORY_STATE_STORAGE_KEY
  );
}
