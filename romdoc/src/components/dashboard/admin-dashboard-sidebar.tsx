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
  type AppLocale,
} from "@/lib/i18n/app-locale";

type AdminDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
  children: ReactNode;
};

const CONTRACTS_LABEL: Record<
  AppLocale,
  string
> = {
  ro: "Contracte",
  en: "Contracts",
  de: "Verträge",
};

const CLINIC_ORGANISATIONS_LABEL: Record<
  AppLocale,
  string
> = {
  ro: "Organizații de clinică",
  en: "Clinic organisations",
  de: "Klinikorganisationen",
};

const CAPABILITIES_LABEL: Record<
  AppLocale,
  string
> = {
  ro: "Capabilități",
  en: "Capabilities",
  de: "Berechtigungen",
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
      "/admin/clinic-organisations",
    labelKey:
      null,
    icon:
      "clinics",
    customLabel:
      "clinicOrganisations",
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
      "/admin/contracts",
    labelKey:
      null,
    icon:
      "invoices",
    customLabel:
      "contracts",
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
  {
    href:
      "/admin/capabilities",
    labelKey:
      null,
    icon:
      "capabilities",
    customLabel:
      "capabilities",
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
    PlatformOperatorNavigationItem[] =
      NAVIGATION_ITEMS.map(
        (
          item
        ) => {
          let label: string;

          if (
            item.labelKey
          ) {
            label =
              t(
                `navigation.${item.labelKey}`
              );
          } else if (
            "customLabel" in
              item &&
            item.customLabel ===
              "clinicOrganisations"
          ) {
            label =
              CLINIC_ORGANISATIONS_LABEL[
                locale
              ];
          } else if (
            "customLabel" in
              item &&
            item.customLabel ===
              "contracts"
          ) {
            label =
              CONTRACTS_LABEL[
                locale
              ];
          } else {
            label =
              CAPABILITIES_LABEL[
                locale
              ];
          }

          return {
            href:
              item.href,
            label,
            icon:
              item.icon,
          };
        }
      );

  navigationItems.push({
    href:
      `/${locale}`,
    label:
      t(
        "navigation.home"
      ),
    icon:
      "home",
  });

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
