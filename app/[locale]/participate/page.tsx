import Studies from "./studies";

import type { Metadata } from "next";

const metadata: Metadata = {
  title: "detrans.ai | Current Research Studies",
  description:
    "Your voice matters. Academic researchers are actively studying detransition experiences to improve healthcare and support for individuals like you.",
  openGraph: {
    title: "detrans.ai | Current Research Studies",
    description:
      "Your voice matters. Academic researchers are actively studying detransition experiences to improve healthcare and support for individuals like you.",
    url: "https://detrans.ai/participate",
    siteName: "detrans.ai",
    images: ["https://detrans.ai/x_card_lg.png"],
    locale: "en_US",
    type: "website",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return metadata;
}

export default async function ParticipatePage() {
  return (
    <div className="prose dark:prose-invert max-w-4xl pb-16 lg:pt-8">
      <h1 className="mb-6 text-3xl font-bold">Current Detransition Studies</h1>
      <p>
        Your voice matters. Academic researchers are actively studying
        detransition experiences to improve healthcare and support for
        individuals like you.
      </p>
      <p>
        By participating in these studies, you can help advance scientific
        understanding and contribute to better care for future generations. Your
        experiences are valuable and deserve to be heard.
      </p>
      <p className="mb-8">
        <i>Updated 2/11/25</i>
      </p>

      <Studies />

      <div className="not-prose mt-12 text-center">
        <p className="mb-4 text-lg text-gray-600 dark:text-gray-400">
          Check back regularly for new opportunities to contribute to research.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Your experiences matter and can help improve care for others going
          through similar journeys.
        </p>
      </div>
    </div>
  );
}
