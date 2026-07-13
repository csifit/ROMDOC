import Link from "next/link";
import {
  type ComponentProps,
} from "react";

import {
  type AppLocale,
} from "@/i18n/routing";
import {
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
  );
}
