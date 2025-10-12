"use server"
import { Metadata } from "next";
import VideoList from "../components/VideoList";

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
    images: ["https://detrans.ai/x_lg.png"],
    locale: "en_US",
    type: "website",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return metadata
}

export default function VideosPage() {


  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
 <h1 className="text-3xl font-bold">
Transition & Detransition Videos</h1>

      <p className="text-gray-600 dark:text-gray-400">
        Here's a selection of personal memoirs that have been uploaded to
        YouTube by detransitioners. There are countless stories like these
        on the internet, this is just a small subset. Want your story on this
        page? Send me the link through the contact form.
      </p>

      <VideoList/>
    </div>
  );
}
