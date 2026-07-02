"use client";

import {
  openCookieInformationNotice,
} from "@/lib/privacy/cookie-notice-preference";

type CookieInformationLinkProps = {
  label: string;
};

export default function CookieInformationLink({
  label,
}: CookieInformationLinkProps) {
  return (
    <button
      type="button"
      onClick={openCookieInformationNotice}
      className="romdoc-focus-ring rounded-sm text-left text-sm text-gray-600 transition hover:text-[#036661]"
    >
      {label}
    </button>
  );
}
