"use server"
import { Metadata } from "next";

const metadata: Metadata = {
  title: "detrans.ai | Defining Gender Related Terms",
  description:
    "In every day speech sex and gender are sometimes used interchangeably and in some languages there is only one word to describe the two. However, the whole concept of gender dysphoria relies on understanding that there are differences between sex and gender.",
  openGraph: {
    title: "detrans.ai | Defining Gender Related Terms",
    description:
      "In every day speech sex and gender are sometimes used interchangeably and in some languages there is only one word to describe the two. However, the whole concept of gender dysphoria relies on understanding that there are differences between sex and gender.",
    url: "https://detrans.ai/definitions",
    siteName: "detrans.ai",
    images: ["https://detrans.ai/x_lg.png"],
    locale: "en_US",
    type: "website",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return metadata
}

export default async function DefinitionsPage() {
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1 className="text-3xl font-bold">Defining Gender Related Terms</h1>

      <h2>Sex and gender?</h2>
      <p>
        In every day speech sex and gender are sometimes used interchangeably
        and in some languages there is only one word to describe the two.
        However, the whole concept of gender dysphoria relies on understanding
        that there are differences between sex and gender.
      </p>

      <p>
        <b>Sex</b> refers to a person's biology (i.e. their anatomy; skeleton,
        musculature, chromosomes, reproductive system and secondary sex
        characteristics). Note that over 99% of people are biologically either
        male or female, there is no sex spectrum though some people do have
        disorders of sexual development (DSDs). The vast majority of people with
        DSDs are male or female.
      </p>

      <p>
        <b>Gender</b> refers to the 'socially constructed' roles, behaviours,
        activities, and attributes that a given society considers appropriate
        for men and women [as defined by their biological sex]. 'Masculine' and
        'feminine' are gender categories. Most, maybe all, people have a mix of
        masculine and feminine traits. Gender changes over time and between
        cultures.
      </p>

      <p>
        <b>Gender non-conformity</b> occurs when a person acts or presents
        differently from how their society expects them to, based on their sex.
      </p>

      <p>
        <b>Gender Identity</b> - some people believe that we all have an innate
        'gender identity' – a deep sense or awareness of ourselves as either
        male, female or somewhere in between – which exists separately to our
        biological sex and which can, on rare occasions, differ from it. Other
        people do not believe that a specific gender identity exists that is
        distinct from other any other aspect of a person's personality or
        identity.
      </p>

      <h2>What is gender dysphoria?</h2>
      <p>
        Gender dysphoria is a diagnostic term used by the psychiatric and
        medical community to describe the distress experienced when someone
        feels that their gender identity does not match their biological sex.
      </p>

      <p>
        People experiencing gender dysphoria report strong, persistent feelings
        of identification with a gender that differs from their sex, and
        associated discomfort with their sexed body. For a formal diagnosis to
        be made at present, the feelings have to cause significant distress or
        impairment to the person experiencing them.
      </p>

      <h2>What does it mean to be transgender?</h2>
      <p>
        Transgender is a term that can mean different things to different
        people. It is generally agreed that trans women are born with a male
        body but identify as female, trans men are born with a female body but
        identify as male, and non-binary people identify as neither male or
        female. People often use the shorter term 'trans,' to signify that
        someone identifies with a gender that is not the same as their
        biological sex.
      </p>

      <p>
        Transgender can be understood to mean that i) you are the sex/gender
        opposite to the sex you were born, ii) you believe yourself to be the
        sex/gender opposite to that which you were born, or iii) you are living
        as if your sex/gender is opposite to the sex which you were born.
        Debates about which of these three ways of understanding the term is the
        most accurate can be heated and controversial. Some people feel that
        even having a discussion about what it means to be transgender is
        undermining the validity of the experience. However, these different
        beliefs inevitably lead to different ideas for how best to support
        people to manage gender related distress so discussions are necessary to
        ensure that people get the best help and advice possible.
      </p>

      <h2>What is desistance?</h2>
      <p>
        Desistance is when someone who identified as transgender but didn't
        undertake medical interventions no longer identifies as transgender.
        Although they may not have to deal with the implications of having
        undertaken medical interventions people desistance can still be a very
        emotionally painful, confusing and difficult process.
      </p>

      <h2>Detransition and detransitioners</h2>
      <p>
        Detransition is when someone who identified as transgender and underwent
        medical interventions no longer identifies as transgender. There is an
        enormously wide variation in people's experiences within this group.
        Some people may be highly distressed by what they have been through and
        the long term implications, others may see it as something that they had
        to go through to understand themselves as they currently are.
      </p>

      <h2>Transition regret</h2>
      <p>
        Some people may have identified as transgender for many years and have
        undergone medical interventions such as hormones and surgeries that have
        changed their bodies irreversibly. They may feel that they regret
        initiating a medical gender transition but they also continue to
        identify as transgender and/or continue with cross sex hormones.
      </p>

      <hr />

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Source:{" "}
        <a
          href="https://www.detransfoundation.com/sex-and-gender-definitions.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          The Detrans Foundation
        </a>
      </p>
    </div>
  );
}
