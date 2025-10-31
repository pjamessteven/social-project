"use server";

import { StartPage } from "./components/content/StartPage";

import type { Metadata } from "next";

const metadata: Metadata = {
  title: "detrans.ai | Talk to 50,000+ detransitioners",
  description:
  "Detrans.ai is a chatbot powered by detrans perspectives and experiences. Use detrans.ai if you are thinking about transitioning, as a virtual gender exploratory therapist, for detransition help and advice, or simply as a research tool. You can compare trans and detrans perspectives on the compare page.",
  openGraph: {
    title: "detrans.ai | Talk to 50,000+ detransitioners",
    description:
      "Detrans.ai is a chatbot powered by detrans perspectives and experiences. Use detrans.ai if you are thinking about transitioning, as a virtual gender exploratory therapist, for detransition help and advice, or simply as a research tool. You can compare trans and detrans perspectives on the compare page.",
    url: "https://detrans.ai/",
    images: ["https://detrans.ai/x_card_lg.png"],
    siteName: "detrans.ai",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    images: ["https://detrans.ai/x_card_lg.png"],
    card: "summary_large_image",
    title: "detrans.ai | Talk to 50,000+ detransitioners",
    description:
      "Detrans.ai is a chatbot powered by real detrans perspectives and experiences. Understand why some adopt, inhabit, and let go of gender identities.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return metadata;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return (
    <>
      <div className="pb-16">
        <StartPage mode="detrans" searchParams={resolvedSearchParams} />
      </div>
    </>
  );
}
