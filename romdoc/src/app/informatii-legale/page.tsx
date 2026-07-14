import type { Metadata } from "next";

import LegalPageShell from "@/components/public/legal-page-shell";
import { getPublicLegalPage } from "@/lib/legal/get-public-legal-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublicLegalPage("legal_information");
  return { title: page.title, description: page.description };
}

export default async function LegalInformationPage() {
  const page = await getPublicLegalPage("legal_information");
  return (
    <LegalPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
      updatedAt={page.updatedAt}
      content={page.content}
      locale={page.locale}
      notice={page.notice}
    />
  );
}
