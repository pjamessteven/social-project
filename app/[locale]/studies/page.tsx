"use server";
import { StudyCard } from "@/app/components/content/StudyCard";
import { Study } from "@/app/types/study";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import StudySubmitForm from "../../components/StudySubmitForm";

async function fetchStudies(locale: string): Promise<Study[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/studies?locale=${locale}`, {
    next: {
      revalidate: 300,
      tags: ["studies"],
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch studies:", response.statusText);
    return [];
  }

  const data = await response.json();
  return data.studies || [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studiesPage" });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    openGraph: {
      title: t("metadata.ogTitle"),
      description: t("metadata.ogDescription"),
      url: "https://detrans.ai/studies",
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: locale === "en" ? "en_US" : locale === "fr" ? "fr_FR" : "es_ES",
      type: "website",
    },
  };
}

export default async function StudiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studiesPage" });
  const studiesData = await fetchStudies(locale);

  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p>{t("description")}</p>
      <StudySubmitForm />

      <div className="mt-8 space-y-6">
        {studiesData.map((study, index) => (
          <StudyCard key={index} study={study} />
        ))}
      </div>

      <hr />
    </div>
  );
}
