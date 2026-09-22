import { buildLocalizedAlternates, SITE_URL } from "@/app/lib/seo";
import { getPathname } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "prompts" });

  return {
    title: t("title"),
    alternates: {
      canonical: `${SITE_URL}${getPathname({ href: "/prompts", locale })}`,
      languages: buildLocalizedAlternates("/prompts"),
    },
  };
}

export default function PromptsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
