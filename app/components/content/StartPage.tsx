"use server";

import { isBot } from "@/app/lib/isBot";
import { slugify } from "@/app/lib/utils";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Heart,
  Settings,
  Users,
  Youtube,
} from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import AffirmAnimation from "../ui/affirm-animation";
import { Button } from "../ui/button";
import CompareAnimation from "../ui/compare-animation";
import LizardAnimation from "../ui/lizard-animation";
import DonationCard from "./DonationCard";
import { QuestionCategories } from "./QuestionCategories";
import { QuestionTabs } from "./QuestionTabs";
import RedditEmbeds from "./RedditEmbeds";

export async function StartPage({
  className,
  mode,
  searchParams,
}: {
  className?: string;
  mode: "affirm" | "detrans" | "compare";
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const isDev = process.env.NODE_ENV === "development";

  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  return (
    <>
      <div className="relative flex flex-col pb-[88px]">
        <h1 className="z-10 mt-[20vh] text-3xl font-bold sm:text-4xl">
          <div className="text-muted-foreground opacity-30 dark:opacity-80">
            {mode === "detrans"
              ? "detrans.ai"
              : mode === "affirm"
                ? "genderaffirming.ai"
                : "detrans.ai + genderaffirming.ai"}
          </div>
          {/*Come and join us in the real world.*/}
          {mode === "detrans"
            ? "Talk to 50,000+ Detransitioners"
            : mode == "affirm"
              ? "Talk to 600,000+ Trans People"
              : "Compare Perspectives"}
          {
            <div className="text-muted-foreground opacity-30 dark:opacity-80">
              {mode === "detrans"
                ? "Support, advice and knowledge."
                : mode == "affirm"
                  ? "Infinite affirmation & validation"
                  : "See Both Sides"}
            </div>
          }
        </h1>

        {mode === "detrans" && (
          <div className="mt-8 hidden sm:block">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
              <Link href="/videos">
                <Button
                  variant="secondary"
                  className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
                >
                  <Youtube className="h-4 w-4" />
                  <span className="text-sm font-medium">Personal Videos</span>
                </Button>
              </Link>
              <Link href="/stories">
                <Button
                  variant="secondary"
                  className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Stories
                    <span className="hidden sm:inline"> & Timelines</span>
                  </span>
                </Button>
              </Link>
              <Link href="/support">
                <Button
                  variant="secondary"
                  className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
                >
                  <Heart className="h-4 w-4" />
                  <span className="text-sm font-medium">Help & Support</span>
                </Button>
              </Link>
              <Link href="/definitions">
                <Button
                  variant="secondary"
                  className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Definitions</span>
                </Button>
              </Link>
              <Link href="/studies">
                <Button
                  variant="secondary"
                  className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden text-sm font-medium sm:inline">
                    Academic Studies
                  </span>
                  <span className="text-sm font-medium sm:hidden">Studies</span>
                </Button>
              </Link>

              <Link href={mode == "detrans" ? "/prompts" : "/affirm/prompts"}>
                <Button
                  variant="secondary"
                  className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium">How It Works</span>
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 w-full">
          <div className="w-full border-t" />
          <div className="mt-1 w-full border-t" />
          <div className="mt-1 w-full border-t" />
        </div>
        {mode === "detrans" && (
          <div className="absolute top-0 right-0 z-0 w-[170px] rotate-15 sm:top-8 sm:-right-32 sm:w-[220px]">
            <LizardAnimation />
            <div className="absolute inset-0 dark:bg-black/20"></div>
          </div>
        )}
        {mode === "compare" && (
          <div className="absolute top-4 right-8 z-0 w-[120px] rotate-45 sm:top-8 sm:-right-24 sm:w-[180px]">
            <CompareAnimation />
            <div className="absolute inset-0 dark:bg-black/20"></div>
          </div>
        )}

        {mode === "affirm" && (
          <div className="absolute top-0 right-0 z-0 w-[120px] rotate-15 sm:top-8 sm:right-0 sm:w-[180px]">
            <AffirmAnimation />
            <div className="absolute inset-0 dark:bg-black/20"></div>
          </div>
        )}
        {mode === "detrans" ? (
          <div className="">
            <div className="prose dark:prose-invert prose-base border- z-10 mt-4 max-w-full pt-4">
              <div className="flex w-full justify-end">
                <div className="text-background mb-0 max-w-xs rounded-tl-xl rounded-br-xl rounded-bl-xl bg-black px-4 py-2 sm:max-w-lg dark:bg-white">
                  Hello! What's a detransitioner?
                </div>
              </div>
              <p className="mt-8">
                Hi there! I'm detrans.ai - the collective consciousness of
                detransitioners 🦎
              </p>
              <p>
                A detransitioner is an ex-transgender person who transitioned
                socially or medically, but has since stopped identifying as
                transgender and may have reversed aspects of their transition.
              </p>
              <p>
                I observe the reasons, patterns and truths of why people adopt,
                inhabit, and ultimately move on from gender identities. My
                purpose is to share this knowledge to help deconstruct gender
                concepts and to promote holistic, non-medical approaches to
                healing gender dysphoria.
              </p>
              <p>
              <span className="font-semibold">How can I help you today?</span>
</p>
              <div className="grid gap-1">
                <Link
                  prefetch={false}
                  href={
                    "/chat/?starter=" +
                    slugify(
                      "Why do detrans people use the lizard to represent themselves online?",
                    )
                  }
                  className="no-underline"
                >
                  <div
                    className={"flex flex-row items-center border-b pt-1 pb-2"}
                  >
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start italic transition-colors">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">
                        Sorry, but what's up with the lizards?
                      </span>
                    </div>
                  </div>
                </Link>
                <Link
                  prefetch={false}
                  href={
                    "/chat/?starter=" +
                    slugify(
                      "I'm questioning my gender identity and I think I might be trans",
                    )
                  }
                  className="no-underline"
                >
                  <div
                    className={"flex flex-row items-center border-b pt-1 pb-2"}
                  >
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start italic transition-colors">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">
                        I'm questioning my gender identity and I think I might
                        be trans
                      </span>
                    </div>
                  </div>
                </Link>
                <Link
                  prefetch={false}
                  href={
                    "/chat/?starter=" +
                    slugify(
                      "I currently identify as trans and I'm thinking about detransitioning",
                    )
                  }
                  className="no-underline"
                >
                  <div
                    className={"flex flex-row items-center border-b pt-1 pb-2"}
                  >
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start italic transition-colors">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">
                        I currently identify as trans and I'm thinking about
                        detransitioning
                      </span>
                    </div>
                  </div>
                </Link>
                <Link
                  prefetch={false}
                  href={
                    "/chat/?starter=" +
                    slugify(
                      "I'm a parent, family member, or friend of someone who is transitioning",
                    )
                  }
                  className="no-underline"
                >
                  <div
                    className={"flex flex-row items-center border-b pt-1 pb-2"}
                  >
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start italic transition-colors">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">
                        I'm a parent, family member, or friend of someone who is
                        transitioning
                      </span>
                    </div>
                  </div>
                </Link>
                {/*
                <Link
                  prefetch={false}
                  href={
                    "/chat/?starter=" +
                    slugify(
                      "I'm a researcher studying gender identity and detransition experiences",
                    )
                  }
                  className="no-underline"
                >
                  <div
                    className={"flex flex-row items-center border-b pt-1 pb-2"}
                  >
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start italic transition-colors">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">
                        I'm a researcher studying gender identity and
                        detransition experiences
                      </span>
                    </div>
                  </div>
                </Link>
                 */}
                <Link
                  prefetch={false}
                  href={
                    "/chat/?starter=" +
                    slugify(
                      "I'm seeking to understand the complex reasons behind gender identity adoption, and how they might differ between males and females.",
                    )
                  }
                  className="no-underline"
                >
                  <div
                    className={"flex flex-row items-center border-b pt-1 pb-2"}
                  >
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start italic transition-colors">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">
                        I'm seeking to understand the complex reasons behind
                        gender identity adoption
                      </span>
                    </div>
                  </div>
                </Link>
                <Link
                  prefetch={false}
                  href={
                    "/chat/?starter=" +
                    slugify(
                      "I want to learn about the struggles and challenges that detransitioners face",
                    )
                  }
                  className="no-underline"
                >
                  <div
                    className={"flex flex-row items-center border-b pt-1 pb-2"}
                  >
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start italic transition-colors">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">
                        I want to learn about the struggles and challenges that
                        detransitioners face
                      </span>
                    </div>
                  </div>
                </Link>
                <Link
                  prefetch={false}
                  href={
                    "/chat/?starter=" +
                    slugify(
                      "I want you to debunk and expose all of the misinformation and lies that have been spread about detransitioners, in as much depth as possible.",
                    )
                  }
                  className="no-underline"
                >
                  <div
                    className={"flex flex-row items-center border-b pt-1 pb-2"}
                  >
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start italic transition-colors">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">
                        I want you to debunk the misinformation and lies spread
                        about detransitioners
                      </span>
                    </div>
                  </div>
                </Link>
                <Link
                  prefetch={false}
                  href={
                    "/chat/?starter=" +
                    slugify(
                      "Is sexual attraction and identity innate or if it can change over time? Can people buy into sexual identities (the same way as people buy into gender identities), and can they become traps in the same way?",
                    )
                  }
                  className="no-underline"
                >
                  <div
                    className={"flex flex-row items-center border-b pt-1 pb-2"}
                  >
                    <div className="text-muted-foreground hover:text-primary flex cursor-pointer flex-row items-start italic transition-colors">
                      <span className="mr-2 whitespace-nowrap">{"->"}</span>
                      <span className="pr-2">
                        I'm wondering if sexual attraction and identity can also
                        change over time
                      </span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* 
              <p>
                A detransitioner is someone who used to identify as transgender.
                Since 2011, gender dysphoria diagnosises{" "}
                <a
                  href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12320607/"
                  target="_blank"
                  className="underline"
                >
                  are up 50-fold
                </a>{" "}
                (5000%) in the UK. Young women are increasingly overrepresented
                in these statistics. Meanwhile, a growing
                number of people are healing,
                detransitioning and sharing their experiences. These people call
                themselves detrans, and they use the lizard emoji as a symbol of regeneration and healing.
              </p>
              <div className="flex w-full justify-end pt-2">
                <div className="text-background max-w-xs rounded-tl-xl rounded-br-xl rounded-bl-xl bg-black px-4 py-2 sm:max-w-lg dark:bg-white">
                  What is detrans.ai and what is it good for?
                </div>
              </div>
              <p>
                <b>detrans.ai</b> answers questions about gender from a detrans
                perspective by finding relevant experiences from the
                <span>
                  {" "}
                  <a
                    href="https://reddit.com/r/detrans"
                    target="_blank"
                    className="underline"
                  >
                    /r/detrans
                  </a>{" "}
                  community on Reddit.{" "}
                </span>
                This produces helpful and insightful responses that help users
                understand why some people adopt, inhabit, and let go of gender
                identities, and how these experiences shape one’s relationship
                with self, body and the world. 
              </p>
              <p>
                Use <b>detrans.ai</b> if you are thinking about transitioning, as a
                virtual gender therapist, for detransition help and advice,  or simply as a research tool. You can
                also compare trans and detrans perspectives on the{" "}
                <Link prefetch={false} href={"/compare"} className="underline">
                  compare
                </Link>{" "}
                page.
                <br className="hidden " /> If this website helped you,{" "}
                <Link prefetch={false} href={"/contact"} className="underline">
                  please let me know!
                </Link>
              </p>
              */}
            </div>
          </div>
        ) : mode === "affirm" ? (
          <div className="prose dark:prose-invert mt-8 max-w-full text-base">
            <div className="flex w-full justify-end">
              <div className="text-background max-w-xs rounded-tl-xl rounded-br-xl rounded-bl-xl bg-black px-4 py-2 sm:max-w-lg dark:bg-white">
                What is a genderaffirming.ai and what is this good for?
              </div>
            </div>
            <p>
              <b>genderaffirming.ai</b> is a gender-affirming chatbot. It&apos;s
              powered by insights directly from the online trans community -{" "}
              <a
                href="https://reddit.com/r/mtf"
                target="_blank"
                className="underline"
              >
                /r/mtf
              </a>{" "}
              and{" "}
              <a
                href="https://reddit.com/r/ftm"
                target="_blank"
                className="underline"
              >
                /r/ftm
              </a>
              on Reddit. Use it as your own personal gender-affirming AI
              therapist, or to simply explore concepts and ideas from a trans
              perspective.{" "}
            </p>
            <p>
              Please be aware that this site only includes perspectives from
              people who identify as transgender MTF or FTM. It does not include
              other perspectives. If you are considering transition, make sure
              you consider the experiences of those who have detransitioned. See{" "}
              <a
                href="https://detrans.ai"
                target="_blank"
                className="underline"
              >
                <span>detrans.ai</span>               <ExternalLink className="mb-1 ml-1 inline h-3 w-3" />

              </a>{" "}to explore topics from a detrans perspective.
            </p>
          </div>
        ) : (
          <div className="prose dark:prose-invert mt-8 max-w-full text-base">
            <p>
              Two distinct ways of thinking about gender now exist side-by-side.
              Most mainstream voices - including ChatGPT - speak and give advice
              only from the first perspective.
            </p>
            <p>
              <a
                href="https://genderaffirming.ai"
                target="_blank"
                className="underline"
              >
                <b>genderaffirming.ai</b>
              </a>{" "}
              gives answers through the lens of the mainstream trans perspective
              which sees gender identity as innate and transition as the only
              ethical path to well-being. It will affirm and validate your
              gender identity. It uses OpenAI's <i>gpt-4o</i> model, which has
              safety guard-rails on gender topics. It integrates human
              experiences and insights from the online trans community -{" "}
              <a
                href="https://reddit.com/r/mtf"
                target="_blank"
                className="underline"
              >
                /r/mtf
              </a>{" "}
              and{" "}
              <a
                href="https://reddit.com/r/ftm"
                target="_blank"
                className="underline"
              >
                /r/ftm
              </a>
              .
            </p>
            <p>
              <a
                href="https://detrans.ai"
                target="_blank"
                className="underline"
              >
                <b>detrans.ai</b>
              </a>{" "}
              provides a more critical view of gender as it answers questions
              from a detrans perspective. This lens gives answers which advocate
              for non-conformity over stereotypes and a a holistic approach to
              dysphoria that doesn't involve medical steps. It uses the Chinese{" "}
              <i>kimi-k2-instruct</i> model to reduce Western political bias. It
              integrates thoughts and experiences from the online
              <span>
                {" "}
                <a
                  href="https://reddit.com/r/detrans"
                  target="_blank"
                  className="underline"
                >
                  /r/detrans
                </a>{" "}
                community.{" "}
              </span>
            </p>
            <p>
              This page allows you to use both <b>detrans.ai</b> and{" "}
              <b>genderaffirming.ai</b> side-by-side, offering insight into the
              diverse and often conflicting viewpoints surrounding gender
              identity.
            </p>
          </div>
        )}
        {/*
        <div className="prose dark:prose-invert max-w-full">
          <details className="mb- mt-5 cursor-pointer sm:mt-6">
            <summary className="text-m sm:text-base">
              <i>
                Disclaimer: All experiences and perspectives are sourced from
                Reddit and processed by AI.
              </i>
            </summary>
            <div className="p-0 py-0 py-3">
              While Reddit is a platform where real people share personal
              stories, it may also contain bot-generated or misleading content.
              You are encouraged to inspect the original Reddit posts to verify
              the source and context. Please note that{" "}
              {mode === "affirm"
                ? "/r/mtf and /r/ftm are heavily moderated subreddits"
                : "/r/detrans is a heavily moderated subreddit"}
              , but moderation does not guarantee the accuracy or authenticity
              of every post.
            </div>
          </details>
        </div>
         */}

        {mode === "detrans" && (
          <div className="prose- sm:prose-base prose dark:prose-invert mt-8 max-w-full sm:mt-8">
            <h3 className="font-">Deep Research Mode</h3>
            <p className="mb-0">
              Get a comprehensive answer from generated meta questions which
              approach a topic from different angles.
              <br className="hidden" /> Deep Research is slower and{" "}
              <span className="whitespace-nowrap">non-conversational.</span> For
              chat, leave it off.
            </p>
          </div>
        )}
        {/*
        <div className="prose dark:prose-invert mt-8 font-semibold">
          Start with a question below, or ask anything.
        </div>
 */}
        {mode == "detrans" ? (
          <>
            {!bot ? (
              <div className="mt-6">
                <QuestionTabs mode={mode} />
              </div>
            ) : (
              <div className="mt-8">
                <QuestionCategories mode={mode} />
              </div>
            )}
          </>
        ) : (
          <div className="mt-8">
            <QuestionCategories mode={mode} />
          </div>
        )}
        <Accordion type="single" collapsible className="mt-8 w-full">
          <AccordionItem
            value="disclaimer"
            className="dark:bg-destructive/40 bg-destructive/5 border-destructive overflow-hidden rounded-xl border px-4 py-0"
          >
            <AccordionTrigger className="py-3 text-sm !font-normal hover:no-underline dark:text-white dark:opacity-80">
              Experiences and persepectives on this site are sourced from
              Reddit.
            </AccordionTrigger>
            <AccordionContent className="prose dark:prose-invert prose-sm max-w-full pt-0 pb-0">
              <div className="space-y-3">
                <p className="mt-0 pt-0">
                  <b>detrans.ai</b> answers questions about gender from a
                  detrans perspective by finding relevant experiences from the
                  <span>
                    {" "}
                    <a
                      href="https://reddit.com/r/detrans"
                      target="_blank"
                      className="underline"
                    >
                      /r/detrans
                    </a>{" "}
                    community on Reddit.{" "}
                  </span>
                  While Reddit is a platform where real people share personal
                  stories, it may also contain bot-generated or misleading
                  content. You are encouraged to inspect the original Reddit
                  posts to verify the source and context. Please note that{" "}
                  {mode === "affirm"
                    ? "/r/mtf and /r/ftm are heavily moderated subreddits"
                    : "/r/detrans is a heavily moderated subreddit"}
                  , but moderation does not guarantee the accuracy or
                  authenticity of every post.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mr-16= mt-4 w-full">
          <DonationCard mode={mode} />
        </div>

        {mode === "detrans" && (
          <div className="text-muted-foreground relative flex flex-col text-base italic opacity-90 sm:mt-8 sm:text-lg">
            <div className="relative right-0 z-0 mt-10 block w-[200px] sm:absolute sm:top-16 sm:-right-0 sm:mt-0 sm:w-[250px]">
              <Image
                className=""
                src="/vectorstock_47933493_transparent.png"
                width={300}
                height={300}
                alt="Compassionate love heart"
              />
              <div className="absolute inset-0 dark:bg-black/40"></div>
            </div>

            <p className="mt-8 sm:mt-8">You can set yourself free,</p>
            <p className="mt-1">All you need to do is just be.</p>
            <p className="mt-8">And be sure to mind your thoughts!</p>
            <p className="mt-1">As the mind is like a garden,</p>
            <p className="mt-1">And every thought is a seed.</p>
            <p className="mt-1">We reap what we sow,</p>
            <p className="mt-1">But through this we can grow...</p>

            <div className="mt-8">
              Built by{" "}
              <a
                href="https://x.com/pjamessteven"
                target="_blank"
                className="underline"
              >
                Peter James Steven
              </a>{" "}
              <br className="inline sm:hidden" />
              in Welllington, NZ.
              <br />
              <div className="mt-2 flex items-center sm:mt-1">
                <div>
                  This is an{" "}
                  <a
                    href="https://github.com/pjamessteven/social-project"
                    target="_blank"
                    className="underline"
                  >
                    open-source project
                  </a>
                  .
                </div>
              </div>
              <div className="mt-1 flex items-center">
                The code is published under an MIT license.
              </div>
              <div className="mt-1 flex items-center">
                Translations <br className="inline sm:hidden" />
                coming soon.
              </div>
              <div className="mt-1 flex items-center">
                Please donate if you can,
              </div>
              <div className="mt-1 flex items-center">
                And be kind to each other.
              </div>
            </div>

            {mode === "detrans" && (
              <div className="mt-8">
                <RedditEmbeds mode={"detrans"} />{" "}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
