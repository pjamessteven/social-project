import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Markdown } from "@llamaindex/chat-ui/widgets";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Glasses,
  Loader2,
  MessageSquare,
  UserSearch,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
    const { event: eventType, state, id, question, answer } = event;

    if (eventType === "retrieve") {
      // Update retrieve status
      result.retrieve = { state };
    } else if (eventType === "analyze") {
      // Update analyze status
      result.analyze = { state };
    } else if (eventType === "answer" && id) {
      // Find existing answer with the same id or create a new one
      const existingAnswerIndex = result.answers.findIndex(
        (a) => a.id === id,
      );

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

  const aggregatedEvents = useMemo(() => aggregateEvents(events), [events]);

  const { retrieve, analyze, answers } = aggregatedEvents;

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

  // State to cycle through answer questions
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);

  // true if any step is currently running
  const isRunning =
    retrieve?.state === "inprogress" ||
    analyze?.state === "inprogress" ||
    answers.some((a) => a.state === "inprogress");

  const isCyclingMetaQuestions = currentAnswerIndex + 1 < answers.length;

  const allAnswersComplete =
    answers.some((a) => a.state === "inprogress") == false;

  const isAnsweringQuestions =
    retrieve?.state == "done" &&
    analyze?.state == "done" &&
    !allAnswersComplete;

  // Effect to cycle through answer questions every 5 seconds when not retrieving or analyzing
  useEffect(() => {
    if (
      retrieve?.state !== "inprogress" &&
      analyze?.state !== "inprogress" &&
      answers.length > 0
    ) {
      const interval = setInterval(() => {
        if (isCyclingMetaQuestions) {
          // cycle through once
          setCurrentAnswerIndex(
            (prevIndex) => (prevIndex + 1) % answers.length,
          );
        }
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [
    retrieve?.state,
    analyze?.state,
    answers.length,
    isRunning,
    isCyclingMetaQuestions,
  ]);

  const thinkingStatus = useMemo(() => {
    if (retrieve?.state === "inprogress") {
      return "Retrieving transgender experiences that are most relevant to your query.";
    } else if (analyze?.state === "inprogress") {
      return "Analyzing experiences and generating meta questions.";
    } else if (answers.length > 0 && isCyclingMetaQuestions) {
      // Cycle through answer questions every 5 seconds
      return "Meta question: \n" + answers[currentAnswerIndex]?.question || "";
    } else if (isRunning && !isCyclingMetaQuestions) {
      return "Summarising findings...";
    } else {
      return "Deep analysis completed";
    }
  }, [
    retrieve?.state,
    analyze?.state,
    answers,
    isRunning,
    currentAnswerIndex,
    isCyclingMetaQuestions,
  ]);

  return (
    <div className="not-prose text-foreground mx-auto w-full max-w-4xl space-y-4 rounded-xl transition-colors duration-300">
      {/* Header */}
      <div className="-mx-4 -mt-6 mb-4 flex items-center justify-start rounded-tl-xl rounded-tr-xl px-4 pt-2 md:-mt-4">
        <h1 className="text-foreground text-base font-semibold md:text-lg">
          Analysing transgender Experiences
        </h1>
        {isRunning || isCyclingMetaQuestions ? (
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
        )}
      </div>

      {/* Collapsible details section */}
      <Accordion type="single" collapsible defaultValue="">
        <AccordionItem value="details" className="rounded-xl border dark:border-gray-800 dark:bg-gray-900">
          <AccordionTrigger className="px-4 py-4 text-base font-medium italic opacity-70">
            {thinkingStatus}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 px-4 pt-1 pb-4">
            {/* Retrieve Panel */}
            <Card
              className={cn(
                "border transition-all duration-300",
                retrieve?.state === "inprogress"
                  ? "border-primary shadow-lg"
                  : retrieve?.state === "done"
                    ? "border-green-500"
                    : retrieve?.state === "error"
                      ? "border-destructive"
                      : "border-border",
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserSearch className="text-muted-foreground mr-2 h-5 w-5" />
                    <CardTitle className="text-foreground">
                      Find Experiences
                    </CardTitle>
                  </div>
                  <div
                    className={cn(
                      "flex items-center space-x-1 no-underline",
                      retrieve?.state === "inprogress"
                        ? "text-primary"
                        : retrieve?.state === "done"
                          ? "text-green-500"
                          : retrieve?.state === "error"
                            ? "text-destructive"
                            : "text-muted-foreground",
                    )}
                  >
                    {getStatusIcon(retrieve?.state)}
                  </div>
                </div>
                <CardDescription>
                  Retrieving transgender experiences that are most relevant to your
                  query.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Analyze Panel */}
            {retrieve?.state === "done" && (
              <Card
                className={cn(
                  "border transition-all duration-300",
                  analyze?.state === "inprogress"
                    ? "border-primary shadow-lg"
                    : analyze?.state === "done"
                      ? "border-green-500"
                      : analyze?.state === "error"
                        ? "border-destructive"
                        : "border-border",
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Glasses className="text-muted-foreground mr-2 h-5 w-5" />
                      <CardTitle className="text-foreground">
                        Analyze Experiences
                      </CardTitle>
                    </div>
                    <div
                      className={cn(
                        "flex items-center space-x-1 no-underline",
                        analyze?.state === "inprogress"
                          ? "text-primary"
                          : analyze?.state === "done"
                            ? "text-green-500"
                            : analyze?.state === "error"
                              ? "text-destructive"
                              : "text-muted-foreground",
                      )}
                    >
                      {getStatusIcon(analyze?.state)}
                    </div>
                  </div>
                  <CardDescription>
                    {analyze?.state === "error"
                      ? "Error: Daily rate limit reached. You can ask 10 new questions that aren't already in the cache per day. This is to prevent abuse of the system and give everyone fair access. Try some of the questions from the portal, or come back tomorrow :)"
                      : "Analyzing experiences and generating meta questions."}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Answer Panel */}
            {analyze?.state === "done" && answers.length > 0 && (
              <Card className={cn(allAnswersComplete && "border-green-500")}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="text-muted-foreground mr-2 h-5 w-5" />
                      <CardTitle className="text-foreground">
                        Meta Questions & Answers
                      </CardTitle>
                    </div>
                    <div
                      className={cn(
                        "flex items-center space-x-1 no-underline",
                        isAnsweringQuestions
                          ? "text-primary"
                          : allAnswersComplete
                            ? "text-green-500"
                            : "",
                      )}
                    >
                      {getStatusIcon(
                        isAnsweringQuestions
                          ? "inprogress"
                          : allAnswersComplete
                            ? "done"
                            : "pending",
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    Answering meta questions with real transgender experiences &
                    perspectives.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pt-0 pb-2 sm:px-6">
                  <Accordion type="multiple" className="w-full">
                    {answers.map((answer, index) => (
                      <AccordionItem
                        key={answer.id}
                        value={answer.id}
                        className={cn(
                          "border-border mb-4 rounded-lg border transition-colors duration-300",
                          answer.state === "inprogress"
                            ? "bg-accent/50"
                            : answer.state === "done"
                              ? "dark:bg-gray-700/70"
                              : answer.state === "error"
                                ? "bg-destructive/10"
                                : "bg-muted/50",
                        )}
                      >
                        <AccordionTrigger className="hover:bg-accent/50 px-4 py-3 transition-colors duration-300">
                          <div className="relative flex grow items-center justify-between space-x-3 text-left">
                            <div className="flex-1 pr-2">
                              <p className="text-foreground text-sm font-normal italic">
                                {"-> "}
                                {answer.question}
                              </p>
                            </div>
                            {answer.state !== "done" && (
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
                        <AccordionContent className="prose prose:dark px-4 pt-1 pb-4">
                          <div className="rounded-md md:p-3">
                            {answer.answer ? (
                              <Markdown
                                content={answer.answer}
                                className="text-sm"
                              />
                            ) : (
                              <div className="text-muted-foreground flex items-center justify-center p-4">
                                {answer.state === "inprogress" ? (
                                  <div className="flex items-center space-x-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Generating answer...</span>
                                  </div>
                                ) : (
                                  <span>Waiting for answer</span>
                                )}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-muted-foreground text-sm">
                    {answers.filter((a) => a.state === "done").length} of{" "}
                    {answers.length} questions answered
                  </div>
                  <Progress
                    value={
                      (answers.filter((a) => a.state === "done").length /
                        answers.length) *
                      100
                    }
                    className="bg-muted h-2 w-1/3"
                  />
                </CardFooter>
              </Card>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
