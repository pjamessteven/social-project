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
  const t = await getTranslations({ locale, namespace: "terms" });

  return {
    title: t("title"),
    alternates: {
      canonical: `${SITE_URL}${getPathname({ href: "/terms", locale })}`,
      languages: buildLocalizedAlternates("/terms"),
    },
  };
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
