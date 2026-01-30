import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useChatUI } from "@llamaindex/chat-ui";
import { Markdown } from "@llamaindex/chat-ui/widgets";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useMemo } from "react";

const aggregateEvents = (events) => {
  if (!events || events.length === 0)
    return { retrieve: null, analyze: null, answers: [] };

  // Initialize the result structure
  const result = {
    retrieve: null,
    analyze: null,
    answers: [],
  };

  // Process each event
  events.forEach((event) => {
    const { event: eventType, state, id, question, answer } = event.data;
    if (eventType === "retrieve") {
      // Update retrieve status
      result.retrieve = { state };
    } else if (eventType === "analyze") {
      // Update analyze status
      result.analyze = { state };
    } else if (eventType === "answer" && id) {
      // Find existing answer with the same id or create a new one
      const existingAnswerIndex = result.answers.findIndex((a) => a.id === id);

      if (existingAnswerIndex >= 0) {
        // Update existing answer
        result.answers[existingAnswerIndex] = {
          ...result.answers[existingAnswerIndex],
          state,
          question: question || result.answers[existingAnswerIndex].question,
          answer: answer || result.answers[existingAnswerIndex].answer,
        };
      } else {
        // Add new answer
        result.answers.push({
          id,
          state,
          question,
          answer,
        });
      }
    }
  });

  return result;
};

export default function Component({ events }) {
  const t = useTranslations("deepResearchEvents");

  const aggregatedEvents = useMemo(() => aggregateEvents(events), [events]);

  const { retrieve, analyze, answers } = aggregatedEvents;
  const { isLoading } = useChatUI();

  // Helper function to get status icon
  const getStatusIcon = (state) => {
    switch (state) {
      case "pending":
        return <Clock className="h-4 w-4 text-gray-400" />;
      case "inprogress":
        return (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-100" />
        );
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Helper function to get status color class
  const getStatusColorClass = (state) => {
    switch (state) {
      case "pending":
        return "bg-gray-200";
      case "inprogress":
        return "bg-blue-500";
      case "done":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-200";
    }
  };

  // true if any step is currently running
  const isRunningAnalysis =
    retrieve?.state === "inprogress" ||
    analyze?.state === "inprogress" ||
    answers.some((a) => a.state === "inprogress");

  const allAnswersComplete =
    answers.some((a) => a.state === "inprogress") == false;

  const isAnsweringQuestions =
    retrieve?.state == "done" &&
    analyze?.state == "done" &&
    !allAnswersComplete;

  const isError = useMemo(() => {
    if (retrieve?.state === "error") {
      return t("retrieveError");
    } else if (analyze?.state === "error") {
      return t("analyzeError");
    }
  }, [retrieve, analyze, t]);

  const thinkingStatus = useMemo(() => {
    if (isError) {
      return t("errorTitle");
    } else if (retrieve?.state === "inprogress") {
      return t("retrieving");
    } else if (
      analyze?.state === "inprogress" &&
      (!answers ||
        answers?.length === 0 ||
        (answers?.length > 0 && !allAnswersComplete))
    ) {
      return t("generatingQuestions");
    } else if (!allAnswersComplete || isRunningAnalysis) {
      return t("findingAnswers");
    } else {
      return t("completed");
    }
  }, [retrieve?.state, analyze?.state, answers, isRunningAnalysis, t, isError]);

  return (
    <div className="not-prose text-foreground mx-auto mb-8 w-full max-w-4xl space-y-4 rounded-xl transition-colors duration-300">
      {/* Header */}
      <div className="-mx-4 -mt-4 mb-2 flex items-center justify-start rounded-tl-xl rounded-tr-xl px-4 pt-2 md:-mt-0">
        <h1 className="text-foreground text-base font-semibold md:text-lg">
          {thinkingStatus}
        </h1>
        {isError ? (
          <AlertCircle className="ml-2 h-4 w-4 text-red-500" />
        ) : isRunningAnalysis ? (
          <Loader2 className="ml-2 h-4 w-4 animate-spin text-blue-500 dark:text-blue-100" />
        ) : (
          <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
        )}
      </div>
      {isError && <h4>{isError}</h4>}

      {/* Answer Panel */}
      {answers.length > 0 && (
        <>
          <Accordion type="multiple" className="w-full">
            {answers.map((answer, index) => (
              <AccordionItem
                key={answer.id}
                value={answer.id}
                className={cn("border-border border-b duration-300")}
              >
                <AccordionTrigger className="!hover:no-underline py-2 !no-underline transition-colors duration-300 sm:py-3">
                  <div className="relative flex grow items-center justify-between space-x-3 text-left">
                    <div className="flex-1 pr-2">
                      <p
                        className={cn(
                          "text-muted-foreground hover:text-foreground pr-2 text-base font-medium italic no-underline transition-colors transition-opacity",
                          answer.state === "inprogress"
                            ? "opacity-50"
                            : "opacity-100",
                        )}
                      >
                        <div className="text-muted-foreground hover:text-foreground no-wrap flex cursor-pointer flex-row items-start text-base italic opacity-90 transition-colors sm:text-base">
                          <div className="mr-2 whitespace-nowrap">{"->"}</div>
                          <div className="hover:underline">
                            {answer.question}
                          </div>
                        </div>
                      </p>
                    </div>
                    {answer.state !== "done" &&
                      answer.state !== "inprogress" && (
                        <div
                          className={cn(
                            "absolute top-0 -right-4 ml-auto flex shrink-0 items-center space-x-1 no-underline",
                            answer.state === "inprogress"
                              ? "text-primary"
                              : answer.state === "done"
                                ? "text-green-500"
                                : answer.state === "error"
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                          )}
                        >
                          {getStatusIcon(answer.state)}
                        </div>
                      )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose:dark bg-secondary -mx-4 min-w-full px-4 pt-2 pb-4 sm:mx-0">
                  <div className="">
                    {answer.answer ? (
                      <Markdown content={answer.answer} className="" />
                    ) : (
                      <div className="text-muted-foreground flex items-center justify-center p-4">
                        {answer.state === "inprogress" ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-100" />
                            <span>{t("generatingAnswer")}</span>
                          </div>
                        ) : (
                          <span>{t("waitingForAnswer")}</span>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mb-2 mb-4 flex items-center justify-between">
            <div className="text-muted-foreground flex items-center text-sm">
              {isLoading && !isRunningAnalysis ? (
                <>
                  <div>{t("generatingSummary")}</div>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin text-blue-500 dark:text-blue-100" />
                </>
              ) : (
                <div>
                  {t("questionsAnswered", {
                    answered: answers.filter((a) => a.state === "done").length,
                    total: answers.length,
                  })}
                </div>
              )}
            </div>

            <Progress
              value={
                (answers.filter((a) => a.state === "done").length /
                  answers.length) *
                100
              }
              className="bg-muted h-2 w-1/4"
            />
          </div>
        </>
      )}
    </div>
  );
}
