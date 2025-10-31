"use client";

import ChatPage from "@/app/components/content/ChatPage";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Page({
  params, // ← this is a Promise in RC versions, plain object in stable
}: {
  params: Promise<{ question?: string }>;
}) {
  const [starterQuestion, setStarterQuestion] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftOpacity, setLeftOpacity] = useState(1);
  const [rightOpacity, setRightOpacity] = useState(1);

  useEffect(() => {
    async function getQuestion() {
      const { question } = await params;
      let processedQuestion = "";
      if (question) {
        // turn single dashes into spaces, leave double dashes as real dashes
        processedQuestion = decodeURIComponent(question)
          .replace(/--/g, "\x00") // temporary sentinel
          .replace(/-/g, " ")
          .replace(/\x00/g, "-")
          .trim();
      }
      setStarterQuestion(processedQuestion);
    }
    getQuestion();
  }, [params]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      const scrollWidth = container.scrollWidth;
      const maxScroll = scrollWidth - containerWidth;

      if (maxScroll === 0) return; // Prevent division by zero

      // Calculate scroll progress (0 = fully left, 1 = fully right)
      const scrollProgress = scrollLeft / maxScroll;

      // Fade out left panel as we scroll right
      const newLeftOpacity = Math.max(0.3, 1 - scrollProgress * 1.4);
      // Fade in right panel as we scroll right
      const newRightOpacity = Math.max(0.3, 0.3 + scrollProgress * 0.7);

      setLeftOpacity(newLeftOpacity);
      setRightOpacity(newRightOpacity);
    };

    container.addEventListener("scroll", handleScroll);
    // Initial calculation
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);
  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 z-0 mt-[56px] h-[calc(100vh-64px)] w-full snap-x snap-mandatory overflow-x-auto overflow-y-scroll md:w-full"
    >
      <div className="grid min-h-full w-[180vw] snap-start grid-cols-2 md:w-full">
        <div
          style={{ opacity: leftOpacity }}
          className="flex min-h-full flex-col overflow-x-hidden bg-gray-50 px-4 transition-opacity duration-150 ease-out md:ml-2 md:w-full lg:px-16 dark:bg-black"
        >
          <h1 className="mt-4 mb-2 border-b pb-4 text-xl font-bold sm:text-2xl md:mt-8">
            Compare:
            <a
              href="https://detrans.ai"
              target="_blank"
              className="hover:text-blue-600 hover:underline"
            >
              <div className="flex items-center">
                <div className="">detrans.ai </div>
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
        <div
          style={{ opacity: rightOpacity }}
          className="flex h-full min-h-full snap-end flex-col overflow-x-hidden border-l bg-gradient-to-r from-[#5BCEFA]/20 via-[#FFFFFF]/20 to-[#F5A9B8]/20 px-4 transition-opacity duration-150 ease-out md:w-full lg:px-16 dark:bg-gradient-to-r dark:from-[#5BCEFA]/20 dark:via-[#2D2D2D]/20 dark:to-[#F5A9B8]/20"
        >
          <h1 className="mt-4 mb-2 border-b pb-4 text-xl font-bold sm:text-2xl md:mt-8 md:ml-2">
            Compare:
            <a
              href="https://genderaffirming.ai"
              target="_blank"
              className="hover:text-blue-600 hover:underline"
            >
              <div className="flex items-center">
                <div className="">genderaffirming.ai</div>
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
