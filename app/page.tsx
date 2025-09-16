import { StartPage } from "./components/content/StartPage";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "detrans.ai | Talk to 50,000+ detransitioners",
  description:
    "Detrans.ai is an online self-guided gender-exploratory therapy tool and a research tool that is powered by real detrans perspectives and experiences. ",
  openGraph: {
    title: "detrans.ai | Talk to 50,000+ detransitioners",
    description:
      "Detrans.ai is an online self-guided gender-exploratory therapy tool and a research tool that is powered by real detrans perspectives and experiences. ",
    url: "https://detrans.ai",
    siteName: "detrans.ai",
    locale: "en_US",
    type: "website",
  },
};

export default async function Home() {
  return (
    <>
      <div className="pb-16">
        <StartPage mode="detrans" />
      </div>
    </>
  );
}
