import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { studies } from "../db/schema";
import { OpenAI } from "openai";

dotenv.config();

// Database connection
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/app";
const client = postgres(connectionString);
const db = drizzle(client);

// OpenAI client configured for OpenRouter
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const MODEL = "deepseek/deepseek-chat-v3.1";

// Studies data from the page component
// This is the static array of studies defined in app/[locale]/studies/page.tsx
const studiesData = [
  {
    headline: "50-Fold Increase in Gender Dysphoria/Incongruence in English Youth (2011-2021)",
    title: "Epidemiology of gender dysphoria and gender incongruence in children and young people attending primary care practices in England: retrospective cohort study",
    authors: "Jarvis et al.",
    description: `This large-scale study of English primary care records found a 50-fold (5000%) increase in recorded gender dysphoria/incongruence among children and young people aged 0-18 between 2011 and 2021. Prevalence increased from 0.16 to 8.3 per 10,000 persons, with the rise being most pronounced in birth-registered females after 2014. The study also found high rates of co-occurring mental health conditions - 52.7% had records of anxiety, depression or self-harm. Medical interventions were relatively uncommon, with 4.7% prescribed puberty blockers and 8.0% prescribed cross-sex hormones. The authors note the urgent need for better mental health support for this population.`,
    year: 2025,
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12320607/",
    displayUrl: "pmc.ncbi.nlm.nih.gov/articles/PMC12320607/",
  },
  {
    headline: "30% Discontinuation Rate: Over 1 in 4 Trans-Identified Youth Stop Hormones Within 4 Years",
    title: "Continuation of Gender Affirming Hormones Among Transgender Adolescents and Adults",
    authors: "Roberts, C.M, et al.",
    description: `This study of 952 individuals in the US Military Healthcare System tracked continuation/discontinuation rates of cross-sex hormones. While approximately 70% continued hormone use for at least 4 years, the discontinuation rate (desistance) was 30% - substantially higher for transmasculine individuals (35.6% discontinuation) compared to transfeminine (19%). Adults who started hormones after age 18 had a 35.6% discontinuation rate. Notably, nearly 26% (1 in 4) of those who started as minors stopped treatment. These findings suggest desistance rates may be higher than typically cited in the literature and reveal important differences by gender and age at initiation.`,
    year: 2022,
    url: "https://academic.oup.com/jcem/article/107/9/e3937/6572526",
    displayUrl: "academic.oup.com/jcem/article/107/9/e3937/6572526",
  },
  {
    headline: "70% of Gender-Dysphoric Children Desist by Puberty When Mental Health Issues Are Treated",
    title: "Factors associated with desistence and persistence of childhood gender dysphoria: a quantitative follow-up study",
    authors: "Steensma et al.",
    description: `This study tracked 127 children referred before age 12, revealing that factors such as the intensity of early gender dysphoria and social transition influenced persistence, with approximately 70% desisting post-puberty when comorbidities like anxiety were addressed rather than affirmed as inherent to gender identity.`,
    year: 2013,
    url: "https://pubmed.ncbi.nlm.nih.gov/23702447/",
    displayUrl: "https://pubmed.ncbi.nlm.nih.gov/23702447/",
  },
  {
    headline: "29% of Gender Clinic Youth Change Their Minds About Medical Transition",
    title: "Shifts in Gender-Related Medical Requests by Transgender and Gender-Diverse Adolescents",
    authors: "Ariel Cohen, Veronica Gomez-Lobo, Laura Willing, David Call, Lauren F. Damle, Lawrence J. D'Angelo, Amber Song, John F. Strang,",
    description: `This study of 68 adolescents at a gender clinic (47% autistic) found that nearly a third (29%) shifted their requests for medical transition. Shifts were more common among nonbinary youth and were considered a 'not uncommon' part of the gender discernment process. The most frequent pattern was withdrawing a request and later resuming it.`,
    year: 2023,
    url: "https://www.sciencedirect.com/science/article/abs/pii/S1054139X22007194",
    displayUrl: "https://www.sciencedirect.com/science/article/abs/pii/S1054139X22007194",
  },
  {
    headline: "20% Stop Hormones: UK Audit Finds Over Half Cite Detransition or Regret",
    title: "Care of Transgender Patients: A General Practice Quality Improvement Approach",
    authors: "Boyd, I., Hackett, T. & S. Bewley",
    description: `A UK primary care audit of 68 transgender patients that found no consistent national guidelines for monitoring, leading to substandard care for up to two-thirds of patients. The study revealed long waits for specialist services, high rates of co-occurring mental health conditions, and a 20% rate of hormone cessation, with over half of those stopping citing detransition or regret. The authors call for evidence-based primary care standards.`,
    year: 2022,
    url: "https://www.mdpi.com/2227-9032/10/1/121",
    displayUrl: "www.mdpi.com/2227-9032/10/1/121",
  },
  {
    headline: "Only 56% Complete Treatment: UK Clinic Study Shows High Dropout and Poor Outcomes",
    title: "Access to care and frequency of detransition among a cohort discharged by a UK national adult gender identity clinic: retrospective case-note review",
    description: "In 175 adults discharged from a UK gender clinic, only 56% finished the planned pathway; 59% got all desired treatments (94% hormones, 48% surgery). 22% dropped out, 19% soon re-referred. Neurodevelopmental conditions, childhood adversity, on-going mental-health or substance problems predicted worse outcomes. Authors urge more individualised, trauma-informed care.",
    authors: "Hall, R., Mitchell,L. & J. Sachdeva",
    year: 2021,
    url: "https://www.cambridge.org/core/journals/bjpsych-open/article/access-to-care-and-frequency-of-detransition-among-a-cohort-discharged-by-a-uk-national-adult-gender-identity-clinic-retrospective-casenote-review/3F5AC1315A49813922AAD76D9E28F5CB",
    displayUrl: "www.cambridge.org/core/journals/bjpsych-open/article/access-to-care-and-frequency-of-detransition-among-a-cohort-discharged-by-a-uk-national-adult-gender-identity-clinic-retrospective-casenote-review/3F5AC1315A49813922AAD76D9E28F5CB",
  },
  {
    headline: "18 Detransitioned After Testosterone: Norwegian Study Shows 22% Leave Treatment Without Medical Intervention",
    title: "Treatment trajectories among children and adolescents referred to the Norwegian National Center for Gender Incongruence",
    authors: "Nyquist et al.",
    description: `This Norwegian cohort study of 1,258 youth referred to the National Center for Gender Incongruence found that 22% were discharged without gender-affirming medical treatment. Of those who started testosterone, 18 females detransitioned (11 due to cessation of transgender identity). The study highlights the high continuation rate from puberty blockers to hormones (97%), raising concerns about the pipeline effect, and underscores the need for long-term follow-up given various treatment trajectories including detransition.`,
    year: 2025,
    url: "https://pubmed.ncbi.nlm.nih.gov/39648282/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/39648282/",
  },
  {
    headline: "2-3x Higher Mortality Post-Transition: Swedish Study Shows Hormones Increase Cardiovascular Death Risk",
    title: "Long-Term Follow-Up of Transsexual Persons Undergoing Sex Reassignment Surgery: Cohort Study in Sweden",
    authors: "Dhejne et al",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3043071/",
    year: 2003,
    description: "This study highlights physical health risks persisting post-transition, related to cross-sex hormone use. Following up on post-surgical transgender individuals, it reports 2-3 times higher overall mortality (e.g., from cardiovascular causes) vs. general population.",
    displayUrl: "pmc.ncbi.nlm.nih.gov/articles/PMC3043071/",
  },
  {
    headline: "19x Higher Suicide Rate Post-Surgery: Long-Term Swedish Study Shows No Mental Health Improvement",
    title: "Swedish Cohort Study",
    authors: "Dhejne et al.",
    description: `A long-term follow-up of 324 individuals post-sex reassignment surgery (up to 30 years), showing suicide mortality 19.1 times higher than the general population, with no reduction in psychiatric morbidity.`,
    year: 2011,
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0016885",
    displayUrl: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0016885",
  },
  {
    headline: "Claims of 'Low Regret' Exposed as Flawed—True Detransition Rates Remain Unknown",
    title: "The Detransition Rate is Unknown",
    authors: "Cohn, J.",
    description: `This paper argues that the actual rates of detransition, discontinuation, and regret are unknown due to significant flaws in existing research. It critiques widely cited studies for issues like short follow-up periods (as regret can take years to surface), high loss-to-follow-up rates, and using samples that don't reflect the recent surge in adolescent cases. The author concludes that claims of very low regret rates are unreliable and that this uncertainty is critical for informed consent.`,
    year: 2023,
    url: "https://link.springer.com/article/10.1007/s10508-023-02623-5",
    displayUrl: "link.springer.com/article/10.1007/s10508-023-02623-5",
  },
  {
    headline: "Major Correction: Landmark Study's Claims of Surgery Benefits Were Wrong—No Improvement in Mental Health",
    title: 'Correction of a Key Study: No Evidence of "Gender-Affirming" Surgeries Improving Mental Health',
    authors: "American Journal of Psychiatry",
    url: "https://segm.org/ajp_correction_2020",
    year: 2020,
    description: "Initial study claimed mental health benefits from surgery; 2020 correction found no reduction in treatment utilization or suicidality.",
    displayUrl: "segm.org/ajp_correction_2020",
  },
  {
    headline: "Landmark NHS Review: Evidence for Puberty Blockers 'Remarkably Weak'—Ends Gender-Affirming Care Model in England",
    title: "The Cass Review",
    authors: "Dr. Hilary Cass",
    description: `An independent systematic review commissioned by the UK's NHS England, evaluating over 100 studies on gender identity services for youth under 18. It represents a high-level critique of affirmative care models, emphasizing methodological flaws in existing research. It concluded that evidence for puberty blockers and cross-sex hormones is "remarkably weak" or low-quality, lacking randomized trials, with risks like bone density loss and uncertain mental health benefits. `,
    year: 2024,
    url: "https://segm.org/Final-Cass-Report-2024-NHS-Response-Summary",
    displayUrl: "https://segm.org/Final-Cass-Report-2024-NHS-Response-Summary",
  },
  {
    headline: "Male Puberty Advantages Persist: Transgender Women Retain 9-31% Athletic Edge Despite Hormone Therapy",
    title: "Sports Advantages Review",
    authors: "Hilton & Lundberg",
    description: "Review of studies showing transgender women retain 9-31% advantages in muscle mass, strength, and hemoglobin post-hormone therapy, due to irreversible male puberty effects.",
    year: 2021,
    url: "https://www.insidethegames.biz/articles/1117938/ioc-transgender-framework-criticised",
    displayUrl: "www.insidethegames.biz/articles/1117938/ioc-transgender-framework-criticised",
  },
  {
    headline: "Mayo Clinic Study: Puberty Blockers Cause Testicular Atrophy and Potential Irreversible Infertility in Gender-Dysphoric Boys",
    title: "Puberty Blocker and Aging Impact on Testicular Cell States and Function ",
    authors: "Murugesh  et al",
    url: "https://pubmed.ncbi.nlm.nih.gov/38585884/",
    year: 2024,
    description: "Analysis of boys on puberty blockers, showing persistent damage to spermatogonial stem cells, suggesting irreversible infertility even after discontinuation.",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/38585884/",
  },
  {
    headline: "Detransitioned Women Report Unmet Needs: Medical Transition Failed to Resolve Dysphoria",
    title: "Narratives of Adults Registered Female at Birth who Started a Medical Transition and Later Detransitioned",
    authors: "Lomax, J., & C.Butler",
    description: `A qualitative study of six UK females (ages 21-32) who detransitioned after medical interventions. Four narrative themes emerged: limits of medical transition in resolving dysphoria, long-term health concerns about testosterone, social challenges of living as men, and detransition as an ongoing process. Participants reported unmet support needs and highlighted the importance of realistic expectations about transition outcomes.`,
    year: 2025,
    url: "https://link.springer.com/article/10.1007/s10508-025-03083-9#ref-CR61",
    displayUrl: "link.springer.com/article/10.1007/s10508-025-03083-9#ref-CR61",
  },
  {
    headline: "No Medical Consensus: European Nations Reject 'Gender-Affirming Care' Over Poor Evidence",
    title: "Gender dysphoria in young people is rising—and so is professional disagreement",
    authors: "Block, J",
    description: `This investigative report highlights the growing international debate over medical transition for minors. While US medical bodies endorse 'gender-affirming care,' several European countries (Sweden, Finland, UK) are urging caution due to low-quality evidence. The article questions the claim of a medical consensus, pointing to systematic reviews that find the evidence for hormonal treatments in adolescents to be 'low' or 'very low' quality and noting the lack of long-term outcome data.`,
    year: 2023,
    url: "https://www.bmj.com/content/380/bmj.p382",
    displayUrl: "https://www.bmj.com/content/380/bmj.p382",
  },
  {
    headline: "Permanent Loss: Detransitioned Woman Grieves Inability to Breastfeed After Mastectomy",
    title: "Breastfeeding Grief After Chest Masculinising Mastectomy and Detransition",
    authors: "Gribble, K., Bewley, S. & H. Dahlen",
    description: `This case study details the experience of a detransitioned woman who, after undergoing a chest masculinization mastectomy, became pregnant and experienced profound grief and psychological distress from her inability to breastfeed. The report highlights the lack of informed consent regarding the loss of breastfeeding function, the poor understanding from healthcare providers, and the emotional toll on the mother.`,
    year: 2023,
    url: "https://www.frontiersin.org/articles/10.3389/fgwh.2023.1073053/full",
    displayUrl: "www.frontiersin.org/articles/10.3389/fgwh.2023.1073053/full",
  },
  {
    headline: "Medical Ethics Expert: Gender-Affirming Care Causing Iatrogenic Harm to Youth",
    title: "Iatrogenic Harm in Gender Medicine",
    authors: "Jorgensen, S.",
    description: `This commentary argues that the 'gender-affirmation model' is causing iatrogenic harm, as evidenced by a growing number of young detransitioners. The author critiques the model for insufficient psychological assessment, downplaying medical risks, and relying on weak evidence. It calls for recognizing detransitioners as survivors of medical harm and urges open debate and research into the long-term effects of youth transition, noting that many European countries are now adopting more cautious approaches.`,
    year: 2023,
    url: "https://www.tandfonline.com/doi/full/10.1080/0092623X.2023.2224320",
    displayUrl: "www.tandfonline.com/doi/full/10.1080/0092623X.2023.2224320",
  },
  {
    headline: "Researchers Call for End to Politicization—Detransitioners Have Unmet Healthcare Needs",
    title: "Detransition Needs Further Understanding, Not Controversy",
    authors: "MacKinnon, K.R. & P. Expositos-Campos",
    description: `This paper argues that detransition has been overlooked by researchers and clinicians, leading to unmet healthcare needs. The authors call for robust, non-politicized research to understand the diverse experiences of those who detransition, noting that current studies are limited by short follow-up times and selection bias. They emphasize that improving care for detransitioners is a necessary part of comprehensive gender care and will ultimately benefit all trans people by providing a better understanding of long-term outcomes.`,
    year: 2023,
    url: "https://www.bmj.com/content/381/bmj-2022-073584",
    displayUrl: "www.bmj.com/content/381/bmj-2022-073584",
  },
  {
    headline: "First-Ever Typology: Detransitioners Need Specialized Healthcare Support",
    title: "A Typology of Gender Detransition and Its Implications for Healthcare Providers",
    authors: "Exposito-Campos, P.",
    year: 2021,
    url: "https://pubmed.ncbi.nlm.nih.gov/33427094/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/33427094/",
  },
  {
    headline: "60% Became Comfortable With Birth Sex: Survey of 100 Detransitioners Reveals Why They Stopped",
    title: "Individuals Treated for Gender Dysphoria with Medical and/or Surgical Transition Who Subsequently Detransitioned: A Survey of 100 Detransitioners",
    authors: "Littman, L.",
    description: `This survey of 100 detransitioners (69% female) found varied reasons for detransition, including becoming more comfortable with their natal sex (60%), concerns about medical complications (49%), and realizing their dysphoria was linked to other issues like trauma or mental health conditions (38%). Notably, 23% cited homophobia or difficulty accepting same-sex attraction as a factor. A majority (55%) felt their initial evaluation for transition was inadequate, and only 24% had informed their clinicians of their detransition.`,
    year: 2021,
    url: "https://pubmed.ncbi.nlm.nih.gov/34665380/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/34665380/",
  },
  {
    headline: "Social Contagion Factor: 256 Parent Reports Link Peer Groups to Sudden Gender Dysphoria Onset",
    title: "Rapid-Onset Gender Dysphoria (ROGD) Study",
    authors: "Littman, L.",
    year: 2018,
    description: `This study, based on parent reports of 256 cases, suggests social contagion via peer groups and online communities may drive sudden adolescent-onset presentations, potentially amplified by affirmative environments that discourage desistance.[5] Affirmation's critics, including Littman, posit that it can create a feedback loop of harm by validating transient distress as fixed identity, reducing natural resolution rates observed in watchful waiting cohorts.`,
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202330",
    displayUrl: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202330",
  },
  {
    headline: "Trauma, Autism, Mental Health Issues: Case Study Shows Need for Assessment Before Medicalization",
    title: "Gender Detransition: A Case Study",
    authors: "Marchiano, L.",
    year: 2021,
    description: `This case study of a young adult female who detransitioned highlights the complexity of gender identity development. The patient had a history of trauma, autism, and mental health comorbidities. The author emphasizes the need for thorough psychological assessment and a cautious, individualized approach for gender-dysphoric youth, allowing for identity exploration without premature medicalization.`,
    url: "https://onlinelibrary.wiley.com/doi/10.1111/1468-5922.12711",
    displayUrl: "onlinelibrary.wiley.com/doi/10.1111/1468-5922.12711",
  },
  {
    headline: "70% Realized Dysphoria Wasn't Gender-Related: Largest Detransitioner Survey Shows Widespread Unmet Needs",
    title: "Detransition-Related Needs and Support: A Cross-Sectional Online Survey",
    authors: "Vandenbussche, E.",
    description: `This online survey of 237 detransitioners (92% female) found significant unmet needs. Key reasons for detransition included realizing dysphoria was related to other issues (70%), health concerns (62%), and transition not helping dysphoria (50%). Major needs included psychological support for comorbid conditions and regret, medical help for complications, and social connection with other detransitioners. Many reported a lack of support, negative experiences with healthcare providers, and rejection from the LGBT community.`,
    year: 2021,
    url: "https://www.tandfonline.com/doi/full/10.1080/00918369.2021.1919479",
    displayUrl: "www.tandfonline.com/doi/full/10.1080/00918369.2021.1919479",
  },
  {
    headline: "No Protocols Exist for Detransitioners: Clinical Leaders Call for Urgent Research and Services",
    title: "The pressing need for research and services for gender desisters /detransitioners",
    authors: "Butler, C. & Hutchinson, A.",
    year: 2020,
    description: `This paper highlights the growing number of individuals seeking to desist or detransition from a gender transition. The authors argue that despite this trend, there is a significant lack of research, clinical guidance, and support for this population. They note that while extensive protocols exist for transitioning, there are none for those who detransition, and call for urgent attention to clinical and research needs for this cohort.`,
    url: "https://acamh.onlinelibrary.wiley.com/doi/abs/10.1111/camh.12361",
    displayUrl: "acamh.onlinelibrary.wiley.com/doi/abs/10.1111/camh.12361",
  },
  {
    headline: "'The Man I'm Trying to Be Is Not Me': Transition Failed to Resolve Patient's Underlying Trauma",
    title: "The Man I'm Trying to be is not Me",
    authors: "D'Angelo, R.",
    year: 2020,
    description: `This case study details the therapy of 'Josh,' a trans man whose life deteriorated post-transition. The author describes a therapeutic impasse rooted in deception and mystification. By working through this, the therapy was able to move beyond gender to address deeper issues of past trauma, authenticity, and loss, suggesting that transition did not resolve his underlying problems.`,
    url: "https://www.tandfonline.com/doi/abs/10.1080/00207578.2020.1810049",
    displayUrl: "www.tandfonline.com/doi/abs/10.1080/00207578.2020.1810049",
  },
  {
    headline: "Reality Check Needed: Detransitioner Testimonies Expose Misinformation on Medical Interventions",
    title: "Reality check – Detransitioner's testimonies require us to rethink gender dysphoria",
    authors: "Entwistle, K.",
    year: 2020,
    description: `Butler and Hutchinson's clarion call (Butler and Hutchinson, 2020) for empirical research on desistance and detransition deserves careful consideration. It formally documents the needs of the emerging cohort of detransitioners, many of whom are in their teens and early twenties. In the absence of specialist services, some detransitioners have been sharing their experiences in public forums. The anecdotal reports by detransitioners indicate that systematic long-term follow-up of those who have been prescribed medical interventions by NHS and private clinics is essential to understanding the gestalt. Decision-making on the basis of misinformation on the effectiveness and necessity of medical interventions for gender dysphoria is a problem, and detransitioners indicate that nonmedical interventions for gender dysphoria are sorely needed. Analysis of the political and organisational systems that have brought us to the current situation is required in order to prevent more young people from being prescribed unnecessary medical interventions for gender dysphoria.`,
    url: "https://acamh.onlinelibrary.wiley.com/doi/abs/10.1111/camh.12380",
    displayUrl: "acamh.onlinelibrary.wiley.com/doi/abs/10.1111/camh.12380",
  },
  {
    headline: "Extended Assessment Works: 12 Cases Show Youth Can Resolve Dysphoria Without Hormones",
    title: "Taking the Lid of the Box: The value of extended clinical assessment for adolescents presenting with gender identity difficulties",
    authors: "Churcher-Clarke, A. & Spiliadis, A.",
    year: 2019,
    description: `This case review from the UK's GIDS examines adolescents with late-onset gender dysphoria who, during assessment, decided against medical transition. The authors analyze 12 such cases over 18 months, presenting two vignettes to illustrate how extended assessment allowed for different understandings of their distress, leading them to cease pursuing hormonal interventions.`,
    journal: "Clinical child psychology and psychiatry",
    url: "https://pubmed.ncbi.nlm.nih.gov/30722669/",
    displayUrl: "https://pubmed.ncbi.nlm.nih.gov/30722669/",
  },
  {
    headline: "Slow Down, Open Up: Exploratory Therapy Model Proposed for Gender-Dysphoric Youth",
    title: "Towards a gender exploratory model: Slowing things down, opening things up and exploring identity development",
    authors: "Spiliadis, A.",
    description: `This paper introduces the Gender Exploratory Model (GEM), a systemic-developmental framework for working with gender-dysphoric youth that stands in contrast to the "gender affirmative" approach. The model emphasizes slowing down the clinical process, opening up space for understanding the multifaceted nature of identity, and exploring how various factors (developmental, social, psychological) may contribute to gender distress. Spiliadis argues that immediate affirmation and medicalization may foreclose important developmental processes and that extended assessment allows clinicians and young people to explore whether gender transition is truly the best path forward, or whether underlying issues might be driving the dysphoria.`,
    year: 2019,
    journal: "Metalogos Systemic Therapy Journal",
    url: "http://www.researchgate.net/publication/334559847_Towards_a_Gender_Exploratory_Model_slowing_things_down_opening_things_up_and_exploring_identity_development",
    displayUrl: "www.researchgate.net/publication/334559847_Towards_a_Gender_Exploratory_Model_slowing_things_down_opening_things_up_and_exploring_identity_development",
  },
  {
    headline: "Transgender Identity Can Be 'Trans-itory': Psychoanalyst Warns Against Premature Embrace",
    title: "Trans-itory Identities: some psychoanalytic reflections on transgender identities",
    authors: "Lemma, A.",
    year: 2018,
    description: `This paper argues that the 'transgender' identity can be prematurely embraced by some young people, hindering the psychological work needed to understand its personal meaning. The author, a psychoanalyst, discusses the challenge of exploring the 'why' of a transgender identity in a culture that may view such questions as pathologizing, and the need to balance curiosity with avoiding skepticism.`,
    url: "https://pubmed.ncbi.nlm.nih.gov/33951791/",
    displayUrl: "https://pubmed.ncbi.nlm.nih.gov/33951791/",
  },
  {
    headline: "Childhood Trauma, Not True Gender Dysphoria: Finnish Detransitioners Reveal Real Reasons for Transition",
    title: "Gender Dysphoria and Detransitioning in Adults: An Analysis of Nine Patients from a Gender Identity Clinic from Finland",
    authors: "Kettula et al.",
    description: `This Finnish study of nine detransitioners (7 female, 2 male) found all reported that their initial transition was driven not by genuine transgender identity, but by unresolved psychological stressors including childhood trauma, sexual abuse, eating disorders, and borderline personality symptoms. All seven females had 'major' regret with mean regret time of 7 years. Retrospectively, patients identified the need for transitioning stemmed from maturation challenges and attachment issues, not gender dysphoria. The study highlights the critical importance of thorough psychological assessment before medical intervention.`,
    year: 2025,
    url: "https://pubmed.ncbi.nlm.nih.gov/40394447/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/40394447/",
  },
  {
    headline: "'Do We Want to Know?' Psychoanalyst Exposes Weak Evidence and Urges Exploration Before Medicalization",
    title: "Do we want to know?",
    authors: "D'Angelo, R.",
    description: `This paper argues that the weak evidence base and profound consequences of gender-affirming interventions for youth call for sensitive psychoanalytic exploration. It critiques how socio-political trends frame deep exploration of why young people seek medical transition as 'off-limits' or conversion therapy. The author notes that politically driven clinicians misrepresent those who explore the meaning of trans identification, minimizing the weak evidence base and serious risks while obscuring psychic pain beneath gender dysphoria.`,
    year: 2025,
    url: "https://pubmed.ncbi.nlm.nih.gov/39327914/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/39327914/",
  },
  {
    headline: "'Considerable Uncertainty': Systematic Review Finds No Reliable Evidence for Puberty Blocker Benefits",
    title: "Puberty blockers for gender dysphoria in youth: A systematic review and meta-analysis",
    authors: "Miroshnychenko et al.",
    description: `This systematic review and meta-analysis from Archives of Disease in Childhood examined 10 studies on puberty blockers for youth with gender dysphoria. The authors found "considerable uncertainty regarding the effects of puberty blockers" with only "very low certainty" evidence for outcomes including global function, depression, and bone mineral density. Comparative observational studies provided very low certainty evidence, and before-after studies also showed very low certainty. The authors conclude that "methodologically rigorous prospective studies are needed" before these interventions can be confidently recommended.`,
    year: 2025,
    url: "https://pubmed.ncbi.nlm.nih.gov/39855724/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/39855724/",
  },
  {
    headline: "Very Low Certainty Evidence: Major Review Questions Mental Health Benefits of Cross-Sex Hormones",
    title: "Gender affirming hormone therapy for individuals with gender dysphoria aged <26 years: a systematic review and meta-analysis",
    authors: "Miroshnychenko et al.",
    description: `This comprehensive systematic review and meta-analysis evaluated 24 studies on gender affirming hormone therapy (GAHT) for individuals under 26. The review found mostly "very low certainty" evidence regarding gender dysphoria, global function, and depression. While one study suggested lower odds of depression (OR 0.73), this was rated as low certainty evidence. The authors concluded: "There is considerable uncertainty about the effects of GAHT and we cannot exclude the possibility of benefit or harm. Methodologically rigorous prospective studies are needed to produce higher certainty evidence."`,
    year: 2025,
    url: "https://pubmed.ncbi.nlm.nih.gov/39855725/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/39855725/",
  },
  {
    headline: "Bioethicist Warns: 'Autonomy-Based' Justifications for Pediatric Gender Medicine Put Patients at Risk",
    title: "What Is the Aim of PEDIATRIC 'Gender-Affirming' Care?",
    authors: "Gorin, M.",
    description: `Published in the Hastings Center Report, this bioethical analysis critiques the shift from evidence-based justifications for pediatric gender-affirming care to "autonomy-based" arguments appealing to "embodiment goals." The author argues that recent systematic reviews have concluded the scientific evidence is uncertain, leading some to abandon health improvement as the goal and instead justify interventions through patient autonomy. Gorin concludes these autonomy-based arguments misunderstand the place of autonomy in clinical decision-making and consequently put patients at risk of medical harm.`,
    year: 2024,
    url: "https://pubmed.ncbi.nlm.nih.gov/38842886/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/38842886/",
  },
  {
    headline: "Bone Density Concerns: Transgender Youth Already Have Lower BMD Before Any Treatment Begins",
    title: "The natural course of bone mineral density in transgender youth before medical treatment; a cross sectional study",
    authors: "van der Loos et al.",
    description: `This study of 889 transgender youth (333 AMAB, 556 AFAB) found that before any medical intervention, bone mineral density (BMD) Z-scores were already negatively associated with age in birth-assigned males between 12-22 years. This suggests BMD increases less in this population than the general population even before puberty blockers or hormones are introduced. The findings challenge assumptions about whether BMD changes during puberty suppression are treatment-related or reflect underlying lifestyle factors, raising concerns about bone health in this population independent of medical intervention.`,
    year: 2024,
    url: "https://pubmed.ncbi.nlm.nih.gov/39353071/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/39353071/",
  },
  {
    headline: "Detransition Rates Unknown: Systematic Review Exposes Critical Gaps in Long-Term Data",
    title: "Prevalence of detransition in persons seeking gender-affirming hormonal treatments: a systematic review",
    authors: "Feigerlova, E.",
    description: `This systematic review in the Journal of Sexual Medicine examined existing research on detransition rates among individuals who requested or started gender-affirming hormonal treatments. The review found significant gaps in the literature and identified potential sources of bias in different datasets. The author notes that despite recent evidence suggesting benefits of gender-affirming procedures, emerging demands for detransition and reports of regret indicate critical knowledge gaps. The review highlights the need for better long-term follow-up studies to understand the true prevalence of detransition and its underlying causes.`,
    year: 2025,
    url: "https://pubmed.ncbi.nlm.nih.gov/39724926/",
    displayUrl: "pubmed.ncbi.nlm.nih.gov/39724926/",
  },
];

// Backoff utility for API calls
async function fetchWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 500,
): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }

      const backoff = delay * Math.pow(2, attempt);
      console.warn(
        `Attempt ${attempt + 1} failed. Retrying in ${backoff}ms...`,
        err,
      );

      await new Promise((resolve) => setTimeout(resolve, backoff));
      attempt++;
    }
  }

  throw new Error("Unexpected error in fetchWithBackoff");
}

async function migrateStudies() {
  console.log(`Starting migration of ${studiesData.length} studies...`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < studiesData.length; i++) {
    const study = studiesData[i];
    console.log(`\n[${i + 1}/${studiesData.length}] Processing: ${study.headline?.substring(0, 60)}...`);

    try {
      // Check if study already exists by URL
      const existingStudy = await db
        .select({ id: studies.id })
        .from(studies)
        .where(eq(studies.url, study.url))
        .limit(1);

      if (existingStudy.length > 0) {
        console.log(`  ⏭️  Study already exists (URL: ${study.url}), skipping...`);
        skipCount++;
        continue;
      }

      // Insert the study
      await db.insert(studies).values({
        headline: study.headline || null,
        title: study.title || null,
        authors: study.authors || null,
        description: study.description || null,
        year: study.year || null,
        url: study.url,
        displayUrl: study.displayUrl,
        processed: true, // Mark as processed since this is curated data
      });

      console.log(`  ✅ Successfully migrated: ${study.headline?.substring(0, 60)}...`);
      successCount++;

      // Add a small delay to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ❌ Error migrating study:`, error);
      errorCount++;
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`✅ Successfully migrated: ${successCount}`);
  console.log(`⏭️  Skipped (already exists): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total: ${studiesData.length}`);
}

async function main() {
  try {
    await migrateStudies();
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateStudies };
