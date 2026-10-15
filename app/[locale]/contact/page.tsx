import { buildAlternates, localizedUrl, ogLocale } from "@/app/lib/seo";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ContactForm from "./ContactForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    openGraph: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      url: localizedUrl("/contact", locale),
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: ogLocale(locale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadata.title"),
      description: t("metadata.description"),
    },
    alternates: buildAlternates("/contact", locale),
  };
}

export default function ContactPage() {
  return <ContactForm />;
}
