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
    snapshotId?: string | undefined; // the snapshot id to restore workflow
    responses?: HumanResponseEventData[]; // the data from human to trigger events after restoring
  };
}): Promise<WorkflowContext> {
  // create a new empty context and run the workflow with startAgentEvent
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

            // Handle agent events from AgentToolCall
            if (agentToolCallEvent.include(event)) {
              const inputString = JSON.stringify(event.data.toolKwargs);
              transformedEvent = toAgentRunEvent({
                agent: event.data.agentName,
                text: `Using tool: '${event.data.toolName}' with inputs: '${inputString}'`,
                type: "text",
              });
            }
            // Handle source nodes from AgentToolCallResult
            else if (agentToolCallResultEvent.include(event)) {
              const rawOutput = event.data.raw;
              if (
                rawOutput &&
                typeof rawOutput === "object" &&
                "sourceNodes" in rawOutput // TODO: better use Zod to validate and extract sourceNodes from toolCallResult
              ) {
                const sourceNodes =
                  rawOutput.sourceNodes as unknown as NodeWithScore<Metadata>[];
                transformedEvent = toSourceEvent(sourceNodes);
              }
            }
            // Handle artifact events, transform to agentStreamEvent
            else if (artifactEvent.include(event)) {
              transformedEvent = toInlineAnnotationEvent(event);
            }

            controller.enqueue(transformedEvent);
          } catch (transformError) {
            console.error("Transform stream error:", transformError);
            
            // Handle specific LLM authentication errors
            if (transformError instanceof Error && transformError.message.includes('401 No cookie auth credentials found')) {
              console.error("LLM authentication failed in transform stream");
              controller.error(new Error("Authentication failed: Please check your LLM API credentials"));
              return;
            }
            
            // Re-throw other errors
            controller.error(transformError);
          }
        },
      },
    ),
  );
}
