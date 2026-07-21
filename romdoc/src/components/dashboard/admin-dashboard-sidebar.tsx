"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import type {
  ReactNode,
} from "react";

import PlatformOperatorDashboardShell, {
  type PlatformOperatorNavigationItem,
} from "@/components/dashboard/platform-operator-dashboard-shell";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type AdminDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
  children: ReactNode;
};

const NAVIGATION_ITEMS = [
  {
    href:
      "/admin",
    labelKey:
      "overview",
    icon:
      "overview",
  },
  {
    href:
      "/admin/users",
    labelKey:
      "users",
    icon:
      "users",
  },
  {
    href:
      "/admin/managers",
    labelKey:
      "managers",
    icon:
      "users",
  },
  {
    href:
      "/admin/doctors",
    labelKey:
      "doctors",
    icon:
      "doctors",
  },
  {
    href:
      "/admin/verifications",
    labelKey:
      "verifications",
    icon:
      "verifications",
  },
  {
    href:
      "/admin/clinics",
    labelKey:
      "clinics",
    icon:
      "clinics",
  },
  {
    href:
      "/admin/specialties",
    labelKey:
      "specialties",
    icon:
      "specialties",
  },
  {
    href:
      "/admin/cities",
    labelKey:
      "cities",
    icon:
      "cities",
  },
  {
    href:
      "/admin/reviews",
    labelKey:
      "reviews",
    icon:
      "reviews",
  },
  {
    href:
      "/admin/sms",
    labelKey:
      "sms",
    icon:
      "sms",
  },
  {
    href:
      "/admin/invoices",
    labelKey:
      "invoices",
    icon:
      "invoices",
  },
  {
    href:
      "/admin/privacy",
    labelKey:
      "privacy",
    icon:
      "privacy",
  },
  {
    href:
      "/admin/settings/ai",
    labelKey:
      "ai",
    icon:
      "ai",
  },
  {
    href:
      "/admin/security",
    labelKey:
      "security",
    icon:
      "security",
  },
] as const;

export default function AdminDashboardSidebar({
  userName,
  userEmail,
  roleLabel,
  children,
}: AdminDashboardSidebarProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PlatformOperatorFoundation.sidebar"
    );

  const navigationItems:
    PlatformOperatorNavigationItem[] = [
      ...NAVIGATION_ITEMS.map(
        (
          item
        ) => ({
          href:
            item.href,
          label:
            t(
              `navigation.${item.labelKey}`
            ),
          icon:
            item.icon,
        })
      ),
      {
        href:
          `/${locale}`,
        label:
          t(
            "navigation.home"
          ),
        icon:
          "home",
      },
    ];

  return (
    <PlatformOperatorDashboardShell
      brand={
        t(
          "adminBrand"
        )
      }
      rootHref="/admin"
      loginHref={
        `/login?locale=${locale}`
      }
      userName={
        userName
      }
      userEmail={
        userEmail
      }
      roleLabel={
        roleLabel
      }
      navigationLabel={
        t(
          "adminNavigationLabel"
        )
      }
      navigationItems={
        navigationItems
      }
      expandMenuLabel={
        t(
          "expandMenu"
        )
      }
      collapseMenuLabel={
        t(
          "collapseMenu"
        )
      }
      openMenuLabel={
        t(
          "openMenu"
        )
      }
      closeMenuLabel={
        t(
          "closeMenu"
        )
      }
      signOutLabel={
        t(
          "signOut"
        )
      }
      signingOutLabel={
        t(
          "signingOut"
        )
      }
    >
      {
        children
      }
    </PlatformOperatorDashboardShell>
  );
}
