import { StartPage } from "../components/content/StartPage";

import type { Metadata } from "next";

const metadata: Metadata = {
  title: "Compare Trans vs Detrans Perspectives",
  description:
    "You can use this tool to see trans and detrans perspectives side-by-side. Pick from any of the spicy starter questions, or ask your own question to see the differences. This tool is very useful for transition and detransition research. ",
  openGraph: {
    title: "Compare Trans vs Detrans Perspectives",
    description:
    "You can use this tool to see trans and detrans perspectives side-by-side. Pick from any of the spicy starter questions, or ask your own question to see the differences. This tool is very useful for transition and detransition research. ",
    locale: "en_US",
    type: "website",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return metadata;
}

export default async function Home() {
  return (
    <>
      <div className="pb-16">
        <StartPage mode="compare" />
      </div>
    </>
  );
}
