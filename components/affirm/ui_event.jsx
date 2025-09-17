import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
import { useEffect, useState } from "react";

export default function Component({ events }) {
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
          (a) => a.id === id
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

  const [aggregatedEvents, setAggregatedEvents] = useState({
    retrieve: null,
    analyze: null,
    answers: [],
  });

  useEffect(() => {
    setAggregatedEvents(aggregateEvents(events));
  }, [events]);

  const { retrieve, analyze, answers } = aggregatedEvents;

  // Helper function to get status icon
  const getStatusIcon = (state) => {
    switch (state) {
      case "pending":
        return <Clock className="h-4 w-4 text-gray-400" />;
      case "inprogress":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-100" />;
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
  const isRunning =
    retrieve?.state === "inprogress" ||
    analyze?.state === "inprogress" ||
    answers.some((a) => a.state === "inprogress");

  return (
    <div className="mx-auto w-full max-w-4xl mb-8 space-y-4 text-foreground rounded-xl transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 md:mb-1 -mb-0 -mx-4 px-4 md:-mt-4 -mt-6 rounded-tr-xl rounded-tl-xl">
        <h1 className="md:text-lg text-base font-semibold text-foreground">
          Question Expansion
        </h1>
        {isRunning && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
      </div>

      {/* Collapsible details section */}
      <Accordion type="single" collapsible defaultValue="details">
        <AccordionItem value="details" className="border rounded-xl">
          <AccordionTrigger className="px-4 py-2 text-sm font-medium">
            Details
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
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
                  : "border-border"
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserSearch className="h-5 w-5 mr-2 text-muted-foreground" />
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
                        : "text-muted-foreground"
                    )}
                  >
                    {getStatusIcon(retrieve?.state)}
                  </div>
                </div>
                <CardDescription>
                  Retrieving trans experiences that are most relevant to
                  your query.
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
                    : "border-border"
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Glasses className="h-5 w-5 mr-2 text-muted-foreground" />
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
                          : "text-muted-foreground"
                      )}
                    >
                      {getStatusIcon(analyze?.state)}
                    </div>
                  </div>
                  <CardDescription>
                    {analyze?.state === 'error' ? "Error: Daily rate limit reached. You can ask 10 new questions that aren't already in the cache per day. This is to prevent abuse of the system and give everyone fair access. Try some of the questions from the portal, or come back tomorrow :)" : 'Analyzing experiences and generating meta questions.'}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Answer Panel */}
            {analyze?.state === "done" && answers.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 mr-2 text-muted-foreground" />
                    <CardTitle className="text-foreground">
                      Meta Questions & Answers
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Answering meta questions with real trans experiences & perspectives.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full not-prose">
                    {answers.map((answer, index) => (
                      <AccordionItem
                        key={answer.id}
                        value={answer.id}
                        className={cn(
                          "mb-4 rounded-lg border border-border transition-colors duration-300",
                          answer.state === "inprogress"
                            ? "bg-accent/50"
                            : answer.state === "done"
                            ? " dark:bg-gray-700/70"
                            : answer.state === "error"
                            ? "bg-destructive/10"
                            : "bg-muted/50"
                        )}
                      >
                        <AccordionTrigger className="px-4 py-3  hover:bg-accent/50 transition-colors duration-300">
                          <div className="relative flex items-center justify-between grow space-x-3 text-left">
                            <div className="flex-1">
                              <p className="italic text-foreground font-normal   text-sm md:text-base ">
                                {"-> "}{answer.question}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "ml-auto  absolute top-0 -right-4 flex shrink-0 items-center space-x-1 no-underline",
                                answer.state === "inprogress"
                                  ? "text-primary"
                                  : answer.state === "done"
                                  ? "text-green-500"
                                  : answer.state === "error"
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              )}
                            >
                              {getStatusIcon(answer.state)}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-1 prose prose:dark">
                          <div className="rounded-md p-3 text-base">
                            {answer.answer ? (
                              <Markdown content={answer.answer} />
                            ) : (
                              <div className="flex items-center justify-center p-4 text-muted-foreground">
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
                  <div className="text-sm text-muted-foreground">
                    {answers.filter((a) => a.state === "done").length} of{" "}
                    {answers.length} questions answered
                  </div>
                  <Progress
                    value={
                      (answers.filter((a) => a.state === "done").length /
                        answers.length) *
                      100
                    }
                    className="h-2 w-1/3 bg-muted"
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
