<<<<<<< HEAD
import Link from "next/link";
import {
  type ComponentProps,
=======
﻿"use client";

import NextLink, {
  type LinkProps,
} from "next/link";
import {
  useLocale,
} from "next-intl";
import {
  type AnchorHTMLAttributes,
  type ReactNode,
>>>>>>> dea88b6c22ab4e91169a859b701709854c0e8c67
} from "react";

import {
  type AppLocale,
} from "@/i18n/routing";
import {
<<<<<<< HEAD
  localizePublicPath,
} from "@/i18n/locale-path";

type LocalizedPublicLinkProps =
  Omit<
    ComponentProps<typeof Link>,
    "href"
  > & {
    href: string;
    locale: AppLocale;
  };

export default function LocalizedPublicLink({
  href,
  locale,
  ...props
}: LocalizedPublicLinkProps) {
  return (
    <Link
      {...props}
      href={localizePublicPath(
        locale,
        href
      )}
    />
=======
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
>>>>>>> dea88b6c22ab4e91169a859b701709854c0e8c67
  );
}
