"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { Study } from "@/app/types/study";

interface StudyDetailViewProps {
  study: Study;
  locale: string;
}

export function StudyDetailView({ study, locale }: StudyDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">
          {study.headline || study.title || "Untitled Study"}
        </h1>
        {study.headline && study.title && study.headline !== study.title && (
          <p className="mt-3 text-lg text-gray-600 italic dark:text-gray-400">
            {study.title}
          </p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {study.tags &&
          study.tags.length > 0 &&
          study.tags.map((tag) => (
            <span
              key={tag}
              className="font- inline-flex items-center rounded-full border bg-gray-100 px-2 py-1 text-sm text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
      </div>

      {/* Metadata */}
      <div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {study.authors && (
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                Authors
              </dt>
              <dd>{study.authors}</dd>
            </div>
          )}
          {study.year && (
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                Year
              </dt>
              <dd>{study.year}</dd>
            </div>
          )}
          {study.journal && (
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                Journal
              </dt>
              <dd>{study.journal}</dd>
            </div>
          )}
          {study.url && (
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                Source
              </dt>
              <dd>
                <a
                  href={study.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {study.displayUrl || study.url}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Limitations */}
      {study.limitations && study.limitations.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
          <h2 className="mb-2 text-sm font-semibold text-red-800 dark:text-red-200">
            Methodological Limitations
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-700 dark:text-red-300">
            {study.limitations.map((limitation, i) => (
              <li key={i}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Points */}
      {study.keyPoints && study.keyPoints.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Key Findings</h2>
          <ul className="list-disc space-y-1 pl-5">
            {study.keyPoints.map((point, i) => (
              <li key={i} className="text-gray-800 dark:text-gray-200">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable sections */}
      <Accordion type="multiple" className="w-full">
        {study.summary && (
          <AccordionItem value="summary">
            <AccordionTrigger className="text-left hover:no-underline">
              <span className="text-base font-semibold">Summary</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {study.summary}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}
        {study.abstract && (
          <AccordionItem value="abstract">
            <AccordionTrigger className="text-left hover:no-underline">
              <span className="text-base font-semibold">Abstract</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {study.abstract}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}

        {study.conclusion && (
          <AccordionItem value="conclusion">
            <AccordionTrigger className="text-left hover:no-underline">
              <span className="text-base font-semibold">Conclusion</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {study.conclusion}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
