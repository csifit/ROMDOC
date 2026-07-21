"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import PlatformOperatorDashboardShell, {
  type PlatformOperatorNavigationItem,
} from "@/components/dashboard/platform-operator-dashboard-shell";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";

type ManagerDashboardSidebarProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
  canManageBilling: boolean;
  children: ReactNode;
};

const PRIMARY_NAVIGATION_ITEMS = [
  { href: "/manager-dashboard", labelKey: "overview", icon: "overview" },
  { href: "/manager-dashboard/users", labelKey: "users", icon: "users" },
  { href: "/manager-dashboard/doctors", labelKey: "doctors", icon: "doctors" },
  {
    href: "/manager-dashboard/verifications",
    labelKey: "verifications",
    icon: "verifications",
  },
  { href: "/manager-dashboard/clinics", labelKey: "clinics", icon: "clinics" },
] as const;

const SECONDARY_NAVIGATION_ITEMS = [
  { href: "/manager-dashboard/cities", labelKey: "cities", icon: "cities" },
  { href: "/manager-dashboard/reviews", labelKey: "reviews", icon: "reviews" },
  { href: "/manager-dashboard/security", labelKey: "security", icon: "security" },
] as const;

export default function ManagerDashboardSidebar({
  userName,
  userEmail,
  roleLabel,
  canManageBilling,
  children,
}: ManagerDashboardSidebarProps) {
  const locale = normalizeAppLocale(useLocale());
  const t = useTranslations("PlatformOperatorFoundation.sidebar");
  const billingCopy = getPlatformOperatorBilling(locale);

  const translatedPrimaryItems: PlatformOperatorNavigationItem[] =
    PRIMARY_NAVIGATION_ITEMS.map((item) => ({
      href: item.href,
      label: t(`navigation.${item.labelKey}`),
      icon: item.icon,
    }));

  const billingItems: PlatformOperatorNavigationItem[] = canManageBilling
    ? [
        {
          href: "/manager-dashboard/invoices",
          label: billingCopy.navigation.invoices,
          icon: "invoices",
        },
        {
          href: "/manager-dashboard/clinic-sms",
          label: billingCopy.navigation.clinicSms,
          icon: "sms",
        },
        {
          href: "/manager-dashboard/doctor-sms",
          label: billingCopy.navigation.doctorSms,
          icon: "sms",
        },
      ]
    : [];

  const translatedSecondaryItems: PlatformOperatorNavigationItem[] =
    SECONDARY_NAVIGATION_ITEMS.map((item) => ({
      href: item.href,
      label: t(`navigation.${item.labelKey}`),
      icon: item.icon,
    }));

  const navigationItems: PlatformOperatorNavigationItem[] = [
    ...translatedPrimaryItems,
    ...billingItems,
    ...translatedSecondaryItems,
    {
      href: `/${locale}`,
      label: t("navigation.home"),
      icon: "home",
    },
  ];

  return (
    <PlatformOperatorDashboardShell
      brand={t("managerBrand")}
      rootHref="/manager-dashboard"
      loginHref={`/login?locale=${locale}`}
      userName={userName}
      userEmail={userEmail}
      roleLabel={roleLabel}
      navigationLabel={t("managerNavigationLabel")}
      navigationItems={navigationItems}
      expandMenuLabel={t("expandMenu")}
      collapseMenuLabel={t("collapseMenu")}
      openMenuLabel={t("openMenu")}
      closeMenuLabel={t("closeMenu")}
      signOutLabel={t("signOut")}
      signingOutLabel={t("signingOut")}
    >
      {children}
    </PlatformOperatorDashboardShell>
  );
}
