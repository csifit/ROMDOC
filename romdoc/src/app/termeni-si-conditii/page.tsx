import type {
  Metadata,
} from "next";

import LegalPageShell from "@/components/public/legal-page-shell";
import {
  getPublicLegalPage,
} from "@/lib/legal/get-public-legal-page";

export const dynamic =
  "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page =
    await getPublicLegalPage(
      "terms"
    );

  return {
    title: page.title,
    description:
      page.description,
  };
}

export default async function TermsPage() {
  const page =
    await getPublicLegalPage(
      "terms"
    );

  return (
    <LegalPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={
        page.description
      }
      updatedAt={
        page.updatedAt
      }
      content={page.content}
      notice={page.notice}
    />
  );
}
