import Link from "next/link";

export default async function AboutPage() {
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1 className="">About</h1>
      <p>
        Today, Tuesday the 23rd of September 2025, I am launching my latest
        project.
      </p>
      <p>
        While I recognise that gender affirming care can provide relief for
        gender-distressed people, I disagree with how it is the first and only
        treatment option available in most Western countries, and I am shocked
        at how difficult it seems to be to find non-affirming therapists attempt
        to get to the root of why one might feel like they're in the wrong body.
        This is because it has become taboo to question someone's gender
        identity, as the belief that people can be born in the wrong body has
        pervaded society. I don't agree that encouraging everyone to go down a
        path of taking hormones for life and chopping off perfectly good body
        parts is rational when for many people (as detrans experiences show us)
        gender dysphoria is indeed a psychological issue.
      </p>
      <p>
        I am concerned about the recent surge in people being diagnosed with
        gender dysphoria. I really do think people are being influenced to adopt
        trans identity and transition. Ultimately I believe that gender ideology
        is harmful to society because it reinforces sexist stereotypes and
        roles, for example if a kid in school who does not display
        stereotypically masculine or feminine behaviours they may be seen as a
        'trans kid' instead of just a gender non-confirming boy or girl, and
        pushed into the medical pipeline. Gender ideology is oppressive and
        directly at-odds with the original goals of feminism, but people who can
        think for themselves and point this out are now labeled as radicalists.
        A good thought experiment is to consider non-binary identities, and why
        those exist today. If you're lazy,{" "}
        <a
          href={
            "https://detrans.ai/research/how-does-gender-ideology-create-non-binary-identities"
          }
        >
          you can just ask detrans.ai
        </a>
        .
      </p>
      <p>
        I see how cancel culture has permeated every level of society and how
        online echo chambers are affecting the information that people are
        receiving. Detransitioners say that trans communities can be cult like.
        If believers sense any sign of dissident, they will threaten to 'cancel'
        you and cut you off from your friends by labelling you as either a{" "}
        <i>'transphobe'</i>, <i>'never a real trans person'</i> or{" "}
        <i>'in denial, back in the closet'</i>, because it goes against their
        narrative that people are born this way. These are just coping
        mechanisms, really. <i>“Death before detransition”</i>, the cult chants.
        Society is in an abusive relationship with trans identities.
      </p>
      <div className="rounded border p-2 text-sm italic opacity-80">
        Many people who identified as gay or straight at one point come to a
        realisation that sexuality is not as black and white as society once
        told them it is. Those who identify as heterosexual, lesbian or gay
        often stigmatise bisexual people in a similar way - this is called
        bi-erasure.
      </div>
      <div className="mt-2 rounded border p-2 text-sm italic opacity-80">
        See also:{" "}
        <a
          href={
            "      https://statsforgender.org/trans-identities-are-more-strongly-associated-with-perpetration-of-bullying-than-subjection-to-bullying/"
          }
        >
          <i>
            {"->"} Trans identities are more strongly associated with
            perpetration of bullying than subjection to bullying.
            (statsforgender.org)
          </i>
        </a>
      </div>

      <p></p>
      <p>
        I think that we can do better for people who are experiencing gender
        dysphoria. Instead of promoting lifetime medicalisation of people's
        bodies so that they better fit societies gendered expectations, I
        believe that through detrans perspectives we can understand what causes
        some people to want to transition and understand the realisations they
        had which led them to detransition. Understanding these motives and the
        reasons behind why they might feel a certain way may help some people
        heal naturally. I think that one day we might look back at gender
        affirming care the same way we look at how we used to give people
        lobotomies today. Please take your time to explore the site and to open
        your mind to the other side of this topic.
      </p>
      <p>
        If you would like to see myths and about gender exploratory therapy
        debunked, please see the <Link href={"/support"}>support page</Link>.
      </p>
      <p>Don't fucking label me right wing.</p>
      <p>- Peter James Steven</p>
      <p className="py-8">
        <i className="opacity-70">
          Read a <a href="https://bitbout.me">bitbout.me</a>.
        </i>
      </p>

      <iframe
        data-testid="embed-iframe"
        className="border-lg overflow-hidden"
        src="https://open.spotify.com/embed/playlist/1BvZ9JvMbay9aCfXYvNgSX?utm_source=generator"
        width="100%"
        height="500"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      ></iframe>
    </div>
  );
}
