"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

export default function Studies() {
  return (
    <Accordion type="single" collapsible className="w-full space-y-8 not-prose">
      <AccordionItem
        value="study-1"
        className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
      >
        <AccordionTrigger className="p-6 hover:no-underline">
          <div className="text-left">
            <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Study 1: Developmental Pathways of Desisters and Detransitioners
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic font-normal">
              "The developmental pathways of desisters and detransitioners: A
              mixed-methods study of biopsychosocial factors involved in gender
              transition, desistance, or detransition-related experiences among
              previously transgender-identified individuals"
            </p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-6 pt-0">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                Who Can Participate
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Desisters
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Individuals who once identified as transgender, non-binary or
                    other gender identities outside their birth sex, who socially
                    detransitioned and no longer identify outside their birth sex
                    identity. No medical/surgical treatments undertaken.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Detransitioners
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Individuals who initiated medical and/or surgical transition
                    (puberty blockers, cross-sex hormones, mastectomy, etc.) and
                    later chose to stop or reverse their effects.
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Requirements:</strong> Must have identified as
                  transgender for at least 6 months and stopped identifying as
                  transgender at least 6 months ago.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                Study Goals
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Examine pathways of individuals who previously identified as
                  transgender
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Explore biopsychosocial factors in identity development
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Understand current experiences and functioning
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Advance science-based healthcare for individuals
                </li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
              What's Involved
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
              <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">
                    ✓
                  </span>
                  Brief, confidential online eligibility meeting (not recorded)
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">
                    ✓
                  </span>
                  Electronic questionnaire via LimeSurvey (complete at your own
                  pace)
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">
                    ✓
                  </span>
                  Optional online interview for those who prefer verbal
                  expression
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">
                    ✓
                  </span>
                  Can save and resume questionnaire responses
                </li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
              Your Privacy & Rights
            </h3>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-4">
              <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                <li className="flex items-start">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">
                    🔒
                  </span>
                  Completely anonymous responses
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">
                    🔒
                  </span>
                  Data used exclusively for scientific research
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">
                    🔒
                  </span>
                  Withdraw at any time without consequences
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">
                    🔒
                  </span>
                  All identifiable information removed from publications
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">
                    🔒
                  </span>
                  IRB approved by Salesian Pontifical University of Rome
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">
              Ready to Share Your Story?
            </h3>
            <p className="mb-4">
              If you're eligible and willing to participate, or if you know
              someone who might be interested, reach out today.
            </p>
            <div className="space-y-2">
              <p className="font-medium">
                Contact:{" "}
                <a
                  href="mailto:franusicl@gmail.com"
                  className="underline hover:no-underline"
                >
                  franusicl@gmail.com
                </a>
              </p>
              <p className="text-sm opacity-90">
                For questions or concerns:{" "}
                <a
                  href="mailto:formella@unisal.it"
                  className="underline hover:no-underline"
                >
                  formella@unisal.it
                </a>
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="study-2"
        className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
      >
        <AccordionTrigger className="p-6 hover:no-underline">
          <div className="text-left">
            <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Study 2: Lived Experiences of Detransitioners
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic font-normal">
              "A transcendental phenomenological qualitative research study to
              better understand the lived experiences of people who have chosen
              to detransition"
            </p>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-6 pt-0">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                Who Can Participate
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    18 years or older
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Have undergone gender transition (social, medical, or
                    administrative)
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Started detransition at least 6 months before this study
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Comfortable participating in a 1-on-1 interview via Zoom
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
                Why This Study Matters
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This study aims to understand the lived experience of
                  individuals who have stopped or reversed their gender
                  transition. The findings will contribute to a more nuanced
                  understanding of gender identity, medical decision-making, and
                  long-term outcomes of gender-related care.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
              What's Involved
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
              <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">
                    ✓
                  </span>
                  Confidential interview lasting approximately 60-90 minutes
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">
                    ✓
                  </span>
                  Share your personal experience and thoughts on transition and
                  detransition
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">
                    ✓
                  </span>
                  Conducted via Zoom for your convenience
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">
                    ✓
                  </span>
                  Screening questionnaire available for initial assessment
                </li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
              Research Team & Ethics
            </h3>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-4">
              <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                <li className="flex items-start">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">
                    🔒
                  </span>
                  IRB approved by Colorado Christian University (IRB
                  #IRB00012085)
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">
                    🔒
                  </span>
                  Confidential interviews with experienced researchers
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">
                    🔒
                  </span>
                  Qualitative methodology focused on understanding your
                  experience
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">
              Share Your Experience Through Interview
            </h3>
            <p className="mb-4">
              This study offers a unique opportunity to share your story in
              depth and contribute to academic understanding of detransition
              experiences.
            </p>
            <div className="space-y-2">
              <p className="font-medium">
                Principal Researcher:{" "}
                <a
                  href="mailto:ppablosebastian1@students.ccu.edu"
                  className="underline hover:no-underline"
                >
                  Pedro Pablo (ppablosebastian1@students.ccu.edu)
                </a>
              </p>
              <p className="font-medium">
                Study Chair:{" "}
                <a
                  href="mailto:sphilip@ccu.edu"
                  className="underline hover:no-underline"
                >
                  Dr. Selin Philip (sphilip@ccu.edu)
                </a>
              </p>
              <p className="text-sm opacity-90 mt-3">
                Screening questionnaire available upon contact
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
