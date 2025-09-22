export default async function StudiesPage() {
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1>Get Detransition Help & Support From Real People</h1>
      <h2>Online Support groups:</h2>
      <p>
        One of the best ways to get support is to talk to real people who have
        been there themselves.
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
      </ul>
      <h2>Gender Exploratory Therapy: What is it?</h2>

      <p>
        Gender exploratory therapy simply means that your therapist doesn't rush
        to affirm your identity and medicalise you. Instead they will start by
        exploring concepts of gender and why you might feel this way.
      </p>
      <p>
        If you Google "gender exploratory therapy", you will find all sorts of
        articles and studies published by gender activists who compare it to gay
        conversion therapy (which is proven to be ineffective) and they attempt
        to frame it as being evil and inhumane. The truth is that gender
        exploratory therapy is very different from gay conversion therapy:
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
                <strong>Goal</strong>: <em>Understand</em> the meaning of the
                dysphoria; outcome can be transition, no transition, or partial
                social transition.<sup>2</sup>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Method</strong>: Shame, aversion, behavioural
                conditioning, prayer.<sup>1</sup>
              </td>
              <td>
                <strong>Method</strong>: Standard psychodynamic or humanistic
                techniques—open questions, curiosity, no pre-set end-point.
                <sup>3</sup>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Evidence base</strong>: Consistently shows harm; every
                major medical body condemns it.
              </td>
              <td>
                <strong>Evidence base</strong>: No RCTs yet, but parallels to
                therapies that reduce anxiety, depression, self-harm; no data
                showing systematic harm.<sup>2,5</sup>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Ethics</strong>: Violates autonomy by pushing
                heterosexual identity as the only right option.<sup>1</sup>
              </td>
              <td>
                <strong>Ethics</strong>: Seeks to <em>expand</em> autonomy by
                ensuring the adolescent (and family) understand all options
                before irreversible steps.<sup>3</sup>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mb-8 rounded-lg border p-2 !text-xs sm:p-3">
        <h4 className="mt-0">References</h4>
        <ol className="mb-0">
          <li>
            U.S. Dept. of Health & Human Services (2025).{" "}
            <em>
              Report on Pediatric Gender Dysphoria and Gender Conversion Efforts
            </em>
            .
          </li>
          <li>
            D’Angelo, R. (2025). “Supporting autonomy in young people with
            gender dysphoria: psychotherapy is not conversion therapy.”{" "}
            <em>Journal of Medical Ethics</em>, 51(1).
          </li>
          <li>
            Lemma, A. & Schmidt, L. (2024). “Psychodynamic Psychotherapy for
            Gender Dysphoria is not Conversion Therapy.”{" "}
            <em>Frontiers in Psychology</em>.
          </li>
          <li>
            Korte, A. et al. (2021). “One Size Does Not Fit All: In Support of
            Psychotherapy for Gender Dysphoria.”{" "}
            <em>Archives of Sexual Behavior</em>.
          </li>
        </ol>
      </div>
      <p>
        Academic research in this field is often biased. One of the most
        recognised studies about gender exploratory therapy is{" "}
        <a
          href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10018052/"
          target="_blank"
          className="underline"
        >
          Interrogating Gender-Exploratory Therapy
        </a>{" "}
        which was published in 2022 by Florence Ashley, a{" "}
        <a
          href="https://en.wikipedia.org/wiki/Florence_Ashley"
          target="_blank"
          className="underline"
        >
          trans woman
        </a>
        . In her study she dramatically condemns the practice People who
        identify as trans are motivated by their identity, and studies published
        by them should be treated with skepticism. They are gender activists,
        pushing their gender agenda. This study is absolutely full of logical
        fallacies, yet it was still published:
        <div className="overflow-x-auto">
          <table border="1" cellpadding="6">
            <thead>
              <tr>
                <th>Fallacy Name</th>
                <th>Simple Explanation</th>
                <th>Example from the Paper</th>
                <th>Page(s)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Straw-Man</td>
                <td>
                  Attacks an exaggerated or distorted version of the other side,
                  not what they actually say.
                </td>
                <td>
                  Claims GET “discourages all affirmation” and “assumes trans
                  identities are pathological”, while GET proponents say they
                  allow transition and don’t presume pathology.
                </td>
                <td>472-473</td>
              </tr>
              <tr>
                <td>Hasty Generalisation</td>
                <td>
                  Uses one or two stories to claim “this always happens to
                  everyone.”
                </td>
                <td>
                  Cites Keira Bell’s single court case to argue that questioning
                  gender identity always backfires and forecloses exploration
                  for every youth.
                </td>
                <td>476</td>
              </tr>
              <tr>
                <td>False Analogy</td>
                <td>
                  Says “A looks a bit like B, so A must be as bad as B” even
                  when the important parts are different.
                </td>
                <td>
                  Because GET talks about “exploring causes” like old conversion
                  therapy did, the paper concludes GET is ethically the same as
                  anti-gay conversion practices.
                </td>
                <td>476-477</td>
              </tr>
              <tr>
                <td>Begging the Question</td>
                <td>
                  Assumes the very thing you’re trying to prove, going round in
                  a circle.
                </td>
                <td>
                  “Being trans is not pathological, therefore any therapy that
                  looks for pathology is unethical” — assumes pathology can’t
                  exist instead of proving it.
                </td>
                <td>473, 478</td>
              </tr>
              <tr>
                <td>Appeal to Ignorance</td>
                <td>
                  “We don’t have proof it’s true, so it must be false” (or the
                  other way round).
                </td>
                <td>
                  “There is no compelling evidence that trans identities are
                  maladaptive, so they never are” — treats lack of proof as
                  disproof.
                </td>
                <td>473</td>
              </tr>
              <tr>
                <td>False Dichotomy</td>
                <td>
                  Claims there are only two choices—black or white—when other
                  middle options exist.
                </td>
                <td>
                  Frames the choice as either “full, immediate affirmation” or
                  “coercive conversion-like exploration”, ignoring
                  parallel/supportive exploration plus reversible medical steps.
                </td>
                <td>Whole article framing</td>
              </tr>
              <tr>
                <td>Ad Hominem / Genetic</td>
                <td>
                  Attacks the person or their motives instead of dealing with
                  their actual argument.
                </td>
                <td>
                  Calls GET advocates “the intellectual arm of political
                  movements” seeking to criminalise gender-affirming care,
                  instead of refuting their clinical claims.
                </td>
                <td>473</td>
              </tr>
              <tr>
                <td>Slippery Slope</td>
                <td>
                  “If we allow X, then terrible Y and Z will surely follow”
                  without showing the chain will happen.
                </td>
                <td>
                  “Questioning a client’s narrative will undermine trust,
                  forcing them to lie and rush into medical steps” — no data
                  given that this routinely occurs.
                </td>
                <td>477</td>
              </tr>
              <tr>
                <td>Quantifier Shift</td>
                <td>
                  Jumps from “many” or “most” to “all,” erasing exceptions.
                </td>
                <td>
                  “Most youth want affirmation, therefore exploration
                  disrespects EVERY client’s agenda” — ignores the minority who
                  ask for deeper exploration.
                </td>
                <td>477</td>
              </tr>
              <tr>
                <td>Confirmation Bias</td>
                <td>
                  Cites only the evidence that supports your view and ignores
                  the rest.
                </td>
                <td>
                  Bibliography lists no studies showing neutral or positive
                  outcomes of GET; only critical or affirmative-therapy papers
                  are cited.
                </td>
                <td>References list</td>
              </tr>
              <tr>
                <td>Category Error</td>
                <td>
                  Mixes up two different kinds of things (e.g., a tool with a
                  moral stance).
                </td>
                <td>
                  “Neutrality, much like the cake, is a lie” — treats clinical
                  technique of neutrality as moral indifference, which are
                  separate concepts.
                </td>
                <td>477</td>
              </tr>
              <tr>
                <td>Misused Statistics</td>
                <td>
                  Uses true numbers to push a claim the numbers don’t actually
                  support.
                </td>
                <td>
                  Cites low detransition rate (≈3 %) to argue exploratory
                  screening is unnecessary; low base-rate doesn’t prove
                  screening can’t prevent individual harm.
                </td>
                <td>475</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The notion that gender exploratory therapy is somehow evil and wrong
          is predicated on the idea that gender (a social construct made up of
          roles and stereotypes) is something innate within us, but there is no
          evidence to support this belief, and the mere existence of detrans
          people causes this theory to fall on its head. Gender activists then
          fall back to saying that detrans people were never 'real trans'
          people, but detrans people tell us that they really were believers and
          fully 'in it', until they weren't any more.
        </p>
        <p>
          It's also noteworthy that scientists are still yet to discover a 'gay
          gene', and many people who identified as gay or straight at one point
          come to a realisation that sexuality is not as black and white as
          society once told them it is. This parallels the detrans experience.
        </p>
      </p>
      <h2>
        Where can I find a therapist who practices gender exploratory therapy?
      </h2>
      <a
        href="https://beyondtrans.org/therapist-directory/"
        target="_blank"
        className="underline"
      >
        <h3>
          <b>Just Therapy</b>
        </h3>
      </a>

      <p>
        Just Therapy is born out of a desire to go back to what therapy should
        be – effective, ethical, and free from ideology. It is an association of
        therapists and counsellors aligned by common ethics and principles. Just
        Therapy recognises that much of the world of psychotherapy and
        counselling has been taken over by activists and ideologies, which risk
        harming, rather than supporting, the mental wellbeing of clients. Its
        members, who come from a wide range of disciplines and specialities,
        have signed a Code of Conduct.
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
        <h3>
          <b>Therapy First</b>
        </h3>
      </a>

      <p>
        Therapy First unites mental-health professionals who believe
        gender-distressed clients deserve open-ended, evidence-based
        psychotherapy that explores unconscious and contextual factors before
        any irreversible medical steps; they reject both conversion practices
        and the “affirm-only” model, uphold client autonomy, and view
        childhood/teen medical transition as experimental, while still
        supporting adults’ right to bodily autonomy and continued therapeutic
        exploration.
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
        <h3>
          <b>Beyond Trans</b>
        </h3>
      </a>
      <p>
        Stella O’Malley launched the Gender Dysphoria Support Network in March
        2020 to give parents unbiased help with gender-distressed children; it
        quickly grew into a global community, spurring the 2021 creation of
        Genspect, an advocate for non-medicalised care. Recognising rising
        transition regret, the group started Beyond Trans in 2022, and in June
        2025 merged it with GDSN to form one integrated, evidence-based support
        network for families, individuals and detransitioners.
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
        <h3>
          <b>The Detrans Foundation</b>
        </h3>
      </a>
      <p>
        The Detrans Foundation provides resources and support for
        detransitioners, including access to qualified therapists who understand
        detransition experiences. The following therapists are part of the
        Detrans foundation:
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
        identity development service for under 18s in Leeds. She is registered
        with the UK Health Care Professions Council (HCPC) and offers online
        consultations by secure videocall.
      </p>

      <p>
        <a
          href="https://www.detransfoundation.com/anastassis-spilliadis.html"
          target="_blank"
          className="underline"
        >
          Anastassis Spiliadis
        </a>{" "}
        is a Systemic & Family Psychotherapist who worked for four years at the
        Gender Identity Development Service at the Tavistock, where he led the
        Family Therapy & Consultation Service. He resigned the Tavistock as he
        disagreed with the lack of a therapeutic model in understanding gender
        identity difficulties. He developed the Gender Exploratory Model and has
        extensive experience working with gender-questioning individuals and
        detransitioners.
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
    </div>
  );
}
