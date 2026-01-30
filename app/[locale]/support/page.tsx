"use server";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@/app/components/ui/sidebar";
import { Link } from "@/i18n/routing";
import { ChevronRight, Globe } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "supportPage" });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    openGraph: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      url: "https://detrans.ai/support",
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: locale === "en" ? "en_US" : locale === "fr" ? "fr_FR" : "es_ES",
      type: "website",
    },
  };
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "supportPage" });
  const isEnglish = locale === "en";

  const navigationItems = [
    {
      title: t("sections.onlineSupport.title"),
      href: "#online-support-groups",
    },
    {
      title: t("sections.genderAffirmingCare.title").split(":")[0],
      href: "#gender-affirming-care",
    },
    {
      title: t("sections.genderExploratoryTherapy.title").split(":")[0],
      href: "#gender-exploratory-therapy",
    },
    {
      title: t("sections.findTherapist.title").split("?")[0],
      href: "#find-a-therapist",
      children: [
        {
          title: t("sections.findTherapist.organizations.justTherapy.name"),
          href: "#just-therapy",
        },
        {
          title: t("sections.findTherapist.organizations.therapyFirst.name"),
          href: "#therapy-first",
        },
        {
          title: t("sections.findTherapist.organizations.beyondTrans.name"),
          href: "#beyond-trans",
        },
        {
          title: t(
            "sections.findTherapist.organizations.detransFoundation.name",
          ),
          href: "#detrans-foundation",
        },
      ],
    },
    {
      title: t("sections.forParents.title"),
      href: "#for-parents",
      children: [
        {
          title:
            t("sections.forParents.rogdRepair.name").split("'s")[1]?.trim() ||
            "ROGD Repair Program",
          href: "#roqd-repair",
        },
      ],
    },
  ];

  function MobileJumpToSection() {
    return (
      <div className="prose-none bg-muted/50 mb-8 rounded-lg border p-4 lg:hidden">
        <h3 className="mt-0 mb-3 text-sm font-semibold">
          {t("navigation.jumpTo")}
        </h3>
        <div className="space-y-2">
          {navigationItems.map((item) => (
            <div key={item.href}>
              <a
                href={item.href}
                className="text-muted-foreground hover:text-foreground block text-sm"
              >
                {item.title}
              </a>
              {item.children && (
                <div className="mt-2 ml-4 space-y-2">
                  {item.children.map((child) => (
                    <a
                      key={child.href}
                      href={child.href}
                      className="text-muted-foreground hover:text-foreground block text-sm"
                    >
                      {child.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function SupportSidebar() {
    return (
      <Sidebar className="to-secondary w-64 bg-gradient-to-b from-white dark:from-black">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                <div className="mt-2 mb-1 ml-2 font-semibold">
                  {t("navigation.getGenderSupport")}
                </div>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {item.children ? (
                      <Collapsible defaultOpen className="group/collapsible">
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="w-full justify-between">
                            <a href={item.href} className="flex-1">
                              {item.title}
                            </a>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="mt-2 gap-2">
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton asChild>
                                  <a href={child.href}>{child.title}</a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton asChild>
                        <a href={item.href}>{item.title}</a>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-full w-full">
        <div className="hidden lg:block">
          <SupportSidebar />
        </div>
        <main className="w-full flex-1">
          <div className="prose dark:prose-invert w-full pb-16 lg:pt-8">
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <MobileJumpToSection />

            <h2 id="online-support-groups">
              {t("sections.onlineSupport.title")}
            </h2>
            <p>{t("sections.onlineSupport.description")}</p>

            <ul>
              <li>
                <a
                  href="https://www.reddit.com/r/detrans/"
                  target="_blank"
                  className="underline"
                >
                  {t("sections.onlineSupport.links.redditCommunity")} {"->"}
                </a>
              </li>
              <li>
                <a
                  href="https://www.reddit.com/r/detrans/wiki/support/"
                  target="_blank"
                  className="underline"
                >
                  {t("sections.onlineSupport.links.redditWiki")} {"->"}
                </a>
              </li>
              <li>
                <a
                  href="https://discord.com/invite/SXgyJ3BKZQ"
                  target="_blank"
                  className="underline"
                >
                  {t("sections.onlineSupport.links.discordServer")} {"->"}
                </a>
              </li>
              <li>
                <a
                  href="https://detrans.ai"
                  target="_blank"
                  className="underline"
                >
                  {t("sections.onlineSupport.links.askDetransAI")} {"->"}
                </a>
              </li>
            </ul>

            <h2 id="gender-affirming-care">
              {t("sections.genderAffirmingCare.title")}
            </h2>
            <p>
              {t("sections.genderAffirmingCare.description")}{" "}
              <Link prefetch={false} href="/videos" className="underline">
                {t("sections.genderAffirmingCare.watchTestimonies")}
              </Link>{" "}
              from people who have been down this path before going down it
              yourself.
            </p>

            <h2 id="gender-exploratory-therapy">
              {t("sections.genderExploratoryTherapy.title")}
            </h2>

            <p>{t("sections.genderExploratoryTherapy.description1")}</p>
            <p>{t("sections.genderExploratoryTherapy.description2")}</p>

            <div className="overflow-x-auto">
              <table className="min-w-[600px]">
                <thead>
                  <tr>
                    <th>{t("table.gayConversion")}</th>
                    <th>{t("table.genderExploratory")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>{t("table.goal")}</strong>:{" "}
                      <em>{t("table.goalConversion")}</em>
                      <sup>1</sup>
                    </td>
                    <td>
                      <strong>{t("table.goal")}</strong>:{" "}
                      <em>{t("table.goalExploratory")}</em>
                      <sup>2</sup>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>{t("table.method")}</strong>:{" "}
                      {t("table.methodConversion")}
                      <sup>1</sup>
                    </td>
                    <td>
                      <strong>{t("table.method")}</strong>:{" "}
                      {t("table.methodExploratory")}
                      <sup>3</sup>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>{t("table.evidence")}</strong>:{" "}
                      {t("table.evidenceConversion")}
                    </td>
                    <td>
                      <strong>{t("table.evidence")}</strong>:{" "}
                      {t("table.evidenceExploratory")}
                      <sup>2,5</sup>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>{t("table.ethics")}</strong>:{" "}
                      {t("table.ethicsConversion")}
                      <sup>1</sup>
                    </td>
                    <td>
                      <strong>{t("table.ethics")}</strong>:{" "}
                      {t("table.ethicsExploratory")}
                      <sup>3</sup>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <details className="cursor-pointer">
              <summary>
                <i>
                  {" "}
                  {t("sections.genderExploratoryTherapy.references.title")}
                </i>
              </summary>
              <div className="mt-2 mb-8 rounded-lg border p-2 !text-sm sm:p-3">
                <h4 className="mt-0">
                  {t("sections.genderExploratoryTherapy.references.title")}
                </h4>
                <ol className="mb-0">
                  <li>
                    {t("sections.genderExploratoryTherapy.references.ref1")}
                  </li>
                  <li>
                    {t("sections.genderExploratoryTherapy.references.ref2")}
                  </li>
                  <li>
                    {t("sections.genderExploratoryTherapy.references.ref3")}
                  </li>
                  <li>
                    {t("sections.genderExploratoryTherapy.references.ref4")}
                  </li>
                </ol>
              </div>
            </details>

            <p>
              {t(
                "sections.genderExploratoryTherapy.florenceAshley.description",
              )}
              <details className="mt-4 cursor-pointer">
                <summary>
                  <i>
                    {t(
                      "sections.genderExploratoryTherapy.florenceAshley.showFallacies",
                    )}
                  </i>
                </summary>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("fallacies.name")}</th>
                        <th>{t("fallacies.explanation")}</th>
                        <th>{t("fallacies.example")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Straw-Man</td>
                        <td>
                          Attacks an exaggerated or distorted version of the
                          other side, not what they actually say.
                        </td>
                        <td>
                          Claims GET "discourages all affirmation" and "assumes
                          trans identities are pathological", while GET
                          proponents say they allow transition and don't presume
                          pathology.
                        </td>
                      </tr>
                      <tr>
                        <td>Hasty Generalisation</td>
                        <td>
                          Uses one or two stories to claim "this always happens
                          to everyone."
                        </td>
                        <td>
                          Cites Keira Bell's single court case to argue that
                          questioning gender identity always backfires and
                          forecloses exploration for every youth.
                        </td>
                      </tr>
                      <tr>
                        <td>False Analogy</td>
                        <td>
                          Says "A looks a bit like B, so A must be as bad as B"
                          even when the important parts are different.
                        </td>
                        <td>
                          Because GET talks about "exploring causes" like old
                          conversion therapy did, the paper concludes GET is
                          ethically the same as anti-gay conversion practices.
                        </td>
                      </tr>
                      <tr>
                        <td>Begging the Question</td>
                        <td>
                          Assumes the very thing you're trying to prove, going
                          round in a circle.
                        </td>
                        <td>
                          "Being trans is not pathological, therefore any
                          therapy that looks for pathology is unethical" —
                          assumes pathology can't exist instead of proving it.
                        </td>
                      </tr>
                      <tr>
                        <td>Appeal to Ignorance</td>
                        <td>
                          "We don't have proof it's true, so it must be false"
                          (or the other way round).
                        </td>
                        <td>
                          "There is no compelling evidence that trans identities
                          are maladaptive, so they never are" — treats lack of
                          proof as disproof.
                        </td>
                      </tr>
                      <tr>
                        <td>False Dichotomy</td>
                        <td>
                          Claims there are only two choices—black or white—when
                          other middle options exist.
                        </td>
                        <td>
                          Frames the choice as either "full, immediate
                          affirmation" or "coercive conversion-like
                          exploration", ignoring parallel/supportive exploration
                          plus reversible medical steps.
                        </td>
                      </tr>
                      <tr>
                        <td>Ad Hominem / Genetic</td>
                        <td>
                          Attacks the person or their motives instead of dealing
                          with their actual argument.
                        </td>
                        <td>
                          Calls GET advocates "the intellectual arm of political
                          movements" seeking to criminalise gender-affirming
                          care, instead of refuting their clinical claims.
                        </td>
                      </tr>
                      <tr>
                        <td>Slippery Slope</td>
                        <td>
                          "If we allow X, then terrible Y and Z will surely
                          follow" without showing the chain will happen.
                        </td>
                        <td>
                          "Questioning a client's narrative will undermine
                          trust, forcing them to lie and rush into medical
                          steps" — no data given that this routinely occurs.
                        </td>
                      </tr>
                      <tr>
                        <td>Quantifier Shift</td>
                        <td>
                          Jumps from "many" or "most" to "all," erasing
                          exceptions.
                        </td>
                        <td>
                          "Most youth want affirmation, therefore exploration
                          disrespects EVERY client's agenda" — ignores the
                          minority who ask for deeper exploration.
                        </td>
                      </tr>
                      <tr>
                        <td>Confirmation Bias</td>
                        <td>
                          Cites only the evidence that supports your view and
                          ignores the rest.
                        </td>
                        <td>
                          Bibliography lists no studies showing neutral or
                          positive outcomes of GET; only critical or
                          affirmative-therapy papers are cited.
                        </td>
                      </tr>
                      <tr>
                        <td>Category Error</td>
                        <td>
                          Mixes up two different kinds of things (e.g., a tool
                          with a moral stance).
                        </td>
                        <td>
                          "Neutrality, much like the cake, is a lie" — treats
                          clinical technique of neutrality as moral
                          indifference, which are separate concepts.
                        </td>
                      </tr>
                      <tr>
                        <td>Misused Statistics</td>
                        <td>
                          Uses true numbers to push a claim the numbers don't
                          actually support.
                        </td>
                        <td>
                          Cites low detransition rate (≈3 %) to argue
                          exploratory screening is unnecessary; low base-rate
                          doesn't prove screening can't prevent individual harm.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </p>

            <h2 id="find-a-therapist">{t("sections.findTherapist.title")}</h2>

            {!isEnglish && (
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="m-0 pt-0 text-sm text-blue-800 dark:text-blue-200">
                    {t("sections.findTherapist.languageNotice")}{" "}
                    <Link href="/contact" className="font-medium underline">
                      {t("sections.findTherapist.contactForm")}
                    </Link>
                    .
                  </div>
                </div>
              </div>
            )}

            <a
              href="https://just-therapy.org/members/"
              target="_blank"
              className="underline"
            >
              <h3 id="just-therapy">
                <b>
                  {t("sections.findTherapist.organizations.justTherapy.name")}
                </b>
              </h3>
            </a>

            <p>
              {t(
                "sections.findTherapist.organizations.justTherapy.description",
              )}
            </p>

            <p>
              <a
                href="https://just-therapy.org/members/"
                target="_blank"
                className="underline"
              >
                <b>
                  {t(
                    "sections.findTherapist.organizations.justTherapy.directory",
                  )}{" "}
                  {"->"}
                </b>
              </a>
            </p>
            <p>
              <a
                href="https://just-therapy.org/"
                target="_blank"
                className="underline"
              >
                <b>
                  {t(
                    "sections.findTherapist.organizations.justTherapy.codeOfConduct",
                  )}{" "}
                  {"->"}
                </b>
              </a>
            </p>
            <div className="border-t" />

            <a
              href="https://www.therapyfirst.org/find/"
              target="_blank"
              className="underline"
            >
              <h3 id="therapy-first">
                <b>
                  {t("sections.findTherapist.organizations.therapyFirst.name")}
                </b>
              </h3>
            </a>

            <p>
              {t(
                "sections.findTherapist.organizations.therapyFirst.description",
              )}
            </p>

            <p>
              <a
                href="https://www.therapyfirst.org/find/"
                target="_blank"
                className="underline"
              >
                <b>
                  {t(
                    "sections.findTherapist.organizations.therapyFirst.directory",
                  )}{" "}
                  {"->"}
                </b>
              </a>
            </p>
            <p>
              <a
                href="https://www.therapyfirst.org/about/"
                target="_blank"
                className="underline"
              >
                <b>
                  {t("sections.findTherapist.organizations.therapyFirst.about")}{" "}
                  {"->"}
                </b>
              </a>
            </p>
            <div className="border-t" />

            <a
              href="https://beyondtrans.org/therapist-directory/"
              target="_blank"
              className="underline"
            >
              <h3 id="beyond-trans">
                <b>
                  {t("sections.findTherapist.organizations.beyondTrans.name")}
                </b>
              </h3>
            </a>
            <p>
              {t(
                "sections.findTherapist.organizations.beyondTrans.description",
              )}
            </p>
            <p>
              <a
                href="https://beyondtrans.org/therapist-directory/"
                target="_blank"
                className="underline"
              >
                <b>
                  {t(
                    "sections.findTherapist.organizations.beyondTrans.directory",
                  )}{" "}
                  {"->"}
                </b>
              </a>
            </p>
            <p>
              <a
                href="https://beyondtrans.org/facilitated-support-groups/"
                target="_blank"
                className="underline"
              >
                <b>
                  {t(
                    "sections.findTherapist.organizations.beyondTrans.supportGroups",
                  )}{" "}
                  {"->"}
                </b>
              </a>
            </p>
            <p>
              <a
                href="https://beyondtrans.org/about-us/"
                target="_blank"
                className="underline"
              >
                <b>
                  {t("sections.findTherapist.organizations.beyondTrans.about")}{" "}
                  {"->"}
                </b>
              </a>
            </p>
            <div className="border-t" />

            <a
              href="https://www.detransfoundation.com/"
              target="_blank"
              className="underline"
            >
              <h3 id="detrans-foundation">
                <b>
                  {t(
                    "sections.findTherapist.organizations.detransFoundation.name",
                  )}
                </b>
              </h3>
            </a>
            <p>
              {t(
                "sections.findTherapist.organizations.detransFoundation.description",
              )}
            </p>
            <p>
              <a
                href="https://www.detransfoundation.com/dr-kirsty-entwistle.html"
                target="_blank"
                className="underline"
              >
                Dr. Kirsty Entwistle
              </a>{" "}
              {t(
                "sections.findTherapist.organizations.detransFoundation.drEntwistle",
              )}
            </p>

            <p>
              <a
                href="https://www.detransfoundation.com/anastassis-spilliadis.html"
                target="_blank"
                className="underline"
              >
                Anastassis Spiliadis
              </a>{" "}
              {t(
                "sections.findTherapist.organizations.detransFoundation.anastassisSpiliadis",
              )}
            </p>
            <p>
              <a
                href="https://www.detransfoundation.com"
                target="_blank"
                className="underline"
              >
                <b>
                  {t(
                    "sections.findTherapist.organizations.detransFoundation.visitWebsite",
                  )}{" "}
                  {"->"}
                </b>
              </a>
            </p>

            <h2 id="for-parents">{t("sections.forParents.title")}</h2>
            <p>{t("sections.forParents.intro")}</p>

            <a
              href="https://roqdrepair.com"
              target="_blank"
              className="underline"
            >
              <h3 id="roqd-repair">
                <b>{t("sections.forParents.rogdRepair.name")}</b>
              </h3>
            </a>

            <p>
              <strong>{t("sections.forParents.rogdRepair.whatIs")}</strong>
            </p>
            <p>{t("sections.forParents.rogdRepair.description1")}</p>
            <ul>
              <li>{t("sections.forParents.rogdRepair.bullet1")}</li>
              <li>{t("sections.forParents.rogdRepair.bullet2")}</li>
              <li>{t("sections.forParents.rogdRepair.bullet3")}</li>
            </ul>

            <p>{t("sections.forParents.rogdRepair.description2")}</p>

            <div className="bg-muted/30 my-6 rounded-lg border p-4">
              <h4 className="mt-0">
                {t("sections.forParents.rogdRepair.ctaBox.title")}
              </h4>
              <p>{t("sections.forParents.rogdRepair.ctaBox.description1")}</p>
              <p>{t("sections.forParents.rogdRepair.ctaBox.description2")}</p>
              <p>{t("sections.forParents.rogdRepair.ctaBox.description3")}</p>
            </div>

            <a
              href="https://course.rogdrepair.com/p/rogd-repair?affcode=2068800_ck1ajvgj"
              target="_blank"
              className="no-underline"
            >
              <div className="no-prose mb-8 rounded-lg border border-green-300 bg-green-50 p-6 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center">
                  <div className="flex-1">
                    <p className="mt-0 mb-0">
                      {t("sections.forParents.rogdRepair.coupon")}{" "}
                      <strong className="text-green-800 dark:text-green-300">
                        50% off your first month
                      </strong>{" "}
                      of ROGD Repair membership.
                    </p>
                  </div>

                  <div className="w-full lg:w-auto">
                    <div className="rounded-lg border-2 border-green-400 bg-white p-4 text-center dark:bg-green-950/30">
                      <div className="block text-3xl font-bold tracking-wider text-green-800 dark:text-green-200">
                        DETRANSAI
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>

            <p>
              <a
                href="https://course.rogdrepair.com/p/rogd-repair?affcode=2068800_ck1ajvgj"
                target="_blank"
                className="underline"
              >
                <b>
                  {t("sections.forParents.rogdRepair.learnMore")} {"->"}
                </b>
              </a>
            </p>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
