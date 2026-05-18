"use server";
import { Study } from "@/app/types/study";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import StudySubmitForm from "../../components/StudySubmitForm";
import { StudyCard } from "@/app/components/content/StudyCard";
import { StudyAdminWrapper } from "../../components/StudyAdminWrapper";

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

function StudyItem({ study, isAdmin }: { study: Study; isAdmin: boolean }) {
  const card = <StudyCard study={study} isAdmin={isAdmin} />;

  if (isAdmin) {
    return (
      <StudyAdminWrapper study={study}>{card}</StudyAdminWrapper>
    );
  }

  return card;
}

export default async function StudiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studiesPage" });

  // Forward session cookie so the API can authenticate admin users
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session_token")?.value;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/studies?locale=${locale}`, {
    next: {
      revalidate: 300,
      tags: ["studies"],
    },
    headers: sessionCookie
      ? { Cookie: `session_token=${sessionCookie}` }
      : undefined,
  });

  let studiesData: Study[] = [];
  let isAdmin = false;

  if (response.ok) {
    const data = await response.json();
    studiesData = data.studies || [];
    isAdmin = data.isAdmin || false;
  }

  const approvedStudies = studiesData.filter((s) => s.approved);
  const pendingStudies = studiesData.filter((s) => !s.approved);

  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p>{t("description")}</p>
      <StudySubmitForm />

      <div className="mt-8 space-y-8">
        {isAdmin && pendingStudies.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-amber-600 dark:text-amber-400">
              Pending Review ({pendingStudies.length})
            </h2>
            <div className="mt-4 space-y-6">
              {pendingStudies.map((study) => (
                <div
                  key={study.id}
                  className="opacity-70 transition-opacity hover:opacity-100"
                >
                  <StudyItem study={study} isAdmin={isAdmin} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          {isAdmin && (
            <h2 className="text-xl font-semibold">
              Approved Studies ({approvedStudies.length})
            </h2>
          )}
          <div className="mt-4 space-y-6">
            {approvedStudies.map((study) => (
              <StudyItem key={study.id} study={study} isAdmin={isAdmin} />
            ))}
          </div>
        </div>
      </div>

      <hr />
    </div>
  );
}
