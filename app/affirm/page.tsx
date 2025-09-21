import { StartPage } from "../components/content/StartPage";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "genderaffirming.ai | Talk to 600,000+ trans people",
  description:
    "GenderAffirming.AI is a self-guided online gender-affirming therapy tool for MTF and FTM transgender people powered by real trans perspectives and experiences.",
  openGraph: {
    title: "genderaffirming.ai | Talk to 600,000+ trans people",
    description:
      "GenderAffirming.AI is a self-guided online gender-affirming therapy tool for MTF and FTM transgender people powered by real trans perspectives and experiences.",
    url: "https://genderaffirming.ai",
    siteName: "genderaffirming.ai",
    locale: "en_US",
    type: "website",
  },
};

export default async function Home() {
  return (
    <>
      <div className="pb-16">
        <StartPage mode="affirm" />
      </div>
    </>
  );
}
