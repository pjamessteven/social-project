"use server";

import { isBot } from "@/app/lib/isBot";
import { isRTL } from "@/i18n/locales";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import {
  BookOpen,
  ChartNoAxesCombined,
  Heart,
  MessageSquareIcon,
  Youtube,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Image from "next/image";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import LizardAnimation from "../ui/lizard-animation";
import ChatBubbleButton from "./ChatBubbleButton";
import DonationCard from "./DonationCard";
import { FeaturedConversations } from "./FeaturedConversations/FeaturedConversations";
import ParticipateCard from "./ParticipateCard";
import RedditEmbeds from "./RedditEmbeds";
import XCard from "./XCard";

export async function StartPage({
  className,
  searchParams,
  locale,
}: {
  className?: string;
  searchParams?: { [key: string]: string | string[] | undefined };
  locale: string;
}) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });

  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  // Get starter questions from translations
  const detransStarters = [
    {
      display: t("starters.lizardQuestion.display"),
      full: t("starters.lizardQuestion.full"),
    },
    {
      display: t("starters.curious.display"),
      full: t("starters.curious.full"),
    },
    {
      display: t("starters.questioningTrans.display"),
      full: t("starters.questioningTrans.full"),
    },
    {
      display: t("starters.thinkingDetrans.display"),
      full: t("starters.thinkingDetrans.full"),
    },
    {
      display: t("starters.familyMember.display"),
      full: t("starters.familyMember.full"),
    },
    /*
    {
      display: t("starters.researcher.display"),
      full: t("starters.researcher.full"),
    },
    */
    {
      display: t("starters.learnChallenges.display"),
      full: t("starters.learnChallenges.full"),
    },
    /*
    {
      display: t("starters.understandTransition.display"),
      full: t("starters.understandTransition.full"),
    },
    */
    {
      display: t("starters.debunkMisinfo.display"),
      full: t("starters.debunkMisinfo.full"),
    },
    {
      display: t("starters.scientificConsensus.display"),
      full: t("starters.scientificConsensus.full"),
    },
  ];

  return (
    <>
      <div className="relative flex flex-col pb-[88px]">
        <div className="z-10 mt-[20vh]">
          <div className="-mt-6 mb-8 flex justify-start">
            <span className="bg-destructive text-destructive-foreground inline-block rounded-full px-3 py-1 text-xs font-semibold shadow-sm select-none">
              Update: Chat unavailable due to lack of funds, check back
              tomorrow.
            </span>
          </div>
          <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
            <span className="text-muted-foreground block opacity-30 dark:opacity-80">
              detrans.ai
            </span>
            <span className="block max-w-2xl">{t("title")}</span>
            <span className="text-muted-foreground block opacity-30 dark:opacity-80">
              {t("subtitle")}
            </span>
          </h1>
        </div>

        <div className="mt-8 hidden">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/videos">
              <Button
                variant="secondary"
                className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
              >
                <Youtube className="h-4 w-4" />
                <span className="text-sm font-medium">Videos</span>
              </Button>
            </Link>
            <Link href="/studies">
              <Button
                variant="secondary"
                className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-sm font-medium sm:inline">
                  {t("navigation.studiesShort")}
                </span>
              </Button>
            </Link>
            <Link href="/stats">
              <Button
                variant="secondary"
                className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
              >
                <ChartNoAxesCombined className="h-4 w-4" />
                <span className="text-sm font-medium">Stats</span>
              </Button>
            </Link>
            <Link href="/support">
              <Button
                variant="secondary"
                className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
              >
                <Heart className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t("navigation.support")}
                </span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 w-full sm:mt-8">
          <div className="w-full border-t" />
          <div className="mt-1 w-full border-t" />
          <div className="mt-1 w-full border-t" />
        </div>
        <div className="text-muted-foreground/60 dark:text-muted-foreground/60 pt-4 pb-3 text-sm sm:text-center">
          {t("privacyDisclaimer")}
          <span className="sm:hidden">
            &nbsp;{t("privacyDisclaimerChatsPublic")}
          </span>
          <br />
          <span className="hidden sm:inline">
            {t("privacyDisclaimerChatsPublic")}&nbsp;
          </span>
          <span className="hidden sm:inline">
            {t.rich("memberCountDisclaimer", {
              a: (chunks) => (
                <a
                  href="https://reddit.com/r/detrans"
                  target="_blank"
                  className="underline"
                >
                  {chunks}
                </a>
              ),
            })}
            .
          </span>
          <span className="sm:hidden">
            *
            {t.rich("memberCountDisclaimerMobile", {
              a: (chunks) => (
                <a
                  href="https://reddit.com/r/detrans"
                  target="_blank"
                  className="underline"
                >
                  {chunks}
                </a>
              ),
            })}
            .
          </span>
        </div>
        <div className="mt-1 w-full border-t" />
        <div className="mt-1 w-full border-t" />
        <div className="mt-1 w-full border-t" />

        <div className="absolute top-0 right-0 z-0 w-[170px] rotate-15 sm:top-8 sm:-right-32 sm:w-[220px]">
          <LizardAnimation />
          <div className="absolute inset-0 dark:bg-black/20"></div>
        </div>

        <div className="">
          <div className="prose dark:prose-invert prose-base border- z-10 mt-4 max-w-full pt-4">
            <div className="flex w-full justify-end">
              <div className="text-background mb-0 max-w-xs rounded-tl-xl rounded-br-xl rounded-bl-xl bg-black px-4 py-2 font-medium sm:max-w-full dark:bg-white">
                {t("intro.greeting")}
              </div>
            </div>
            <p className="mt-8">{t("intro.response")}</p>
            <p>{t("intro.definition")}</p>
            <p>{t("intro.description")}</p>
            <p>{t("intro.purpose")}</p>

            <p className="mt-">
              <span className="font-semibold">{t("intro.helpPrompt")}</span>
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
                {t("browseConversations")}
              </button>
            </Link>
          </div>
        )}

        {/*
        <div className="sm:prose-base prose dark:prose-invert max-w-full sm:mt-4">
          <div className="flex items-center justify-start gap-2 lg:mt-2">
            <BookOpen className="mx-2 h-6 w-6 text-black dark:text-white" />

            <h3 className="my-0! py-0! text-xl font-bold">
              {t("deepResearch.title")}
            </h3>
          </div>
          <p className="text-muted-foreground prose-sm sm:prose-base mb-0">
            {t("deepResearch.description")}
            <br className="hidden" /> {t("deepResearch.note")}
          </p>
        </div>

        <>
          {!bot ? (
            <div className="mt-6">
              <QuestionTabs mode="detrans" />
            </div>
          ) : (
            <div className="mt-8">
              <QuestionCategories mode="detrans" locale={locale} />
            </div>
          )}
        </>
 */}
        <div className="relative mt-4 -mb-16 pb-16 sm:mt-8">
          <div className="from-secondary/50 dark:from-secondary/50 absolute -left-[5000px] z-0 h-full w-[10000px] border-t bg-linear-to-b to-white dark:to-black" />
          <div className="relative z-20 -mt-20 pt-8 sm:pt-12">
            <Card
              className={
                "dark:bg-secondary bg-accent overflow-hidden rounded-xl border border-black/20 shadow-xs dark:border-white/10"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquareIcon className="text-foreground mr-2 h-5 w-5" />
                    <CardTitle className="text-foreground leading-normal dark:text-white">
                      {t("disclaimer.trigger")}
                    </CardTitle>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  <div className="space-y-3">
                    <p className="mt-0 pt-0 leading-relaxed">
                      {t("disclaimer.content")}
                    </p>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="mr-16= mt-4 w-full sm:mt-6">
              <ParticipateCard />
            </div>
            <div className="mt-4 w-full sm:mt-6">
              <DonationCard mode="detrans" />
            </div>
            <div className="mt-4 w-full sm:mt-6">
              <XCard />
            </div>

            <div className="text-muted-foreground relative mt-12 flex flex-col text-base opacity-90 sm:mt-12 sm:text-base">
              <h2 className="text-foreground mb-4 font-medium">
                {t("aboutDetransition.title")}
              </h2>
              <p>{t("aboutDetransition.whatIs")}</p>
              <p className="mt-4">
                {t.rich("aboutDetransition.reality", {
                  a: (chunks) => (
                    <Link
                      href={
                        "/research/why-are-detransition-statistics-unreliable-and-who-runs-us-transgender-survey" as any
                      }
                      className="underline"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>

              <h2 className="text-foreground mt-8 font-medium">
                {t("aboutDetransition.hardToFindTitle")}
              </h2>

              <p className="mt-4">{t("aboutDetransition.onlineSpaces")}</p>
              <p className="mt-4">{t("aboutDetransition.aiBias")}</p>
              <p className="mt-4">{t("aboutDetransition.restoreBalance")}</p>
              <h2 className="text-foreground mt-8 font-medium">
                {t("aboutDetransition.supportTitle")}
              </h2>

              <p className="mt-4">
                {t("aboutDetransition.supportDescription")}
              </p>

              <p className="mt-4">{t("aboutDetransition.whatYouCanLearn")}</p>
              <p className="mt-4">
                {t.rich("aboutDetransition.differentStages", {
                  a: (chunks) => <Link href="/support">{chunks}</Link>,
                })}
              </p>
              <p className="mt-4">{t("aboutDetransition.closing")}</p>
            </div>

            <div className="text-muted-foreground relative flex flex-col text-base italic opacity-90 sm:mt-8">
              <div
                className={`relative z-0 mt-10 block w-[200px] sm:absolute sm:top-0 sm:mt-0 sm:w-[250px] ${isRTL(locale) ? "left-0 sm:left-0" : "right-0 sm:-right-0"}`}
              >
                <Image
                  className="dark:opacity-40"
                  src="/vectorstock_47933493_transparent.png"
                  width={300}
                  height={300}
                  alt="Compassionate love heart"
                />
                <div className="absolute inset-0"></div>
              </div>

              {/*
          <p className="mt-8 sm:mt-8">{t("footer.poem.line1")}</p>
          <p className="mt-1">{t("footer.poem.line2")}</p>
           */}
              <div className="border-l pl-4">
                <p className="">{t("footer.poem.line3")}</p>
                <p className="mt-1">{t("footer.poem.line4")}</p>
                <p className="mt-1">{t("footer.poem.line5")}</p>
                <p className="mt-1">{t("footer.poem.line6")}</p>
                <p className="mt-1">{t("footer.poem.line7")}</p>
                {locale !== "en" &&
                  (await (async () => {
                    const tEn = await getTranslations({
                      locale: "en" as Locale,
                      namespace: "home",
                    });
                    return (
                      <div className="mt-4 max-w-sm">
                        <div className="max-w-xs border-t" />
                        <p className="mt-3">{tEn("footer.poem.line3")}</p>
                        <p className="mt-1">{tEn("footer.poem.line4")}</p>
                        <p className="mt-1">{tEn("footer.poem.line5")}</p>
                        <p className="mt-1">{tEn("footer.poem.line6")}</p>
                        <p className="mt-1">{tEn("footer.poem.line7")}</p>
                      </div>
                    );
                  })())}
              </div>
              <div className="mt-8">
                {t.rich("footer.openSource", {
                  project: (chunks) => (
                    <a
                      href="https://github.com/pjamessteven/social-project"
                      target="_blank"
                      className="underline"
                    >
                      {chunks}
                    </a>
                  ),
                  author: (chunks) => (
                    <a
                      href="https://x.com/pjamessteven"
                      target="_blank"
                      className="underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
                <div className="mt-1 flex items-center">
                  {t("footer.madeWithLove")}
                </div>
                <div className="mt-8 flex items-center underline">
                  <Link href="/donate">{t("footer.donatePrompt")} </Link>
                </div>
                <div className="mt-1 flex items-center">
                  {t("footer.beKind")}
                </div>
              </div>

              <div className="mt-8">
                <RedditEmbeds mode={"detrans"} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
