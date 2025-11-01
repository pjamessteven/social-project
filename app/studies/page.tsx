"use server";
import { ChartNoAxesCombined, ExternalLink } from "lucide-react";
import { Metadata } from "next";
import { Button } from "../components/ui/button";

const studies = [
  {
    title: "The Cass Review",
    authors: "Dr. Hilary Cass",
    description: `An independent systematic review commissioned by the UK's NHS England, evaluating over 100 studies on gender identity services for youth under 18. It represents a high-level critique of affirmative care models, emphasizing methodological flaws in existing research. It concluded that evidence for puberty blockers and cross-sex hormones is "remarkably weak" or low-quality, lacking randomized trials, with risks like bone density loss and uncertain mental health benefits. `,
    year: 2024,
    url: "https://segm.org/Final-Cass-Report-2024-NHS-Response-Summary",
    displayUrl: "https://segm.org/Final-Cass-Report-2024-NHS-Response-Summary",
  },
  {
    title: "Swedish Cohort Study",
    authors: "Dhejne et al.",
    description: `A long-term follow-up of 324 individuals post-sex reassignment surgery (up to 30 years), showing suicide mortality 19.1 times higher than the general population, with no reduction in psychiatric morbidity.`,
    year: 2011,
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0016885",
    displayUrl:
      "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0016885",
  },
  {
    title:
      "Factors associated with desistence and persistence of childhood gender dysphoria: a quantitative follow-up study",
    authors: "Steensma et al.",
    description: `This study tracked 127 children referred before age 12, revealing that factors such as the intensity of early gender dysphoria and social transition influenced persistence, with approximately 70% desisting post-puberty when comorbidities like anxiety were addressed rather than affirmed as inherent to gender identity.`,
    year: 2013,
    url: "https://pubmed.ncbi.nlm.nih.gov/23702447/",
    displayUrl: "https://pubmed.ncbi.nlm.nih.gov/23702447/",
  },
  {
    title:
      "Narratives of Adults Registered Female at Birth who Started a Medical Transition and Later Detransitioned",
    authors: "Lomax, J., & C.Butler",
    year: 2025,
    url: "https://link.springer.com/article/10.1007/s10508-025-03083-9#ref-CR61",
    displayUrl: "link.springer.com/article/10.1007/s10508-025-03083-9#ref-CR61",
  },
  {
    title: "The Detransition Rate is Unknown",
    authors: "Cohn, J.",
    year: 2023,
    url: "https://link.springer.com/article/10.1007/s10508-023-02623-5",
    displayUrl: "link.springer.com/article/10.1007/s10508-023-02623-5",
  },
  {
    title:
      "Gender dysphoria in young people is rising—and so is professional disagreement",
    authors: "Block, J",
    year: 2023,
    url: "https://www.bmj.com/content/380/bmj.p382",
    displayUrl: "https://www.bmj.com/content/380/bmj.p382",
  },
  {
    title:
      "Shifts in Gender-Related Medical Requests by Transgender and Gender-Diverse Adolescents",
    authors:
      "Ariel Cohen, Veronica Gomez-Lobo, Laura Willing, David Call, Lauren F. Damle, Lawrence J. D'Angelo, Amber Song, John F. Strang,",
    year: 2023,
    url: "https://www.sciencedirect.com/science/article/abs/pii/S1054139X22007194",
    displayUrl:
      "https://www.sciencedirect.com/science/article/abs/pii/S1054139X22007194",
  },
  {
    title:
      "Breastfeeding Grief After Chest Masculinising Mastectomy and Detransition",
    authors: "Gribble, K., Bewley, S. & H. Dahlen",
    year: 2023,
    url: "https://www.frontiersin.org/articles/10.3389/fgwh.2023.1073053/full",
    displayUrl: "www.frontiersin.org/articles/10.3389/fgwh.2023.1073053/full",
  },
  {
    title: "Iatrogenic Harm in Gender Medicine",
    authors: "Jorgensen, S.",
    year: 2023,
    url: "https://www.tandfonline.com/doi/full/10.1080/0092623X.2023.2224320",
    displayUrl: "www.tandfonline.com/doi/full/10.1080/0092623X.2023.2224320",
  },
  {
    title: "Detransition Needs Further Understanding, Not Controversy",
    authors: "MacKinnon, K.R. & P. Expositos-Campos",
    year: 2023,
    url: "https://www.bmj.com/content/381/bmj-2022-073584",
    displayUrl: "www.bmj.com/content/381/bmj-2022-073584",
  },
  {
    title:
      "Care of Transgender Patients: A General Practice Quality Improvement Approach",
    authors: "Boyd, I., Hackett, T. & S, Bewley",
    year: 2022,
    url: "https://www.mdpi.com/2227-9032/10/1/121",
    displayUrl: "www.mdpi.com/2227-9032/10/1/121",
  },
  {
    title:
      "Continuation of Gender Affirming Hormones Among Transgender Adolescents and Adults",
    authors: "Roberts, C.M, et al.",
    year: 2022,
    url: "https://academic.oup.com/jcem/article/107/9/e3937/6572526",
    displayUrl: "academic.oup.com/jcem/article/107/9/e3937/6572526",
  },
  {
    title:
      "A Typology of Gender Detransition and Its Implications for Healthcare Providers",
    authors: "Exposito-Campos, P.",
    year: 2021,
    url: "https://pubmed.ncbi.nlm.nih.gov/33427094/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/33427094/",
  },
  {
    title:
      "Access to care and frequency of detransition among a cohort discharged by a UK national adult gender identity clinic: retrospective case-note review",
    authors: "Hall, R., Mitchell,L. & J. Sachdeva",
    year: 2021,
    url: "https://www.cambridge.org/core/journals/bjpsych-open/article/access-to-care-and-frequency-of-detransition-among-a-cohort-discharged-by-a-uk-national-adult-gender-identity-clinic-retrospective-casenote-review/3F5AC1315A49813922AAD76D9E28F5CB",
    displayUrl:
      "www.cambridge.org/core/journals/bjpsych-open/article/access-to-care-and-frequency-of-detransition-among-a-cohort-discharged-by-a-uk-national-adult-gender-identity-clinic-retrospective-casenote-review/3F5AC1315A49813922AAD76D9E28F5CB",
  },
  {
    title:
      "Individuals Treated for Gender Dysphoria with Medical and/or Surgical Transition Who Subsequently Detransitioned: A Survey of 100 Detransitioners",
    authors: "Littman, L.",
    year: 2021,
    url: "https://pubmed.ncbi.nlm.nih.gov/34665380/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/34665380/",
  },
    {
    title:
      "Rapid-Onset Gender Dysphoria (ROGD) Study",
    authors: "Littman, L.",
    year: 2018,
    description: `This study, based on parent reports of 256 cases, suggests social contagion via peer groups and online communities may drive sudden adolescent-onset presentations, potentially amplified by affirmative environments that discourage desistance.[5] Affirmation's critics, including Littman, posit that it can create a feedback loop of harm by validating transient distress as fixed identity, reducing natural resolution rates observed in watchful waiting cohorts.`,
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202330",
    displayUrl: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202330",
  },
  {
    title: "Gender Detransition: A Case Study",
    authors: "Marchiano, L.",
    year: 2021,
    url: "https://onlinelibrary.wiley.com/doi/10.1111/1468-5922.12711",
    displayUrl: "onlinelibrary.wiley.com/doi/10.1111/1468-5922.12711",
  },
  {
    title:
      "Detransition-Related Needs and Support: A Cross-Sectional Online Survey",
    authors: "Vandenbussche, E.",
    year: 2021,
    url: "https://www.tandfonline.com/doi/full/10.1080/00918369.2021.1919479",
    displayUrl: "www.tandfonline.com/doi/full/10.1080/00918369.2021.1919479",
  },
  {
    title:
      "The pressing need for research and services for gender desisters /detransitioners",
    authors: "Butler, C. & Hutchinson, A.",
    year: 2020,
    url: "https://acamh.onlinelibrary.wiley.com/doi/abs/10.1111/camh.12361",
    displayUrl: "acamh.onlinelibrary.wiley.com/doi/abs/10.1111/camh.12361",
  },
  {
    title: "The Man I'm Trying to be is not Me",
    authors: "D'Angelo, R.",
    year: 2020,
    url: "https://www.tandfonline.com/doi/abs/10.1080/00207578.2020.1810049",
    displayUrl: "www.tandfonline.com/doi/abs/10.1080/00207578.2020.1810049",
  },
  {
    title:
      "Reality check – Detransitioner's testimonies require us to rethink gender dysphoria",
    authors: "Entwistle, K.",
    year: 2020,
    url: "https://acamh.onlinelibrary.wiley.com/doi/abs/10.1111/camh.12380",
    displayUrl: "acamh.onlinelibrary.wiley.com/doi/abs/10.1111/camh.12380",
  },
  {
    title:
      "Taking the Lid of the Box: The value of extended clinical assessment for adolescents presenting with gender identity difficulties",
    authors: "Churcher-Clarke, A. & Spiliadis, A.",
    year: 2019,
    journal: "Clinical child psychology and psychiatry",
    volume: "24",
    issue: "2",
    pages: "338-352",
    url: "https://www.icf-consultations.com/wp-content/uploads/2019/07/Taking-the-lid-off-the-box.pdf?amp;",
    displayUrl:
      "www.icf-consultations.com/wp-content/uploads/2019/07/Taking-the-lid-off-the-box.pdf?amp;",
  },
  {
    title:
      "Towards a gender exploratory model: Slowing things down, opening things up and exploring identity development",
    authors: "Spiliadis, A.",
    year: 2019,
    journal: "Metalogos Systemic Therapy Journal",
    volume: "35",
    pages: "1-9",
    url: "http://www.researchgate.net/publication/334559847_Towards_a_Gender_Exploratory_Model_slowing_things_down_opening_things_up_and_exploring_identity_development",
    displayUrl:
      "www.researchgate.net/publication/334559847_Towards_a_Gender_Exploratory_Model_slowing_things_down_opening_things_up_and_exploring_identity_development",
  },
  {
    title:
      "Trans-itory Identities: some psychoanalytic reflections on transgender identities",
    authors: "Lemma, A.",
    year: 2018,
    url: "https://www.tandfonline.com/doi/full/10.1080/00207578.2018.1489710",
    displayUrl: "www.tandfonline.com/doi/full/10.1080/00207578.2018.1489710",
  },
];

const metadata: Metadata = {
  title: "detrans.ai | Academic Studies on Detransition Topics",
  description:
    "Find on this page a selection of academic studies, peer-reviewed journal articles and verified statistics that relate to gender identity trends and detransition. ",
  openGraph: {
    title: "detrans.ai | Academic Studies on Detransition Topics",
    description:
      "Find on this page a selection of academic studies and peer-reviewed journal articles and verified statistics that relate to gender identity trends and detransition. ",
    url: "https://detrans.ai/videos",
    siteName: "detrans.ai",
    images: ["https://detrans.ai/x_card_lg.png"],
    locale: "en_US",
    type: "website",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return metadata;
}

export default async function StudiesPage() {
  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1 className="text-3xl font-bold">Selected Academic Articles</h1>

      <div className="not-prose mb-6 hidden">
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
            <span className="text-sm font-medium">
              For up-to-date statistics, see statsforgender
            </span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
      </div>

      <div className="space-y-4">
        {studies.map((study, index) => (
          <div key={index} className="mb-4">
            <p className="mb-0 font-semibold">{study.title}</p>
            <p className="mt-0 mb-0 text-sm text-gray-600 dark:text-gray-400">
              {study.authors} ({study.year})
              {study.journal && (
                <>
                  {" "}
                  <em>{study.journal}</em>
                  {study.volume && (
                    <>
                      , <em>{study.volume}</em>
                    </>
                  )}
                  {study.issue && <>({study.issue})</>}
                  {study.pages && <>, {study.pages}</>}
                </>
              )}
            </p>
            <a
              href={study.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 underline dark:text-blue-400"
            >
              {study.displayUrl}
            </a>
          </div>
        ))}
      </div>

      <hr />
    </div>
  );
}
