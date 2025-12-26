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
import { ChevronRight } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

function MobileJumpToSection() {
  return (
    <div className="prose-none bg-muted/50 mb-8 rounded-lg border p-4 lg:hidden">
      <h3 className="mt-0 mb-3 text-sm font-semibold">Jump to:</h3>
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

const navigationItems = [
  {
    title: "Online Support Groups",
    href: "#online-support-groups",
  },
  {
    title: "Gender Affirming Care",
    href: "#gender-affirming-care",
  },
  {
    title: "Gender Exploratory Therapy",
    href: "#gender-exploratory-therapy",
    children: [
      {
        title: "Just Therapy",
        href: "#just-therapy",
      },
      {
        title: "Therapy First",
        href: "#therapy-first",
      },
      {
        title: "Beyond Trans",
        href: "#beyond-trans",
      },
      {
        title: "The Detrans Foundation",
        href: "#detrans-foundation",
      },
    ],
  },
  {
    title: "For Parents",
    href: "#for-parents",
    children: [
      {
        title: "ROGD Repair Program",
        href: "#roqd-repair",
      },
    ],
  },
];

function SupportSidebar() {
  return (
    <Sidebar className="to-secondary w-64 bg-gradient-to-b from-white dark:from-black">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              <div className="mt-2 mb-1 ml-2 font-semibold">
                Get Gender Support:
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

const metadata: Metadata = {
  title: "detrans.ai | Get Gender Help and Support",
  description:
    "Learn the difference between Gender Affirmming Care and Gender Exploratory Therapy. If you are experiencing gender dysphoria, one of the best ways to get support for is to talk to and understand the perspectives of people who have been there themselves and come out the other side.",
  openGraph: {
    title: "detrans.ai | Get Gender Help and Support",
    description:
      "Learn the difference between Gender Affirmming Care and Gender Exploratory Therapy. If you are experiencing gender dysphoria, one of the best ways to get support for is to talk to and understand the perspectives of people who have been there themselves and come out the other side.",
    url: "https://detrans.ai/support",
    siteName: "detrans.ai",
    images: ["https://detrans.ai/x_card_lg.png"],
    locale: "en_US",
    type: "website",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return metadata;
}

export default async function SupportPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-full w-full">
        <div className="hidden lg:block">
          <SupportSidebar />
        </div>
        <main className="w-full flex-1">
          <div className="prose dark:prose-invert w-full pb-16 lg:pt-8">
            <h1 className="text-3xl font-bold">Get Gender Help & Support</h1>
            <MobileJumpToSection />
            <h2 id="online-support-groups">Online Support groups:</h2>
            <p>
              If you are experiencing gender dysphoria, one of the best ways to
              get support for is to talk to and understand the perspectives of
              people who have been there themselves and come out the other side.
            </p>
            <ul>
              <li>
                <a
                  href="https://www.reddit.com/r/detrans/"
                  target="_blank"
                  className="underline"
                >
                  Detrans Community on Reddit {"->"}
                </a>
              </li>
              <li>
                <a
                  href="https://www.reddit.com/r/detrans/wiki/support/"
                  target="_blank"
                  className="underline"
                >
                  Detrans Wiki on Reddit {"->"}
                </a>
              </li>
              <li>
                <a
                  href="https://discord.com/invite/SXgyJ3BKZQ"
                  target="_blank"
                  className="underline"
                >
                  Official /r/detrans Discord Server {"->"}
                </a>
              </li>
              <li>
                <a
                  href="https://detrans.ai"
                  target="_blank"
                  className="underline"
                >
                  Ask 50,0000+ detrans people with detrans.ai {"->"}
                </a>
              </li>
            </ul>
            <h2 id="gender-affirming-care">
              Gender Affirming Care: <br className="sm:hidden" />
              What is it?
            </h2>
            <p>
              Gender affirming care is currently the standard (and often the
              only) treatment option for gender dysphoria offered by healthcare
              providers in the Western world. Gender affirming care essentially
              recognises societies gendered expectations and then adapts the
              patient to them. It is a staged approach that begins with social
              transition (name, pronouns, clothing), then hormone therapy, and
              then for some, irreversible surgical procedures. Gender affirming
              care can provide relief for gender dysphoria but it does come with
              serious health risks and often permanent side-effects. Proceed
              with extreme caution, and make sure you{" "}
              <Link prefetch={false} href={"/videos"} className="underline">
                watch some testimonies
              </Link>{" "}
              from people who have been down this path before going down it
              yourself.
            </p>
            <h2 id="gender-exploratory-therapy">
              Gender Exploratory Therapy: What is it?
            </h2>

            <p>
              Gender Exploratory Therapy simply means that your therapist
              doesn't rush to affirm and medicalise you. Instead they will start
              by exploring concepts of gender and why you might feel this way.
              Gender Exploratory Therapy is an approach without a specific,
              predetermined agenda, and the outcomes of gender exploratory
              therapy can vary depending on each individual person.
            </p>
            <p>
              If you Google "Gender Exploratory Therapy", you will find some
              critiques which compare it to gay conversion therapy (which is
              proven to be ineffective). The truth is that Gender Exploratory
              Therapy is very different from gay conversion therapy:
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-[600px]">
                <thead>
                  <tr>
                    <th>Gay-conversion therapy</th>
                    <th>Gender-exploratory therapy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Goal</strong>: <em>Change</em> sexual orientation
                      because it is viewed as pathological.
                      <sup>1</sup>
                    </td>
                    <td>
                      <strong>Goal</strong>: <em>Understand</em> the meaning of
                      the dysphoria; outcome can be transition, no transition,
                      or partial social transition.<sup>2</sup>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Method</strong>: Shame, aversion, behavioural
                      conditioning, prayer.<sup>1</sup>
                    </td>
                    <td>
                      <strong>Method</strong>: GET is compatible with a wide
                      range of therapeutic modalities, such as standard
                      psychodynamic or humanistic techniques—open questions,
                      curiosity, no pre-set end-points.
                      <sup>3</sup>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Evidence base</strong>: Consistently shows harm;
                      every major medical body condemns it.
                    </td>
                    <td>
                      <strong>Evidence base</strong>: No RCTs yet, but parallels
                      to therapies that reduce anxiety, depression, self-harm;
                      no data showing systematic harm.<sup>2,5</sup>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Ethics</strong>: Violates autonomy by pushing
                      heterosexual identity as the only right option.
                      <sup>1</sup>
                    </td>
                    <td>
                      <strong>Ethics</strong>: Seeks to <em>expand</em> autonomy
                      by ensuring the adolescent (and family) understand all
                      options before irreversible steps.<sup>3</sup>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <details className="cursor-pointer">
              <summary>
                <i> Show References</i>
              </summary>
              <div className="mt-2 mb-8 rounded-lg border p-2 !text-sm sm:p-3">
                <h4 className="mt-0">References</h4>
                <ol className="mb-0">
                  <li>
                    U.S. Dept. of Health & Human Services (2025).{" "}
                    <em>
                      Report on Pediatric Gender Dysphoria and Gender Conversion
                      Efforts
                    </em>
                    .
                  </li>
                  <li>
                    D’Angelo, R. (2025). “Supporting autonomy in young people
                    with gender dysphoria: psychotherapy is not conversion
                    therapy.” <em>Journal of Medical Ethics</em>, 51(1).
                  </li>
                  <li>
                    Lemma, A. & Schmidt, L. (2024). “Psychodynamic Psychotherapy
                    for Gender Dysphoria is not Conversion Therapy.”{" "}
                    <em>Frontiers in Psychology</em>.
                  </li>
                  <li>
                    Korte, A. et al. (2021). “One Size Does Not Fit All: In
                    Support of Psychotherapy for Gender Dysphoria.”{" "}
                    <em>Archives of Sexual Behavior</em>.
                  </li>
                </ol>
              </div>
            </details>
            <p>
              Academic research in this field is often biased. One of the most
              influential studies (
              <a
                href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10018052/"
                target="_blank"
                className="underline"
              >
                Interrogating Gender-Exploratory Therapy
              </a>
              ) was published in 2022 by Florence Ashley, a{" "}
              <a
                href="https://en.wikipedia.org/wiki/Florence_Ashley"
                target="_blank"
                className="underline"
              >
                trans woman
              </a>
              . In her study she compared Gender Exploratory Therapy to gay
              conversion therapy and strongly condemns the practice. It should
              be recognised that people who identify as trans are motivated to
              protect their identity and beliefs, and this study is a perfect
              example of this. The study is full of logical fallacies, yet it
              was still published and is used as academic justification for
              gender-affirming care to be the only option for people who
              experience gender dysphoria.
              <details className="mt-4 cursor-pointer">
                <summary>
                  <i>
                    {" "}
                    See all of the logical fallacies in Florence Ashley's study
                  </i>
                </summary>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Fallacy Name</th>
                        <th>Simple Explanation</th>
                        <th>Example from the Paper</th>
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
                          Claims GET “discourages all affirmation” and “assumes
                          trans identities are pathological”, while GET
                          proponents say they allow transition and don’t presume
                          pathology.
                        </td>
                      </tr>
                      <tr>
                        <td>Hasty Generalisation</td>
                        <td>
                          Uses one or two stories to claim “this always happens
                          to everyone.”
                        </td>
                        <td>
                          Cites Keira Bell’s single court case to argue that
                          questioning gender identity always backfires and
                          forecloses exploration for every youth.
                        </td>
                      </tr>
                      <tr>
                        <td>False Analogy</td>
                        <td>
                          Says “A looks a bit like B, so A must be as bad as B”
                          even when the important parts are different.
                        </td>
                        <td>
                          Because GET talks about “exploring causes” like old
                          conversion therapy did, the paper concludes GET is
                          ethically the same as anti-gay conversion practices.
                        </td>
                      </tr>
                      <tr>
                        <td>Begging the Question</td>
                        <td>
                          Assumes the very thing you’re trying to prove, going
                          round in a circle.
                        </td>
                        <td>
                          “Being trans is not pathological, therefore any
                          therapy that looks for pathology is unethical” —
                          assumes pathology can’t exist instead of proving it.
                        </td>
                      </tr>
                      <tr>
                        <td>Appeal to Ignorance</td>
                        <td>
                          “We don’t have proof it’s true, so it must be false”
                          (or the other way round).
                        </td>
                        <td>
                          “There is no compelling evidence that trans identities
                          are maladaptive, so they never are” — treats lack of
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
                          Frames the choice as either “full, immediate
                          affirmation” or “coercive conversion-like
                          exploration”, ignoring parallel/supportive exploration
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
                          Calls GET advocates “the intellectual arm of political
                          movements” seeking to criminalise gender-affirming
                          care, instead of refuting their clinical claims.
                        </td>
                      </tr>
                      <tr>
                        <td>Slippery Slope</td>
                        <td>
                          “If we allow X, then terrible Y and Z will surely
                          follow” without showing the chain will happen.
                        </td>
                        <td>
                          “Questioning a client’s narrative will undermine
                          trust, forcing them to lie and rush into medical
                          steps” — no data given that this routinely occurs.
                        </td>
                      </tr>
                      <tr>
                        <td>Quantifier Shift</td>
                        <td>
                          Jumps from “many” or “most” to “all,” erasing
                          exceptions.
                        </td>
                        <td>
                          “Most youth want affirmation, therefore exploration
                          disrespects EVERY client’s agenda” — ignores the
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
                          “Neutrality, much like the cake, is a lie” — treats
                          clinical technique of neutrality as moral
                          indifference, which are separate concepts.
                        </td>
                      </tr>
                      <tr>
                        <td>Misused Statistics</td>
                        <td>
                          Uses true numbers to push a claim the numbers don’t
                          actually support.
                        </td>
                        <td>
                          Cites low detransition rate (≈3 %) to argue
                          exploratory screening is unnecessary; low base-rate
                          doesn’t prove screening can’t prevent individual harm.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
              <p>
                The notion that Gender Exploratory Therapy is somehow evil and
                wrong is predicated on the theory that everyone has an innate
                and fixed gender identity, and that all trans-identified people
                were "born this way". There is no compelling evidence to support
                this belief, and it doesn't make sense when we consider that
                gender is a social construct made up of roles and stereotypes.
                The mere existence of detrans people and their stories also
                causes this theory to fall on its head. Proponents of this
                theory then fall back to saying that detrans people were never
                'real trans' people, but every single detrans person tells us
                that they were true believers and were fully "in it", until one
                day they weren't any more.
              </p>
              <p>
                Also noteworthy is the fact that scientists have yet to identify
                a biological basis for same-sex attraction, and many
                individuals’ understanding of their sexuality evolves over time,
                often finding that sexuality is not as black and white as
                society says it is. Bisexual individuals frequently encounter
                marginalization from who identify as lesbian, gay, or
                heterosexual, a phenomenon termed bi-erasure. This
                marginalization shares thematic similarities with experiences of
                detransitioning individuals.
              </p>
            </p>
            <h2>
              Where can I find a therapist who practices gender exploratory
              therapy?
            </h2>
            <a
              href="https://just-therapy.org/members/"
              target="_blank"
              className="underline"
            >
              <h3 id="just-therapy">
                <b>Just Therapy</b>
              </h3>
            </a>

            <p>
              Just Therapy is born out of a desire to go back to what therapy
              should be – effective, ethical, and free from ideology. It is an
              association of therapists and counsellors aligned by common ethics
              and principles. Just Therapy recognises that much of the world of
              psychotherapy and counselling has been taken over by activists and
              ideologies, which risk harming, rather than supporting, the mental
              wellbeing of clients. Its members, who come from a wide range of
              disciplines and specialities, have signed a Code of Conduct.
            </p>

            <p>
              <a
                href="https://just-therapy.org/members/"
                target="_blank"
                className="underline"
              >
                <b>Just Therapy Therapist Directory {"->"}</b>
              </a>
            </p>
            <p>
              <a
                href="https://just-therapy.org/"
                target="_blank"
                className="underline"
              >
                <b>Just Therapy Code Of Conduct {"->"}</b>
              </a>
            </p>
            <div className="border-t" />

            <a
              href="https://www.therapyfirst.org/find/"
              target="_blank"
              className="underline"
            >
              {" "}
              <h3 id="therapy-first">
                <b>Therapy First</b>
              </h3>
            </a>

            <p>
              Therapy First unites mental-health professionals who believe
              gender-distressed clients deserve open-ended, evidence-based
              psychotherapy that explores unconscious and contextual factors
              before any irreversible medical steps; they reject both conversion
              practices and the “affirm-only” model, uphold client autonomy, and
              view childhood/teen medical transition as experimental, while
              still supporting adults’ right to bodily autonomy and continued
              therapeutic exploration.
            </p>

            <p>
              <a
                href="https://www.therapyfirst.org/find/"
                target="_blank"
                className="underline"
              >
                <b>Therapy First Therapist Directory {"->"} </b>
              </a>
            </p>
            <p>
              <a
                href="https://www.therapyfirst.org/about/"
                target="_blank"
                className="underline"
              >
                <b>About Therapy First {"->"}</b>
              </a>
            </p>
            <div className="border-t" />
            <a
              href="https://beyondtrans.org/therapist-directory/"
              target="_blank"
              className="underline"
            >
              <h3 id="beyond-trans">
                <b>Beyond Trans</b>
              </h3>
            </a>
            <p>
              Stella O’Malley launched the Gender Dysphoria Support Network in
              March 2020 to give parents unbiased help with gender-distressed
              children; it quickly grew into a global community, spurring the
              2021 creation of Genspect, an advocate for non-medicalised care.
              Recognising rising transition regret, the group started Beyond
              Trans in 2022, and in June 2025 merged it with GDSN to form one
              integrated, evidence-based support network for families,
              individuals and detransitioners.
            </p>
            <p>
              <a
                href="https://beyondtrans.org/therapist-directory/"
                target="_blank"
                className="underline"
              >
                <b>Beyond Trans Therapist Directory {"->"}</b>
              </a>
            </p>
            <p>
              <a
                href="https://beyondtrans.org/facilitated-support-groups/"
                target="_blank"
                className="underline"
              >
                <b>Beyond Trans Support Groups {"->"}</b>
              </a>
            </p>
            <p>
              <a
                href="https://beyondtrans.org/about-us/"
                target="_blank"
                className="underline"
              >
                <b>About Beyond Trans {"->"}</b>
              </a>
            </p>
            <div className="border-t" />
            <a
              href="https://www.detransfoundation.com/"
              target="_blank"
              className="underline"
            >
              <h3 id="detrans-foundation">
                <b>The Detrans Foundation</b>
              </h3>
            </a>
            <p>
              The Detrans Foundation provides resources and support for
              detransitioners, including access to qualified therapists who
              understand detransition experiences. The following therapists are
              part of the Detrans foundation:
            </p>
            <p>
              <a
                href="https://www.detransfoundation.com/dr-kirsty-entwistle.html"
                target="_blank"
                className="underline"
              >
                Dr. Kirsty Entwistle
              </a>{" "}
              is a Clinical Psychologist who previously worked at the NHS gender
              identity development service for under 18s in Leeds. She is
              registered with the UK Health Care Professions Council (HCPC) and
              offers online consultations by secure videocall.
            </p>

            <p>
              <a
                href="https://www.detransfoundation.com/anastassis-spilliadis.html"
                target="_blank"
                className="underline"
              >
                Anastassis Spiliadis
              </a>{" "}
              is a Systemic & Family Psychotherapist who worked for four years
              at the Gender Identity Development Service at the Tavistock, where
              he led the Family Therapy & Consultation Service. He resigned the
              Tavistock as he disagreed with the lack of a therapeutic model in
              understanding gender identity difficulties. He developed the
              Gender Exploratory Model and has extensive experience working with
              gender-questioning individuals and detransitioners.
            </p>
            <p>
              <a
                href="https://www.detransfoundation.com"
                target="_blank"
                className="underline"
              >
                <b>Visit the Detrans Foundation website {"->"}</b>
              </a>
            </p>

            <h2 id="for-parents">For Parents</h2>
            <p>
              If your child has recently come out as transgender, you may be
              feeling confused, worried, and unsure how to best support them
              while also protecting their long-term health and well-being.
            </p>

            <a
              href="https://roqdrepair.com"
              target="_blank"
              className="underline"
            >
              <h3 id="roqd-repair">
                <b>Stephanie Winn's ROGD Repair Program</b>
              </h3>
            </a>

            <p>
              <strong>What is ROGD Repair?</strong>
            </p>
            <p>ROGD Repair is:</p>
            <ul>
              <li>
                A program that helps parents of trans-identified youth
                communicate in ways that promote desistance, critical thinking,
                health, and relational harmony
              </li>
              <li>
                An interactive and ever-expanding toolkit of psychology concepts
                and communication skills honed through years as a Licensed
                Marriage and Family Therapist turned ROGD parent coach
              </li>
              <li>
                A self-paced online course containing over 100 lessons, each
                containing a video, essay, and reflection questions designed to
                help participants personalize the content to their unique family
                situations, as well as discussion forums
              </li>
            </ul>

            <p>
              New ROGD Repair memberships now come with unlimited access to
              RepairBot, the first and only AI tool designed specifically to
              help non-affirming parents of gender-distressed youth. RepairBot
              is trained on the entire ROGD Repair curriculum and serves as an
              excellent sounding board, homework buddy, and communication tool
              helper!
            </p>

            <div className="bg-muted/30 my-6 rounded-lg border p-4">
              <h4 className="mt-0">
                Your kid says they're "trans" — but you just want them to be
                healthy and safe.
              </h4>
              <p>
                Your child's health and future are at stake, but your leverage
                and influence are limited. Perhaps they started black-market
                hormones behind your back, or storm out angrily when you
                "misgender" them, or are away at an "affirming" college. You
                need to communicate effectively in this tricky situation, before
                someone gets hurt. That's where ROGD Repair comes in.
              </p>
              <p>
                ROGD Repair is a self-paced online course and community for
                parents that teaches the psychology concepts and communication
                tools you need in order to understand your child's mental state
                and how to reach them. Membership now includes RepairBot, your
                24/7 AI assistant trained on the approach.
              </p>
              <p>
                ROGD Repair and RepairBot were created by a Licensed Marriage
                and Family Therapist with over a decade of experience working
                with trans-identified youth and their families, who now
                exclusively guides parents that know there must be a better path
                than "affirmation."
              </p>
            </div>

            <div className="no-prose mb-8 rounded-lg border border-green-300 bg-green-50 p-6 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <p className="mb-2 text-lg font-semibold text-green-800 dark:text-green-300">
                    Special Offer for detrans.ai Visitors
                  </p>
                  <p className="mb-0">
                    Use the coupon code below to get{" "}
                    <strong className="text-green-800 dark:text-green-300">
                      50% off your first month
                    </strong>{" "}
                    of ROGD Repair membership.
                  </p>
                </div>
                <div className="w-full lg:w-auto">
                  <div className="rounded-lg border-2 border-green-400 bg-white p-4 text-center dark:bg-green-950/30">
                    <div className="mb-1 text-sm font-medium text-green-700 dark:text-green-300">
                      Coupon Code
                    </div>
                    <code className="block text-3xl font-bold tracking-wider text-green-800 dark:text-green-200">
                      DETRANSAI
                    </code>
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                      50% off first month
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p>
              <a
                href="https://course.rogdrepair.com/p/rogd-repair?affcode=2068800_ck1ajvgj"
                target="_blank"
                className="underline"
              >
                <b>Learn more and sign up for ROGD Repair {"->"}</b>
              </a>
            </p>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
