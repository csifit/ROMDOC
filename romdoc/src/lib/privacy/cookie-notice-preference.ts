export const COOKIE_NOTICE_STORAGE_KEY =
  "romdoc_cookie_information_acknowledged";

export const COOKIE_NOTICE_VERSION = "2026-07-02";

export const COOKIE_NOTICE_OPEN_EVENT =
  "romdoc:open-cookie-information";

type CookieNoticePreference = {
  acknowledged: true;
  version: string;
  acknowledgedAt: string;
};

function isBrowser() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

export function hasAcknowledgedCookieNotice() {
  if (!isBrowser()) {
    return false;
  }

  try {
    const storedValue = window.localStorage.getItem(
      COOKIE_NOTICE_STORAGE_KEY
    );

    if (!storedValue) {
      return false;
    }

    const preference = JSON.parse(
      storedValue
    ) as Partial<CookieNoticePreference>;

    return (
      preference.acknowledged === true &&
      preference.version === COOKIE_NOTICE_VERSION
    );
  } catch {
    return false;
  }
}

export function acknowledgeCookieNotice() {
  if (!isBrowser()) {
    return;
  }

  const preference: CookieNoticePreference = {
    acknowledged: true,
    version: COOKIE_NOTICE_VERSION,
    acknowledgedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(
      COOKIE_NOTICE_STORAGE_KEY,
      JSON.stringify(preference)
    );
  } catch {
    // The notice can still be dismissed for the current page session.
  }
}

export function openCookieInformationNotice() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(COOKIE_NOTICE_OPEN_EVENT)
  );
}
