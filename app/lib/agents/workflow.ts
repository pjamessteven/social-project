import {
  agentToolCallEvent,
  agentToolCallResultEvent,
  startAgentEvent,
  WorkflowStream,
  type AgentInputData,
  type Workflow,
  type WorkflowContext,
  type WorkflowEventData,
} from "@llamaindex/workflow";
import { type Metadata, type NodeWithScore } from "llamaindex";
import { artifactEvent, toAgentRunEvent, toSourceEvent } from "./events";
import { type HumanResponseEventData } from "./hitl/index";
import { toInlineAnnotationEvent } from "./inline";

export async function runWorkflow({
  workflow,
  input,
  human,
}: {
  workflow: Workflow;
  input: AgentInputData;
  human?: {
    snapshotId?: string | undefined;
    responses?: HumanResponseEventData[];
  };
}): Promise<WorkflowContext> {
  const context = workflow.createContext();
  context.sendEvent(
    startAgentEvent.with({
      userInput: input.userInput,
      chatHistory: input.chatHistory,
    }),
  );
  return context;
}

export function processWorkflowStream(
  stream: WorkflowStream<WorkflowEventData<unknown>>,
) {
  return stream.pipeThrough(
    new TransformStream<WorkflowEventData<unknown>, WorkflowEventData<unknown>>(
      {
        async transform(event, controller) {
          try {
            let transformedEvent = event;

            if (agentToolCallEvent.include(event)) {
              const inputString = JSON.stringify(event.data.toolKwargs);
              transformedEvent = toAgentRunEvent({
                agent: event.data.agentName,
                text: `Using tool: '${event.data.toolName}' with inputs: '${inputString}'`,
                type: "text",
              });
            } else if (agentToolCallResultEvent.include(event)) {
              const rawOutput = event.data.raw;
              if (
                rawOutput &&
                typeof rawOutput === "object" &&
                "sourceNodes" in rawOutput
              ) {
                const sourceNodes =
                  rawOutput.sourceNodes as unknown as NodeWithScore<Metadata>[];
                transformedEvent = toSourceEvent(sourceNodes);
              }
            } else if (artifactEvent.include(event)) {
              transformedEvent = toInlineAnnotationEvent(event);
            }

            controller.enqueue(transformedEvent);
          } catch (transformError) {
            console.error("Transform stream error:", transformError);
            if (
              transformError instanceof Error &&
              transformError.message.includes(
                "401 No cookie auth credentials found",
              )
            ) {
              controller.error(
                new Error(
                  "Authentication failed: Please check your LLM API credentials",
                ),
              );
              return;
            }
            controller.error(transformError);
          }
        },
      },
    ),
  );
}
