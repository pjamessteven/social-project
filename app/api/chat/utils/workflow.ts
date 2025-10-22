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
import {
  type Metadata,
  type NodeWithScore,
} from "llamaindex";
import {
  artifactEvent,
  sourceEvent,
  toAgentRunEvent,
  toSourceEvent,
  type SourceEventNode,
} from "./events";
import { downloadFile } from "./file";
import {
  resumeWorkflowFromHumanResponses,
  type HumanResponseEventData,
} from "./hitl/index";
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
  let context: WorkflowContext;

  if (human?.responses?.length && human?.snapshotId) {
    // resume the workflow if there is human response
    console.log(1)
    context = await resumeWorkflowFromHumanResponses(
      workflow,
      human.responses,
      human.snapshotId,
    );
        console.log(2)
  } else {
    // otherwise, create a new empty context and run the workflow with startAgentEvent
        console.log(3)
    context = workflow.createContext();
    context.sendEvent(
      startAgentEvent.with({
        userInput: input.userInput,
        chatHistory: input.chatHistory,
      }),
    );
        console.log(4)
  }

  return context;
}

export function processWorkflowStream(
  stream: WorkflowStream<WorkflowEventData<unknown>>,
) {
  return stream.pipeThrough(
    new TransformStream<WorkflowEventData<unknown>, WorkflowEventData<unknown>>(
      {
        async transform(event, controller) {
          let transformedEvent = event;
          console.log('piping', event)
          // Handle agent events from AgentToolCall
          if (agentToolCallEvent.include(event)) {
                      console.log('piping 1')
            const inputString = JSON.stringify(event.data.toolKwargs);
            transformedEvent = toAgentRunEvent({
              agent: event.data.agentName,
              text: `Using tool: '${event.data.toolName}' with inputs: '${inputString}'`,
              type: "text",
            });
                                  console.log('piping 2')
          }
          // Handle source nodes from AgentToolCallResult
          else if (agentToolCallResultEvent.include(event)) {
                                  console.log('piping 3')
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
                                              console.log('piping 4')
          }
          // Handle artifact events, transform to agentStreamEvent
          else if (artifactEvent.include(event)) {
                                              console.log('piping 5')
            transformedEvent = toInlineAnnotationEvent(event);
                                              console.log('piping 6')
          }


          controller.enqueue(transformedEvent);
        },
      },
    ),
  );
}

