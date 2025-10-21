"use server"
import { StartPage } from "../components/content/StartPage";

import type { Metadata } from "next";

const metadata: Metadata = {
  title: "genderaffirming.ai | Talk to 600,000+ trans people",
  description:
    "GenderAffirming.AI is a chatbot powered by real trans experiences. Use it for transition help and advice, or as a virtual gender-affirming therapist for MTF and FTM transgender people.",
  openGraph: {
    title: "genderaffirming.ai | Talk to 600,000+ trans people",
    description:
      "GenderAffirming.AI is a chatbot powered by real trans experiences. Use it for transition help and advice, or as a virtual gender-affirming therapist for MTF and FTM transgender people.",
    url: "https://genderaffirming.ai",
    siteName: "genderaffirming.ai",
    locale: "en_US",
    type: "website",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return metadata
}

export default async function Home() {
  return (
    <>
      <div className="pb-16">
        <StartPage mode="affirm" />
      </div>
    </>
  );
}
