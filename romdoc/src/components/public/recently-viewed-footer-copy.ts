export type RecentlyViewedFooterCopy = {
  triggerLabel: string;
  title: string;
  description: string;
  close: string;
  clear: string;
  emptyTitle: string;
  emptyDescription: string;
  searchDoctors: string;
  viewProfile: string;
};

export const recentlyViewedFooterCopy: Record<
  "ro" | "en" | "de",
  RecentlyViewedFooterCopy
> = {
  ro: {
    triggerLabel:
      "Deschide medicii vizualizați recent",
    title:
      "Medici vizualizați recent",
    description:
      "Revino rapid la ultimele profiluri de medici consultate pe acest dispozitiv.",
    close:
      "Închide istoricul",
    clear:
      "Șterge istoricul",
    emptyTitle:
      "Nu ai vizualizat încă niciun medic",
    emptyDescription:
      "Profilurile medicilor vizualizați vor apărea aici pentru acces rapid.",
    searchDoctors:
      "Caută medici",
    viewProfile:
      "Vezi profilul",
  },
  en: {
    triggerLabel:
      "Open recently viewed doctors",
    title:
      "Recently viewed doctors",
    description:
      "Quickly return to the latest doctor profiles viewed on this device.",
    close:
      "Close history",
    clear:
      "Clear history",
    emptyTitle:
      "You have not viewed any doctors yet",
    emptyDescription:
      "Doctor profiles you view will appear here for quick access.",
    searchDoctors:
      "Find doctors",
    viewProfile:
      "View profile",
  },
  de: {
    triggerLabel:
      "Kürzlich angesehene Ärzte öffnen",
    title:
      "Kürzlich angesehene Ärzte",
    description:
      "Kehren Sie schnell zu den zuletzt auf diesem Gerät angesehenen Arztprofilen zurück.",
    close:
      "Verlauf schließen",
    clear:
      "Verlauf löschen",
    emptyTitle:
      "Sie haben noch keine Ärzte angesehen",
    emptyDescription:
      "Angesehene Arztprofile erscheinen hier für den schnellen Zugriff.",
    searchDoctors:
      "Ärzte suchen",
    viewProfile:
      "Profil ansehen",
  },
};
