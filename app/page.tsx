"use server";

import { StartPage } from "./components/content/StartPage";

import type { Metadata } from "next";

const metadata: Metadata = {
  title: "detrans.ai | Talk to 50,000+ detransitioners",
  description:
    "Detrans.ai is a helpful and compassionate chatbot which shares the experiences and perspectives of people who have detransitioned. Use detrans.ai for transition or detransition support and advice, or simply as a research tool to understand why some people adopt, inhabit, and let go of gender identities.",
  openGraph: {
    title: "detrans.ai | Talk to 50,000+ detransitioners",
    description:
      "Detrans.ai is a helpful and compassionate chatbot which shares the experiences and perspectives of people who have detransitioned. Use detrans.ai for transition or detransition support and advice, or simply as a research tool to understand why some people adopt, inhabit, and let go of gender identities.",
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
      "Detrans.ai is a helpful and compassionate chatbot which shares the experiences and perspectives of people who have detransitioned. Use detrans.ai for transition or detransition support and advice, or simply as a research tool to understand why some people adopt, inhabit, and let go of gender identities.",
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
