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
        While I recognise that gender affirming care can provide some level of
        relief for gender-distressed people, I disagree with how it is the first
        and only treatment option available in most Western countries, and I am
        shocked at how difficult it seems to be to find non-affirming therapists
        attempt to get to the root of why one might feel like they're in the
        wrong body. I strongly disagree that a lifetime of hormones and chopping
        off perfectly good body parts is a desirable outcome when gender
        dysphoria is obviously a psychological issue.
      </p>
      <p>
        I think that people who currently identify as transgender have too much
        influence over how people who are experiencing gender dysphoria are
        treated, and I see clearly how cancel culture has permeated every level
        of society and how online echo chambers are affecting the information
        that people are receiving. I believe that gender ideology is harmful to
        society because it reinforces sexist stereotypes and roles, for example
        if a kid in school who does not display stereotypically masculine or
        feminine behaviours they may be seen as a 'trans kid' instead of just a
        gender non-confirming boy or girl, and pushed into the medical pipeline.
        Gender ideology is oppressive and directly at-odds with the original
        goals of feminism, but people who can think for themselves and point
        this out are now labeled as radicalists. A good thought experiment is to
        consider non-binary identities, and why those exist today. If you're
        lazy,{" "}
        <a
          href={
            "https://detrans.ai/chat/how-does-gender-ideology-create-non-binary-identities"
          }
        >
          you can just ask detrans.ai
        </a>
        .
      </p>
      <p>
        The existence of detrans people and their stories is proof that gender
        (a social construct of roles and stereotypes) is not an innate thing
        within us. However trans communities are often toxic and cult like. If
        believers sense any sign of dissident, they will threaten to 'cancel'
        you and cut you off from your friends by labelling you as either a{" "}
        <i>'transphobe'</i>, <i>'never a real trans person'</i> or{" "}
        <i>'in denial, back in the closet'</i>, because it goes against their
        narrative that people are born this way. Those who identify as lesbian,
        gay or heterosexual often stigmatise bisexual people in a similar way -
        this is called bi-erasure. These are just coping mechanisms, really.{" "}
        <i>“Death before detransition”</i>, the cult chants. Society is in an
        abusive relationship with trans identities.
      </p>
      <a
        href={
          "      https://statsforgender.org/trans-identities-are-more-strongly-associated-with-perpetration-of-bullying-than-subjection-to-bullying/"
        }
      >
        <i>
          See also: Trans identities are more strongly associated with
          perpetration of bullying than subjection to bullying.
          (statsforgender.org)
        </i>
      </a>
      <p>
        Instead of promoting lifetime medicalisation of people's bodies so that
        they better fit societies gendered expectations, I believe that gender
        exploratory therapy and listening to detrans perspectives should be the
        first line of treatment for people who are experiencing gender
        dysphoria. Gender is a social construct that can be deconstructed.
        Through detrans perspectives we can hear the truth behind what caused
        people to transition and also understand the realisations they had which
        led them to detransition.
      </p>
      <p>
        I think that we can do better for people who are experiencing gender
        dysphoria and I genuinely believe that one day we are going to look back
        at gender affirming care the same way we look at how we used to give
        people lobotomies today. Please take your time to explore the site and
        to open your mind to the other side of this topic.
      </p>
      <p>
        If you would like to see myths and about gender exploratory therapy
        debunked, please see the <Link href={"/support"}>support page</Link>.
      </p>
      <p>If this triggers you, good riddance!</p>
      <p>And don't fucking label me right wing.</p>
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
