"use server";

import { isBot } from "@/app/lib/isBot";
import { isRTL } from "@/i18n/locales";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import {
  BookOpen,
  FileText,
  Heart,
  Settings,
  Users,
  Youtube,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Image from "next/image";
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
    {
      display: t("starters.researcher.display"),
      full: t("starters.researcher.full"),
    },
    {
      display: t("starters.learnChallenges.display"),
      full: t("starters.learnChallenges.full"),
    },
    {
      display: t("starters.understandTransition.display"),
      full: t("starters.understandTransition.full"),
    },
    {
      display: t("starters.debunkMisinfo.display"),
      full: t("starters.debunkMisinfo.full"),
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
          <div className="max-w-2xl">{t("title")}</div>
          {
            <div className="text-muted-foreground opacity-30 dark:opacity-80">
              {t("subtitle")}
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
                <span className="text-sm font-medium">
                  {t("navigation.videos")}
                </span>
              </Button>
            </Link>
            <Link href="/stories">
              <Button
                variant="secondary"
                className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
              >
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t("navigation.stories")}
                  <span className="hidden sm:inline"> & Statistics</span>
                </span>
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
            <Link href="/definitions">
              <Button
                variant="secondary"
                className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t("navigation.definitions")}
                </span>
              </Button>
            </Link>
            <Link href="/studies">
              <Button
                variant="secondary"
                className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden text-sm font-medium sm:inline">
                  {t("navigation.studies")}
                </span>
                <span className="text-sm font-medium sm:hidden">
                  {t("navigation.studiesShort")}
                </span>
              </Button>
            </Link>

            <Link href="/prompts">
              <Button
                variant="secondary"
                className="h-auto w-full flex-row items-center gap-2 rounded-xl p-4"
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t("navigation.howItWorks")}
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

        <Accordion type="single" collapsible className="mt-8 w-full">
          <AccordionItem
            value="disclaimer"
            className="dark:bg-destructive/40 bg-destructive/5 border-destructive overflow-hidden rounded-xl border px-4 py-0"
          >
            <AccordionTrigger className="py-3 text-sm !font-normal hover:no-underline dark:text-white dark:opacity-80">
              {t("disclaimer.trigger")}
            </AccordionTrigger>
            <AccordionContent className="prose dark:prose-invert prose-sm max-w-full pt-0 pb-0">
              <div className="space-y-3">
                <p className="mt-0 pt-0">
                  <b>detrans.ai</b> {t("disclaimer.content")}
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
          <div
            className={`relative z-0 mt-10 block w-[200px] sm:absolute sm:top-16 sm:mt-0 sm:w-[250px] ${isRTL(locale) ? "left-0 sm:left-0" : "right-0 sm:-right-0"}`}
          >
            <Image
              className=""
              src="/vectorstock_47933493_transparent.png"
              width={300}
              height={300}
              alt="Compassionate love heart"
            />
            <div className="absolute inset-0 dark:bg-black/40"></div>
          </div>

          {/*
          <p className="mt-8 sm:mt-8">{t("footer.poem.line1")}</p>
          <p className="mt-1">{t("footer.poem.line2")}</p>
           */}
          {locale !== "en" &&
            (await (async () => {
              const tEn = await getTranslations({
                locale: "en" as Locale,
                namespace: "home",
              });
              return (
                <div className="-mb-4 max-w-sm border-b pb-4">
                  <p className="mt-8">{tEn("footer.poem.line3")}</p>
                  <p className="mt-1">{tEn("footer.poem.line4")}</p>
                  <p className="mt-1">{tEn("footer.poem.line5")}</p>
                  <p className="mt-1">{tEn("footer.poem.line6")}</p>
                  <p className="mt-1">{tEn("footer.poem.line7")}</p>
                </div>
              );
            })())}
          <p className="mt-8">{t("footer.poem.line3")}</p>
          <p className="mt-1">{t("footer.poem.line4")}</p>
          <p className="mt-1">{t("footer.poem.line5")}</p>
          <p className="mt-1">{t("footer.poem.line6")}</p>
          <p className="mt-1">{t("footer.poem.line7")}</p>

          <div className="mt-8">
            <a
              href="https://github.com/pjamessteven/social-project"
              target="_blank"
              className="underline"
            >
              {t("footer.openSource")}
            </a>
            <div className="mt-1 flex items-center">
              {t("footer.madeWithLove")}
            </div>
            <div className="mt-8 flex items-center">
              {t("footer.donatePrompt")}
            </div>
            <div className="mt-1 flex items-center">{t("footer.beKind")}</div>
          </div>

          <div className="mt-8">
            <RedditEmbeds mode={"detrans"} />
          </div>
        </div>
      </div>
    </>
  );
}
