"use client";

import NextLink, {
  type LinkProps,
} from "next/link";
import {
  useLocale,
} from "next-intl";
import {
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

import {
  type AppLocale,
} from "@/i18n/routing";
import {
  getLocalizedPublicPath,
} from "@/lib/i18n/locale-path";

type LocalizedPublicLinkProps =
  LinkProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof LinkProps
  > & {
    children: ReactNode;
  };

export default function
LocalizedPublicLink({
  href,
  children,
  ...props
}: LocalizedPublicLinkProps) {
  const locale =
    useLocale() as AppLocale;

  const resolvedHref =
    typeof href === "string"
      ? getLocalizedPublicPath(
          href,
          locale
        )
      : href;

  return (
    <NextLink
      href={resolvedHref}
      {...props}
    >
      {children}
    </NextLink>
  );
}
