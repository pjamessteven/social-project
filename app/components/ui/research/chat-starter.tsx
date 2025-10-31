"use client";

import { useChatUI } from "@llamaindex/chat-ui";
import { Eraser } from "lucide-react";
import { getConfig } from "../lib/utils";

export function ChatStarter({ className }: { className?: string }) {
  const { append, messages, requestData } = useChatUI();
  const starterQuestionsFromConfig = getConfig("STARTER_QUESTIONS");

  const starterQuestions =
    Array.isArray(starterQuestionsFromConfig) &&
    starterQuestionsFromConfig?.length > 0
      ? starterQuestionsFromConfig
      : JSON.parse(process.env.NEXT_PUBLIC_STARTER_QUESTIONS || "[]");

  if (starterQuestions.length === 0 || messages.length > 0) return null;
  return (
    <>
      <div className="flex flex-col">
        <h1 className="mt-[20vh] text-4xl font-bold">
          <span className="opacity-30">Detrans.AI</span>
          <br />
          Welcome back to the real world.
        </h1>
        <div className="text-base">
          <h2 className="text-secondary-foreground/80 semibold mt-8">
            Did you know that since 2012, gender dysphoria diagnosises{" "}
            <a
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12320607/"
              target="_blank"
              className="text-blue-500 underline hover:text-blue-600"
            >
              are up 5000% in the UK?
            </a>{" "}
            <br />
            In 2011, 1 in 60,000 people were diagnosed. In 2021, 1 in 1200
            people were diagnosed.
          </h2>
          <h2 className="text-secondary-foreground/80 semibold mt-2">
            Detrans experiences provide fascinating insights into gender ideolgy
            and belief systems.
          </h2>
          <h2 className="text-secondary-foreground/80 semibold mt-2">
            On the surface, gender ideolgy seems progressive; a new way of
            thinking (it certainly is). But detrans experiences repeatedly
            uncover contradictions and uncomfortable truths about this new
            belief system pervading society.
          </h2>
          <h2 className="text-secondary-foreground/80 semibold mt-2">
            For reasons I can only speculate on; ChatGPT and most other LLMs
            seem to be deliberately programmed to promote and uphold gender
            ideolgy concepts and shut down any discussion about the harms and
            validity of them. I have seen Chat GPT send me messages, then
            re-write them in front of my eyes to be more politically correct. It
            was impossible to use OpenAI GPT models for this project.
          </h2>
          <h2 className="text-secondary-foreground/80 semibold mt-2">
            Detrans.AI is built on a state-of-the-art open-source Chinese model
            called <i>kimi-k2-instruct</i> to reduce Western political bias,
            then uses RAG techniques to surface and integrate real human
            experiences and thoughts from the <span>/r/detrans subreddit</span>.
            This produces helpful responses that have a more critical view on
            gender identity, aligning with how detrans people see and experience
            the world and their bodies. Pick a topic below to start exploring
            ideas through this lens.
          </h2>

          <h2 className="text-secondary-foreground mt-8 mb-8 text-lg font-semibold">
            Real support, life advice and knowledge from over 50,000
            detransitioners and desisters.
          </h2>
        </div>
        {starterQuestions.map((starterQuestion: string, i: number) => (
          <p
            key={i}
            onClick={() =>
              append(
                {
                  role: "user",
                  content: starterQuestion,
                },
                { data: requestData },
              )
            }
            className="text-muted-foreground hover:text-primary cursor-pointer text-lg italic opacity-90"
          >
            {"->"} {starterQuestion}
          </p>
        ))}
        <p className="text-muted-foreground mt-16 text-lg italic opacity-90">
          The truth can hurt but it will set you free,
        </p>
        <p className="text-muted-foreground mt-2 text-lg italic opacity-90">
          All you need to do, is learn to just be.
        </p>
        <p className="text-muted-foreground mt-2 text-lg italic opacity-90">
          And Mind your thoughts,
        </p>
        <p className="text-muted-foreground mt-2 text-lg italic opacity-90">
          For thoughts become words, word become actions, and actions become
          destiny.
        </p>
        <p className="text-muted-foreground mt-8 text-lg italic opacity-90">
          Nobody in the real world is afraid of getting cancelled!
        </p>
        <p className="text-muted-foreground mt-16 text-lg italic opacity-90">
          Built by{" "}
          <a
            href="https://bitbout.me"
            target="_blank"
            className="text-blue-500 underline hover:text-blue-600"
          >
            Peter James Steven.
          </a>{" "}
          <div className="mt-2 flex items-center">
            I love most people, and hate all sex-based identity cults.
            <Eraser className="ml-2 h-5" />
          </div>
        </p>
      </div>
    </>
  );
}
