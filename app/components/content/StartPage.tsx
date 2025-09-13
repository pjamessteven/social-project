"use server";

import { Eraser } from "lucide-react";
import DonationCard from "./DonationCard";
import { QuestionCategories } from "./QuestionCategories";
import RedditEmbeds from "./RedditEmbeds";

export async function StartPage({
  className,
  mode,
}: {
  className?: string;
  mode: "affirm" | "detrans";
}) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      <div className="flex flex-col">
        <h1 className="mt-[20vh] text-3xl font-bold sm:text-4xl">
          <div className="text-muted-foreground opacity-30 dark:opacity-80">
            {mode === "detrans" ? "detrans.ai" : "genderaffirming.ai"}
          </div>
          {/*Come and join us in the real world.*/}
          {mode === "detrans"
            ? "Talk to 50,000+ Detransitioners"
            : "Talk to 600,000+ Trans and Non-Binary"}
          <div className="text-muted-foreground opacity-30 dark:opacity-80">
            {mode === "detrans" ? "#FreeYourMind" : "#TransPeopleKnowBest"}
          </div>
        </h1>
        {mode === "detrans" ? (
          <div className="mt-8 text-base">
            <h2 className="text-secondary-foreground/80 semibold">
              Did you know that since 2012, gender dysphoria diagnosises{" "}
              <a
                href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12320607/"
                target="_blank"
                className="text-blue-500 underline hover:text-blue-600"
              >
                are up 5000%
              </a>{" "}
              in the UK? Young women are increasingly overrepresented in these
              statistics,{" "}
              <a
                href="https://trepo.tuni.fi/bitstream/handle/10024/117658/time_trends_in_referrals_2019.pdf"
                target="_blank"
                className="text-blue-500 underline hover:text-blue-600"
              >
                up to 87% of all referrals
              </a>{" "}
              in Finland.
            </h2>
            <h2 className="text-secondary-foreground/80 semibold mt-2">
              At the same time, a constantly growing number of people are
              healing dysphoria, de-transitioning and sharing their experience.
              These people call themselves &apos;detrans&apos; and their
              experiences provide fascinating insights into gender ideolgy and
              identity belief systems.
            </h2>
            <h2 className="text-secondary-foreground/80 semibold mt-2">
              <b>detrans.ai</b> is a research and self-guided therapy tool which
              generates meta questions and answers them by surfacing and
              integrating a variety of real human experiences and perspectives
              from the
              <span>
                {" "}
                <a
                  href="https://reddit.com/r/detrans"
                  target="_blank"
                  className="text-blue-500 underline hover:text-blue-600"
                >
                  /r/detrans
                </a>{" "}
                subreddit.{" "}
              </span>
              This produces helpful and insightful responses that help users
              understand why people adopt, inhabit, or move away from gender
              identities, and how these experiences shape one’s relationship
              with self, body and the world.
            </h2>

            <h2 className="text-secondary-foreground/80 semibold mt-2">
              For a more <i>affirming</i> experience, please see
              <span>
                {" "}
                <a
                  href={isDev ? "/affirm" : "https://genderaffirming.ai"}
                  target="_blank"
                  className="text-blue-500 underline hover:text-blue-600"
                >
                  genderaffirming.ai
                </a>
                .
              </span>
            </h2>
            {/*
          <h2 className="text-secondary-foreground/80 semibold mt-2">
            On the surface, gender ideolgy seems progressive; a new way of
            thinking (it certainly is). But detrans experiences repeatedly
            uncover contradictions and uncomfortable truths about this new
            belief system pervading society.
          </h2>
           */}

            <h2 className="text-secondary-foreground mt-8 mb-8 text-lg font-semibold">
              Support, life advice and knowledge from over 50,000
              detransitioners and desisters.
            </h2>
            <details className="mt-4 rounded-md border p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300">
                How does it work?
              </summary>
              <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  <b>detrans.ai</b> is built with the{" "}
                  <a
                    href="https://docs.llamaindex.ai/en/stable/"
                    target="_blank"
                    className="text-blue-500 underline hover:text-blue-600"
                  >
                    LlamaIndex
                  </a>{" "}
                  framework and the state-of-the-art open-source Chinese{" "}
                  <span className="whitespace-nowrap">
                    <i>kimi-k2-instruct</i>{" "}
                  </span>
                  model to reduce Western political bias. You can{" "}
                  <a
                    href="https://www.kimi.com/chat/d2v1aq2i59734bfka5qg"
                    target="_blank"
                    className="text-blue-500 underline hover:text-blue-600"
                  >
                    chat directly with kimi here
                  </a>
                  . If you are interested in the prompts that were used to
                  generate responses, you can read them on the &apos;System
                  Prompts&apos; page.
                </p>
                <p className="mt-2">
                  For reasons I can only speculate on; ChatGPT and most Western
                  LLMs seem to be deliberately programmed to promote and uphold
                  gender ideolgy concepts and to shut down any discussion about
                  the harms and validity of these belief systems. It proved to
                  be impossible to use OpenAI&apos;s GPT models for this
                  project. If you would like to explore topics through the lens
                  of those who beleive in gender ideolgy, see{" "}
                  <a
                    href={isDev ? "/affirm" : "https://genderaffirming.ai"}
                    target="_blank"
                    className="text-blue-500 underline hover:text-blue-600"
                  >
                    genderaffirming.ai
                  </a>
                </p>{" "}
              </div>
            </details>
          </div>
        ) : (
          <div className="mt-8 text-base">
            <h2 className="text-secondary-foreground/80 semibold mt-2">
              <b>genderaffirming.ai</b> is a digital companion built to help you
              affirm your gender identity in a safe space. It&apos;s powered by
              insights directly from the trans community.
            </h2>
            <h2 className="text-secondary-foreground/80 semibold mt-2">
              You can use <b>genderaffirming.ai</b> as your own personal
              gender-affirming AI therapist, or to simply explore concepts and
              ideas from a trans perspective. Please be aware that
              genderaffirming.ai only includes gender-affirming perspectives
              from MTF and FTM trans-identifying people.{" "}
              {/*If you would like to explore topics
              through the lens of those who have detransitioned, see{" "}
              <a
                href="https://detrans.ai"
                target="_blank"
                className="text-blue-500 underline hover:text-blue-600"
              >
                detrans.ai
              </a>*/}
            </h2>

            <h2 className="text-secondary-foreground mt-8 mb-8 text-lg font-semibold">
              Support, life advice and knowledge from over 600,000+ trans
              people.
            </h2>

            <details className="mt-4 rounded-md bg-gray-100 p-4 dark:bg-gray-800">
              <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300">
                How does it work?
              </summary>
              <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  <b>genderaffirming.ai</b> generates meta questions and answers
                  them using RAG techniques to surface and integrate a variety
                  of real human experiences and perspectives about gender from
                  the trans
                  <span>
                    {" "}
                    <a
                      href="https://reddit.com/r/mtf"
                      target="_blank"
                      className="text-blue-500 underline hover:text-blue-600"
                    >
                      /r/mtf
                    </a>{" "}
                    and{" "}
                    <a
                      href="https://reddit.com/r/ftm"
                      target="_blank"
                      className="text-blue-500 underline hover:text-blue-600"
                    >
                      /r/ftm
                    </a>{" "}
                    subreddits. It uses the{" "}
                    <a
                      href="https://docs.llamaindex.ai/en/stable/"
                      target="_blank"
                      className="text-blue-500 underline hover:text-blue-600"
                    >
                      LlamaIndex
                    </a>{" "}
                    framework and the latest OpenAI GPT 5 model, which has
                    state-of-the-art safety guardrails on gender topics.
                  </span>
                </p>
                <p className="mt-2">
                  This produces validating responses to help understand how
                  trans people experience the world, online spaces, their
                  identity, and their bodies. Pick a topic below to start
                  exploring ideas through this lens.
                </p>
                <p className="mt-2">
                  The service is provided as a free resource; please consider
                  making a donation to keep it running!
                </p>
              </div>
            </details>
          </div>
        )}
        <div className="">
          {mode === "detrans" && <RedditEmbeds mode={mode} />}
        </div>
        <div className="mt-8">
          <QuestionCategories mode={mode} />
        </div>
        {mode === "detrans" && (
          <div className="text-muted-foreground flex flex-col text-base italic opacity-90 sm:text-lg">
            <p className="mt-16">
              The truth can hurt, but it will set you free -
            </p>
            <p className="mt-1">All you need to do, is learn to just be.</p>
            <p className="mt-8">And be sure to mind your thoughts,</p>
            <p className="mt-1">Because the mind is like a garden,</p>
            <p className="mt-1">And each thought is a seed.</p>
            <p className="mt-1">We reap what we sow,</p>
            <p className="mt-1">But through this we can grow.</p>
            <p className="mt-16">
              Nobody in the real world is afraid of getting cancelled!
            </p>
            <p className="mt-16">
              Built by{" "}
              <a
                href="https://bitbout.me"
                target="_blank"
                className="text-blue-500 underline hover:text-blue-600"
              >
                Peter James Steven
              </a>{" "}
              in Welllington, NZ
              <br />
              <div className="mt-2 flex items-center">
                I love most people, and hate most cults.
                <Eraser className="ml-2 h-4 sm:h-5" />
              </div>
              <div className="mt-2 flex items-center">
                <div>
                  This is an open-source project. The code is available under an
                  MIT license on{" "}
                  <a
                    href="https://github.com/pjamessteven/social-project"
                    target="_blank"
                    className="text-blue-500 underline hover:text-blue-600"
                  >
                    Github
                  </a>
                  .
                </div>
              </div>
              <div className="mt-2 flex items-center">
                European language translations coming soon...
              </div>
            </p>
            <div className="font-base mt-16 text-lg not-italic">
              <DonationCard mode={mode} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
