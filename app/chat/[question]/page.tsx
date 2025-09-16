import ChatPage from "@/app/components/content/ChatPage";
import SeoChatPage from "@/app/components/content/SeoChatPage";
import { getCached, incrementPageViews } from "@/app/lib/cache";
import { isBot } from "@/app/lib/isBot";
import {
  capitaliseWords,
  deslugify,
  markdownToPlainText,
} from "@/app/lib/utils";
import { Metadata } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic"; // required for redis call in generateMetadata

export async function generateMetadata({
  params,
}: {
  params: Promise<{ question?: string }>;
}): Promise<Metadata> {
  const { question } = await params;
  const q = deslugify(question);
  const answer = await getCached("detrans", q + ":answer");
  return {
    title: capitaliseWords(q) + " | detrans.ai",
    description: markdownToPlainText(answer?.slice(0, 300)),
  };
}
export default async function DetransChatPage({
  params,
}: {
  params: Promise<{ question?: string }>;
}) {
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  const { question } = await params;
  const starterQuestion = deslugify(question);

  await incrementPageViews("detrans", starterQuestion);

  if (bot) {
    // Return SSR cached final answers to question
    const answer = await getCached("detrans", starterQuestion + ":answer"); // server-rendered, no JS
    return (
      <SeoChatPage
        mode={"detrans"}
        question={starterQuestion}
        answer={answer}
      />
    );
  }

  // Real users get the interactive app
  return <ChatPage mode={"detrans"} starterQuestion={starterQuestion} />;
}
