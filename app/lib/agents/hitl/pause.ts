import {
  type WorkflowContext,
  type WorkflowEvent,
} from "@llamaindex/workflow";
import { randomUUID } from "node:crypto";
import type { HumanResponseEventData } from "./events";
import { ensureSnapshotWorkflowContext, saveSnapshot } from "./snapshot";

export const pauseForHumanInput = async (
  context: WorkflowContext,
  responseEvent: WorkflowEvent<HumanResponseEventData>,
  snapshotId: string = randomUUID(),
) => {
  const snapshotWorkflowContext = ensureSnapshotWorkflowContext(context);
  const { snapshot, sendEvent } = snapshotWorkflowContext;

  sendEvent({
    type: "request",
    data: responseEvent,
  });
  const [_, snapshotData] = await snapshot();
  await saveSnapshot(snapshotId, snapshotData);
};
