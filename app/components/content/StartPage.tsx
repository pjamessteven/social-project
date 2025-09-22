"use server";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChartNoAxesCombined, ExternalLink, FileText, Heart, Youtube } from "lucide-react";
import { Button } from "../ui/button";
import DonationCard from "./DonationCard";
import { QuestionCategories } from "./QuestionCategories";
import RedditEmbeds from "./RedditEmbeds";
import ScrollRestoration from "./ScrollRestoration";

export async function StartPage({
  className,
  mode,
}: {
  className?: string;
  mode: "affirm" | "detrans" | "compare";
}) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      <ScrollRestoration /> {/* client-side logic  */}
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
              ? "Talk to 600,000+ Trans and Non-Binary"
              : "Compare Perspectives"}
          <div className="text-muted-foreground opacity-30 dark:opacity-80">
            {mode === "detrans"
              ? "#FreeYourMind"
              : mode == "affirm"
                ? "#TransPeopleKnowBest"
                : "#SeeBothSides"}
          </div>
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

            <div className="prose dark:prose-invert z-10 mt-8">
              <p>
                Did you know that since 2012, gender dysphoria diagnosises{" "}
                <a
                  href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12320607/"
                  target="_blank"
                  className="underline"
                >
                  are up 5000%
                </a>{" "}
                in the UK? Young women are increasingly overrepresented in these
                statistics,{" "}
                <a
                  href="https://sci-hub.se/10.1080/08039488.2019.1667429"
                  target="_blank"
                  className="underline"
                >
                  up to 87% of all referrals
                </a>{" "}
                in Finland. At the same time, a constantly growing number of
                people are healing dysphoria, de-transitioning and sharing their
                experience. These people call themselves &apos;detrans&apos; and
                their experiences provide fascinating insights into gender
                ideolgy and identity belief systems.
              </p>
              <p>
                <b>detrans.ai</b> answers questions from a detrans perspective
                by integrating thoughts and experiences from the online
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
                This produces helpful and insightful responses that help users
                understand how and why people adopt, inhabit, and let go of
                gender identities, and how these experiences shape one’s
                relationship with self, body and the world.
              </p>
              <p>
                You can use <b>detrans.ai</b> as your own personal
                gender-exploratory therapist, or simply as a research tool.
                Every person experiencing gender dysphoria should hear the
                perspectives of people who have{" "}
                <i>'been there and done that'</i> before pursuing medical
                transition, and they should also make themselves aware of how
                cancel culture and echo chambers can affect the information they
                are receiving, even from the government, universtities and
                health institutions.
              </p>
              <p>
                For a more <i>affirming</i> experience, please see{" "}
                <a
                  href={isDev ? "/affirm" : "https://genderaffirming.ai"}
                  target="_blank"
                  className="underline"
                >
                  genderaffirming.ai
                </a>
                .<br className="hidden sm:inline" /> You can also compare trans
                and detrans perspectives from the{" "}
                <Link prefetch={false} href={"/compare"} className="underline">
                  compare
                </Link>{" "}
                page.
              </p>
              {/*
          <h2 className="text-secondary-foreground/80 semibold mt-2">
            On the surface, gender ideolgy seems progressive; a new way of
            thinking (it certainly is). But detrans experiences repeatedly
            uncover contradictions and uncomfortable truths about this new
            belief system pervading society.
          </h2>
           */}
              <h4>
                Support, life advice and knowledge from over 50,000
                detransitioners and desisters.
              </h4>
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
                detrans.ai
              </a>
            </p>

            <h4>
              Support, life advice and knowledge from over 600,000+ trans
              people.
            </h4>
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
              will affirm your gender identity. It&apos;s powered by insights
              directly from the online trans community -{" "}
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
              from a detrans perspective. It integrates thoughts and experiences
              from the online
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

        {mode !== "compare" && (
          <div className="mt-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Link href="/support">
                <Button variant="secondary" className="h-auto w-full flex-col gap-2 p-4">
                  <Heart className="h-6 w-6" />
                  <span className="text-sm font-medium">Get Support</span>
                </Button>
              </Link>
              <Link href="/stories">
                <Button variant="secondary" className="h-auto w-full flex-col gap-2 p-4">
                  <Youtube className="h-6 w-6" />
                  <span className="text-sm font-medium">Personal Stories</span>
                </Button>
              </Link>
              <Link href="/definitions">
                <Button variant="secondary" className="h-auto w-full flex-col gap-2 p-4">
                  <FileText className="h-6 w-6" />
                  <span className="text-sm font-medium">Definitions</span>
                </Button>
              </Link>
              <Link href="/studies">
                <Button variant="secondary" className="h-auto w-full flex-col gap-2 p-4">
                  <BookOpen className="h-6 w-6" />
                  <span className="text-sm font-medium">Studies</span>
                </Button>
              </Link>
              <a href="https://statsforgender.org/" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" className="h-auto w-full flex-col gap-2 p-4">
                  <div className="flex items-center gap-1">
                    <ChartNoAxesCombined className="h-6 w-6" />
                    <ExternalLink className="h-3 w-3" />
                  </div>
                  <span className="text-sm font-medium">Statistics</span>
                </Button>
              </a>
            </div>
          </div>
        )}

        {mode === "detrans" && (
          <div className="mt-4 sm:mt-8">
            <RedditEmbeds mode={mode} />{" "}
          </div>
        )}

        <div className="mt-8">
          <QuestionCategories mode={mode} />
        </div>
        {mode === "detrans" && (
          <div className="text-muted-foreground relative flex flex-col text-base italic opacity-90 sm:text-lg">
            <div className="right-0 z-0 block w-[200px] sm:absolute sm:top-16 sm:-right-0 sm:w-[250px]">
              <Image
                className="dark:invert"
                src="/vectorstock_29462911_transparent.png"
                width={300}
                height={300}
                alt="Friends helping a friend"
              />
              <div className="inset-0 hidden sm:absolute dark:bg-black/40"></div>
            </div>
            <p className="mt-8 sm:mt-16">
              The truth can hurt, but it will set you free -
            </p>
            <p className="mt-1">All you need to do, is learn to just be.</p>
            <p className="mt-8">And be sure to mind your thoughts,</p>
            <p className="mt-1">Because the mind is like a garden,</p>
            <p className="mt-1">And each thought is a seed.</p>
            <p className="mt-1">We reap what we sow,</p>
            <p className="mt-1">But through this we can grow.</p>

            <div className="mt-16">
              Built by{" "}
              <a
                href="https://bitbout.me"
                target="_blank"
                className="underline"
              >
                Peter James Steven
              </a>{" "}
              in Welllington, NZ
              <br />
              <div className="mt-1 flex items-center">
                <div>
                  This is an open-source project. The code is available under an
                  MIT license on{" "}
                  <a
                    href="https://github.com/pjamessteven/social-project"
                    target="_blank"
                    className="underline"
                  >
                    Github
                  </a>
                  .
                </div>
              </div>
              <div className="mt-1 flex items-center">
                European language translations coming soon...
              </div>
              <div className="mt-1 flex items-center">
                Nobody in the real world is afraid of getting cancelled!
              </div>
            </div>
            <div className="font-base mt-16 text-lg not-italic">
              <DonationCard mode={mode} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
