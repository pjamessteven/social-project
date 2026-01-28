"use server";

import { isBot } from "@/app/lib/isBot";
import {
  BookOpen,
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
import { Button } from "../ui/button";
import LizardAnimation from "../ui/lizard-animation";
import ChatBubbleButton from "./ChatBubbleButton";
import DisclaimerMessage from "./DisclaimerMessage";
import DonationCard from "./DonationCard";
import { FeaturedConversations } from "./FeaturedConversations/FeaturedConversations";
import ParticipateCard from "./ParticipateCard";
import { QuestionCategories } from "./QuestionCategories";
import { QuestionTabs } from "./QuestionTabs";
import RedditEmbeds from "./RedditEmbeds";

export async function StartPage({
  className,
  searchParams,
}: {
  className?: string;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const isDev = process.env.NODE_ENV === "development";

  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  const detransStarters = [
    {
      display: "Sorry, but what's up with the lizards?",
      full: "Why do detransitioners use the lizard to represent themselves online?",
    },
    {
      display: "I'm curious about why some people detransition",
      full: "I'm seeking to understand the complex reasons behind gender identity adoption, and how they might differ between males and females.",
    },
    {
      display:
        "I'm questioning my gender identity and I think I might be trans",
      full: "I'm questioning my gender identity and I think I might be trans",
    },
    {
      display:
        "I currently identify as trans and I'm thinking about detransitioning",
      full: "I currently identify as trans and I'm thinking about detransitioning",
    },
    {
      display:
        "I'm a parent, family member, or friend of someone who is transitioning",
      full: "I'm a parent, family member, or friend of someone who is transitioning",
    },
    {
      display:
        "I'm a researcher studying gender identity and detransition experiences",
      full: "I'm a researcher studying gender identity and detransition experiences",
    },
    {
      display:
        "I want to learn about the struggles and challenges that detransitioners face",
      full: "I want to learn about the struggles and challenges that detransitioners face",
    },
    {
      display:
        "I want to understand why detransitioners decided to transition in the first place",
      full: "I want to understand why these people transitioned in the first place, and how they might differ between males and females.",
    },

    {
      display:
        "I want you to debunk misinformation and commonly held beliefs about detransition",
      full: "Please debunk all of the misinformation and commonly held beliefs about detransitioners, in as much depth as possible.",
    },
  ];

  return (
    <>
      <div className="relative flex flex-col pb-[88px]">
        <div className="border-muted-foreground/50 -mx-4 -mt-1 hidden border-b sm:mx-4 sm:mt-0 sm:rounded-xl sm:border sm:pt-4">
          <DisclaimerMessage />
        </div>
        <h1 className="z-10 mt-[20vh] text-3xl font-bold sm:text-4xl">
          <div className="text-muted-foreground opacity-30 dark:opacity-80">
            detrans.ai
          </div>
          {/*Come and join us in the real world.*/}
          Talk to 50,000+ Detransitioners
          {
            <div className="text-muted-foreground opacity-30 dark:opacity-80">
              Perspectives From The Other Side
            </div>
          }
        </h1>

        <div className="mt-8 hidden sm:block">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <Link href="/videos">
              <Button
                variant="secondary"
                className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
              >
                <Youtube className="h-4 w-4" />
                <span className="text-sm font-medium">Detransition Videos</span>
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
                <span className="text-sm font-medium">Gender Terminology</span>
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

            <Link href="/prompts">
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

        <div className="mt-8 w-full sm:mt-8">
          <div className="w-full border-t" />
          <div className="mt-1 w-full border-t" />
          <div className="mt-1 w-full border-t" />
        </div>
        <div className="absolute top-0 right-0 z-0 w-[170px] rotate-15 sm:top-8 sm:-right-32 sm:w-[220px]">
          <LizardAnimation />
          <div className="absolute inset-0 dark:bg-black/20"></div>
        </div>

        <div className="">
          <div className="prose dark:prose-invert prose-base border- z-10 mt-4 max-w-full pt-4">
            <div className="flex w-full justify-end">
              <div className="text-background mb-0 max-w-xs rounded-tl-xl rounded-br-xl rounded-bl-xl bg-black px-4 py-2 font-medium sm:max-w-lg dark:bg-white">
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
              I observe the reasons, patterns and truths of why some people
              adopt, inhabit and move on from gender identities by reading
              stories and experiences that have been posted on the{" "}
              <a
                href="https://reddit.com/r/detrans"
                target="_blank"
                className="whitespace-nowrap"
              >
                /r/detrans subreddit
              </a>{" "}
              and watching detransition videos that have been uploaded to{" "}
              <a href="https://detrans.ai/videos" target="_blank">
                YouTube
              </a>
              .{" "}
              <p>
                My purpose is to share this knowledge in order to deconstruct
                gender and to explore how these experiences shape one’s
                relationship with self, body and the world.
              </p>
            </p>
            <p className="mt-">
              <span className="font-semibold">How can I help you today?</span>
            </p>
            <div className="mb-8 flex w-full flex-col gap-3 sm:items-end md:mb-16">
              {detransStarters.map((starter, index) => (
                <ChatBubbleButton key={index} message={starter} isLink={true} />
              ))}
            </div>
          </div>
        </div>

        <FeaturedConversations />
        {bot && (
          <div className="mt-4 text-center">
            <Link href="/conversations">
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                Browse all Conversations
              </button>
            </Link>
          </div>
        )}

        <div className="sm:prose-base prose dark:prose-invert max-w-full sm:mt-4">
          <div className="flex items-center justify-start gap-2 lg:mt-2">
            <BookOpen className="mx-2 h-6 w-6 text-black dark:text-white" />

            <h3 className="my-0! py-0! text-xl font-bold">
              Deep Research Mode
            </h3>
          </div>
          <p className="text-muted-foreground prose-sm sm:prose-base mb-0">
            Deep Research mode expands your question to give you an answer that
            approachs the topic from different angles.
            <br className="hidden" /> Deep Research is slower and{" "}
            <span className="whitespace-nowrap">non-conversational.</span> For
            chat, leave it off.
          </p>
        </div>
        {/*
        <div className="prose dark:prose-invert mt-8 font-semibold">
          Start with a question below, or ask anything.
        </div>
 */}

        <>
          {!bot ? (
            <div className="mt-6">
              <QuestionTabs mode="detrans" />
            </div>
          ) : (
            <div className="mt-8">
              <QuestionCategories mode="detrans" />
            </div>
          )}
        </>
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
                  /r/detrans is a heavily moderated subreddit , but moderation
                  does not guarantee the accuracy or authenticity of every post.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mr-16= mt-4 w-full">
          <DonationCard mode="detrans" />
        </div>
        <div className="mt-4 w-full">
          <ParticipateCard />
        </div>

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
            An{" "}
            <a
              href="https://github.com/pjamessteven/social-project"
              target="_blank"
              className="underline"
            >
              open-source
            </a>{" "}
            project by{" "}
            <a
              href="https://x.com/pjamessteven"
              target="_blank"
              className="underline"
            >
              Peter James Steven
            </a>{" "}
            <div className="mt-1 flex items-center">
              Made with love in Te Whanganui-a-Tara (Wellington, NZ)
            </div>
            <div className="mt-8 flex items-center">
              Please donate if you can,
            </div>
            <div className="mt-1 flex items-center">
              And be kind to each other.
            </div>
          </div>

          <div className="mt-8">
            <RedditEmbeds mode={"detrans"} />{" "}
          </div>
        </div>
      </div>
    </>
  );
}
