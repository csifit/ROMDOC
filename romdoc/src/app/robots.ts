import type {
  MetadataRoute,
} from "next";

const siteUrl =
  (
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    "https://www.romdoc.fit"
  ).replace(/\/+$/, "");

export default function
robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/ro/",
          "/en/",
          "/de/",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/check-email",
          "/dashboard",
          "/doctor-application",
          "/doctor-dashboard/",
          "/login",
          "/patient-dashboard/",
          "/register",
          "/staff-dashboard/",
          "/_next/",
        ],
      },
    ],
    sitemap:
      `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
