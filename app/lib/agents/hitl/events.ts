import {
  type WorkflowEvent,
  type WorkflowEventData,
  workflowEvent,
} from "@llamaindex/workflow";
import type { JSONValue } from "llamaindex";
import z from "zod";

export type HumanInputEventData = {
  type: string;
  data?: JSONValue;
  response: WorkflowEvent<HumanResponseEventData>;
};

export const humanInputEvent = workflowBaseEvent<HumanInputEventData>();

export type HumanResponseEventData = {
  type: "human_response";
  data?: JSONValue;
};

export const humanResponseEvent = workflowBaseEvent<HumanResponseEventData>();

export type BaseEvent<K> = (<T extends K>() => WorkflowEvent<T>) &
  WorkflowEvent<K>;

export function workflowBaseEvent<K = unknown>(): BaseEvent<K> {
  const baseEvent = workflowEvent<K>();
  const derivedEvents = new Set<WorkflowEvent<unknown>>();

  function eventFn<T>(): WorkflowEvent<T> {
    const event = workflowEvent<T>();
    derivedEvents.add(event);
    return event;
  }

  const originalInclude = baseEvent.include;
  const enhancedBaseEvent = Object.assign(baseEvent, {
    include: (
      instance: WorkflowEventData<unknown>,
    ): instance is WorkflowEventData<void> => {
      return (
        originalInclude(instance) ||
        Array.from(derivedEvents).some((e) => e.include(instance))
      );
    },
  });

  return Object.assign(eventFn, enhancedBaseEvent) as typeof eventFn &
    typeof baseEvent;
}
