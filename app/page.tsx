"use server";

import { StartPage } from "./components/content/StartPage";

import type { Metadata } from "next";

const metadata: Metadata = {
  title: "detrans.ai | Talk to 50,000+ detransitioners",
  description:
    "Detrans.ai is a self-guided gender-exploratory therapy tool that is powered by real detrans perspectives and experiences. Understand why some adopt, inhabit, and let go of gender identities. ",
  openGraph: {
    title: "detrans.ai | Talk to 50,000+ detransitioners",
    description:
      "Detrans.ai is powered by real detrans perspectives and experiences. Understand why some adopt, inhabit, and let go of gender identities.",
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
      "Detrans.ai is powered by real detrans perspectives and experiences. Understand why some adopt, inhabit, and let go of gender identities.",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
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
