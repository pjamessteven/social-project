"use server";

import { isBot } from "@/app/lib/isBot";
import {
  BookOpen,
  ChartNoAxesCombined,
  ExternalLink,
  FileText,
  Heart,
  Settings,
  Youtube,
} from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
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
                  ? "Support, advide and knowledge"
                  : ""}
            </div>
          }
        </h1>
        {mode === "detrans" ? (
          <div className="">
            <div className="absolute -top-8 right-0 z-0 w-[200px] sm:top-0 sm:-right-32 sm:w-[250px]">
              <Image
                className=""
                src="/vectorstock_47933493_transparent.png"
                width={300}
                height={300}
                alt="Compassionate love heart"
              />
              <div className="absolute inset-0 dark:bg-black/40"></div>
            </div>

            <div className="prose dark:prose-invert z-10 mt-8 max-w-full">
              <p>
                Since 2011, gender dysphoria diagnosises{" "}
                <a
                  href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12320607/"
                  target="_blank"
                  className="underline"
                >
                  are up 50-fold
                </a>{" "}
                (5000%) in the UK. Young women are increasingly overrepresented
                in these statistics, representing up to{" "}
                <a
                  href="https://sci-hub.se/10.1080/08039488.2019.1667429"
                  target="_blank"
                  className="underline"
                >
                  87% of all referrals
                </a>{" "}
                in Finland. At the same time, a constantly growing number of
                people are healing their gender dysphoria, detransitioning and
                sharing their experiences. These people call themselves detrans.
              </p>
              <p>
                <b>detrans.ai</b> answers questions about gender from a detrans
                perspective by integrating thoughts and experiences from the
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
                with self, body and the world. Please note, all experiences are
                subjective and not representative of all trans or detrans
                people.
              </p>
              <p>
                Use <b>detrans.ai</b> for detransition help and advice, as a
                virtual gender therapist, or simply as a research tool. You can
                also compare trans and detrans perspectives on the{" "}
                <Link prefetch={false} href={"/compare"} className="underline">
                  compare
                </Link>{" "}
                page.
                <br className="hidden sm:inline" /> If this website helped you
                or your family,{" "}
                <Link prefetch={false} href={"/contact"} className="underline">
                  please let me know!
                </Link>
              </p>
              {/*
          <h2 className="text-secondary-foreground/80 semibold mt-2">
            On the surface, gender ideolgy seems progressive; a new way of
            thinking (it certainly is). But detrans experiences repeatedly
            uncover contradictions and uncomfortable truths about this new
            belief system pervading society.
          </h2>
           */}
            </div>
          </div>
        ) : mode === "affirm" ? (
          <div className="prose dark:prose-invert mt-8 text-base">
            <p>
              <b>genderaffirming.ai</b> will affirm your gender identity.
              It&apos;s powered by insights directly from the online trans
              community -{" "}
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
              You can use <b>genderaffirming.ai</b> as your own personal
              gender-affirming AI therapist, or to simply explore concepts and
              ideas from a trans perspective. Please be aware that this site
              only includes gender-affirming perspectives from people who
              identify as transgender MTF or FTM. If you would like to explore
              topics through the lens of those who have detransitioned, see{" "}
              <a
                href="https://detrans.ai"
                target="_blank"
                className="underline"
              >
                <span>detrans.ai</span>
              </a>
              <ExternalLink className="mb-1 ml-1 inline h-3 w-3" />
            </p>
          </div>
        ) : (
          <div className="prose dark:prose-invert mt-8 text-base">
            <p>
              <a
                href="https://genderaffirming.ai"
                target="_blank"
                className="underline"
              >
                <b>genderaffirming.ai</b>
              </a>{" "}
              will affirm your gender identity. It uses OpenAI's <i>gpt-4o</i>{" "}
              model, which has safety guard-rails on gender topics. It
              integrates human experiences and insights from the online trans
              community -{" "}
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
              from a detrans perspective. It uses the Chinese{" "}
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
              <b>genderaffirming.ai</b> side-by-side. This allows for a direct
              comparison between the perspectives of those who currently
              identify as trans and those who have moved on from trans identity,
              offering insight into the diverse and sometimes conflicting
              viewpoints surrounding gender identity.
            </p>
          </div>
        )}

        {mode === "detrans" && (
          <div className="mt-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
              <Link href="/support">
                <Button
                  variant="secondary"
                  className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
                >
                  <Heart className="h-4 w-4" />
                  <span className="text-sm font-medium">Help & Support</span>
                </Button>
              </Link>
              <Link href="/stories">
                <Button
                  variant="secondary"
                  className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
                >
                  <Youtube className="h-4 w-4" />
                  <span className="text-sm font-medium">Personal Stories</span>
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
                  <span className="text-sm font-medium">Studies</span>
                </Button>
              </Link>
              <a
                href="https://statsforgender.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="secondary"
                  className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
                >
                  <ChartNoAxesCombined className="h-4 w-4" />
                  <span className="text-sm font-medium">Statistics</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
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
        <div className="text-accent-foreground/80 bg-destructive/5 dark:bg-destructive/40 border-destructive mt-8 w-full rounded-lg border p-3 text-sm opacity-80">
          <span className="text-destructive font-semibold brightness-80 dark:brightness-120">
            Disclaimer:
          </span>{" "}
          <span className="text-destructive brightness-80 dark:brightness-120">
            The experiences shared on this site are sourced from Reddit and
            processed by AI. While Reddit is a platform where real people share
            personal stories, it may also contain bot-generated or misleading
            content. You are encouraged to inspect the original Reddit posts to
            verify the source and context. Please note that{" "}
            {mode === "affirm"
              ? "/r/mtf and /r/ftm are heavily moderated subreddits"
              : "/r/detrans is a heavily moderated subreddit"}
            , but moderation does not guarantee the accuracy or authenticity of
            every post.
          </span>
        </div>

        {/*
        <div className="prose dark:prose-invert mt-8 font-semibold">
          Start with a question below, or ask anything.
        </div>
 */}
        {mode == "detrans" ? (
          <>
            {!bot ? (
              <div className="mt-8">
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
        {mode === "detrans" && (
          <div className="text-muted-foreground relative flex flex-col text-base italic opacity-90 sm:text-lg">
            <div className="right-0 z-0 block w-[200px] sm:absolute sm:top-16 sm:-right-0 sm:w-[250px]">
              {/*
              <Image
                className="dark:invert"
                src="/vectorstock_29462911_transparent.png"
                width={300}
                height={300}
                alt="Friends helping a friend"
              />
              <div className="inset-0 hidden sm:absolute dark:bg-black/40"></div>
             */}
            </div>

            <p className="mt-8 sm:mt-8">You can set yourself free,</p>
            <p className="mt-1">All you need to do is just be.</p>
            <p className="mt-8">And be sure to mind your thoughts!</p>
            <p className="mt-1">As the mind is like a garden,</p>
            <p className="mt-1">And every thought is a seed.</p>
            <p className="mt-1">We reap what we sow,</p>
            <p className="mt-1">But through this we can grow...</p>

            <div className="mt-8">
              Built by Peter James Steven <br className="inline sm:hidden" />
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
                The code is available under an MIT license.
              </div>
              <div className="mt-1 flex items-center">
                European language translations{" "}
                <br className="inline sm:hidden" />
                coming soon...
              </div>
              <div className="mt-1 flex items-center">
                Nobody in the real world <br className="inline sm:hidden" />
                is afraid of getting cancelled.
              </div>
            </div>
            <div className="font-base mt-16 text-lg not-italic">
              <DonationCard mode={mode} />
            </div>
            {mode === "detrans" && (
              <div className="">
                <RedditEmbeds mode={"detrans"} />{" "}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
