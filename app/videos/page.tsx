"use server";
import { Metadata } from "next";
import { headers } from "next/headers";
import SeoVideosList from "../components/SeoVideosList";
import VideoList from "../components/VideoList";
import VideoSubmitForm from "../components/VideoSubmitForm";
import { isBot } from "../lib/isBot";

const metadata: Metadata = {
  title: "detrans.ai | Watch Videos By Detransitioners",
  description:
    "Here's a selection of personal video memoirs that have been uploaded to YouTube by people who have transitioned and then came to a realisation that caused them to detransition. There are countless stories like these on the internet, this is just a small subset.",
  openGraph: {
    title: "detrans.ai | Watch Videos By Detransitioners",
    description:
      "Here's a selection of personal video memoirs that have been uploaded to YouTube by people who have transitioned and then came to a realisation that caused them to detransition. There are countless stories like these on the internet, this is just a small subset.",
    url: "https://detrans.ai/videos",
    siteName: "detrans.ai",
    images: ["https://detrans.ai/x_card_lg.png"],
    locale: "en_US",
    type: "website",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return metadata;
}

export default async function VideosPage() {
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  if (bot) {
    return <SeoVideosList />;
  }
  return (
    <div className="prose dark:prose-invert pb-16 lg:max-w-none lg:pt-8">
      <h1 className="text-3xl font-bold">Transition & Detransition Videos</h1>

      <p className="text-muted-foreground max-w-3xl">
        This page aims to be the best archive of detransition videos on the
        internet.
        <br className="hidden md:inline" /> Using speech-to-text, detrans.ai
        integrates these experiences into chat conversations.
        <br className="hidden md:inline" /> YouTube videos only for now, TikTok
        coming soon?!
      </p>

      <p className="max-w-3xl">
        <VideoSubmitForm />
      </p>

      <VideoList />
    </div>
  );
}
