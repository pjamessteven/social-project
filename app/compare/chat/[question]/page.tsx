"use server";

import ChatPage from "@/app/components/content/ChatPage";
import { isBot } from "@/app/lib/isBot";
import { ExternalLink } from "lucide-react";
import { headers } from "next/headers";

export default async function Page({
  params, // ← this is a Promise in RC versions, plain object in stable
}: {
  params: Promise<{ question?: string }>;
}) {
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  const { question } = await params;
  let starterQuestion = "";
  if (question) {
    // turn single dashes into spaces, leave double dashes as real dashes
    starterQuestion = decodeURIComponent(question)
      .replace(/--/g, "\x00") // temporary sentinel
      .replace(/-/g, " ")
      .replace(/\x00/g, "-")
      .trim();
  }
  return (
    <div className="fixed top-0 left-0 z-0 mt-[56px] h-[calc(100vh-64px)] w-full snap-x snap-mandatory overflow-x-auto overflow-y-scroll md:w-full">
      <div className="grid min-h-full w-[180vw] snap-start grid-cols-2 md:w-full">
        <div className="flex min-h-full flex-col overflow-x-hidden bg-gray-50 px-4 md:w-full lg:px-16 dark:bg-black">
          <h1 className="mt-4 mb-2 border-b pb-4 text-xl font-bold sm:text-2xl md:mt-8">
            <a
              href="https://detrans.ai"
              target="_blank"
              className="hover:text-blue-600 hover:underline"
            >
              <div className="flex items-center">
                <div className="md:ml-2">detrans.ai </div>
                <ExternalLink className="ml-2 h-4" />
              </div>
            </a>
          </h1>

          <ChatPage
            mode={"detrans"}
            starterQuestion={starterQuestion}
            key="detrans"
          />
        </div>
        <div className="flex h-full min-h-full snap-end flex-col overflow-x-hidden border-l bg-gradient-to-r from-[#5BCEFA]/20 via-[#FFFFFF]/20 to-[#F5A9B8]/20 px-4 md:w-full lg:px-16 dark:bg-gradient-to-r dark:from-[#5BCEFA]/20 dark:via-[#2D2D2D]/20 dark:to-[#F5A9B8]/20">
          <h1 className="mt-4 mb-2 border-b pb-4 text-xl font-bold sm:text-2xl md:mt-8">
            <a
              href="https://genderaffirming.ai"
              target="_blank"
              className="hover:text-blue-600 hover:underline"
            >
              <div className="flex items-center">
                <div className="md:ml-2">genderaffirming.ai</div>
                <ExternalLink className="ml-2 h-4" />
              </div>
            </a>
          </h1>
          <ChatPage
            mode={"affirm"}
            starterQuestion={starterQuestion}
            key="affirm"
          />
        </div>
      </div>
    </div>
  );
}
