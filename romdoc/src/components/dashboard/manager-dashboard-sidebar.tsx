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

type ManagerDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
  children: ReactNode;
};

const NAVIGATION_ITEMS = [
  {
    href:
      "/manager-dashboard",
    labelKey:
      "overview",
    icon:
      "overview",
  },
  {
    href:
      "/manager-dashboard/users",
    labelKey:
      "users",
    icon:
      "users",
  },
  {
    href:
      "/manager-dashboard/doctors",
    labelKey:
      "doctors",
    icon:
      "doctors",
  },
  {
    href:
      "/manager-dashboard/verifications",
    labelKey:
      "verifications",
    icon:
      "verifications",
  },
  {
    href:
      "/manager-dashboard/clinics",
    labelKey:
      "clinics",
    icon:
      "clinics",
  },
  {
    href:
      "/manager-dashboard/invoices",
    labelKey:
      "invoices",
    icon:
      "invoices",
  },
  {
    href:
      "/manager-dashboard/cities",
    labelKey:
      "cities",
    icon:
      "cities",
  },
  {
    href:
      "/manager-dashboard/reviews",
    labelKey:
      "reviews",
    icon:
      "reviews",
  },
  {
    href:
      "/manager-dashboard/security",
    labelKey:
      "security",
    icon:
      "security",
  },
] as const;

export default function ManagerDashboardSidebar({
  userName,
  userEmail,
  roleLabel,
  children,
}: ManagerDashboardSidebarProps) {
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
          "managerBrand"
        )
      }
      rootHref="/manager-dashboard"
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
          "managerNavigationLabel"
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
