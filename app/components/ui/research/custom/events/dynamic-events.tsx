"use client";

import {
  ArtifactPartType,
  EventPartType,
  FilePartType,
  getParts,
  JSONValue,

  MessagePart,

  SourcesPartType,

  SuggestionPartType,

  TextPartType,

  useChatMessage,
} from "@llamaindex/chat-ui";
import React, { useEffect, useRef, useState } from "react";
import { DynamicComponentErrorBoundary } from "./error-boundary";
import { ComponentDef } from "./types";

type EventComponent = ComponentDef & {
  events: JSONValue[];
};

// image, document_file, sources, events, suggested_questions, agent
const BUILT_IN_CHATUI_COMPONENTS = [TextPartType, FilePartType, ArtifactPartType, EventPartType, SourcesPartType, SuggestionPartType]

export const DynamicEvents = ({
  componentDefs,
  appendError,
}: {
  componentDefs: ComponentDef[];
  appendError: (error: string) => void;
}) => {
  const { message } = useChatMessage();
  const parts = message.parts;

  const shownWarningsRef = useRef<Set<string>>(new Set()); // track warnings
  const [hasErrors, setHasErrors] = useState(false);

  const handleError = (error: string) => {
    setHasErrors(true);
    appendError(error);
  };

  // Check for missing components in annotations
  useEffect(() => {
    if (!parts?.length) return;

    const availableComponents = new Set(componentDefs.map((comp) => comp.type));

    parts.forEach((item: JSONValue) => {
      const part = item as MessagePart;
      const type = part.type;
      if (!type) return; // Skip if annotation doesn't have a type

      const events = getParts(message, type);

      // Skip if it's a built-in component or if we've already shown the warning
      if (
        BUILT_IN_CHATUI_COMPONENTS.includes(type) ||
        shownWarningsRef.current.has(type)
      ) {
        return;
      }

      // If we have events for a type but no component definition, show a warning
      if (events && !availableComponents.has(type)) {
        console.warn(
          `No component found for event type: ${type} or having error when rendering it. Ensure there is a component file named ${type}.tsx or ${type}.jsx in your components directory, and verify the code for any errors.`,
        );
        shownWarningsRef.current.add(type);
      }
    });
  }, [parts, componentDefs]);

  const components: EventComponent[] = componentDefs
    .map((comp) => {
      const events = getParts(message, comp.type);
      if (!events?.length) return null;
      return { ...comp, events };
    })
    .filter((comp) => comp !== null);

  if (components.length === 0) return null;
  if (hasErrors) return null;

  return (
    <div className="components-container">
      {components.map((component, index) => {
        return (
          <React.Fragment key={`${component.type}-${index}`}>
            {renderEventComponent(component, handleError)}
          </React.Fragment>
        );
      })}
    </div>
  );
};

function renderEventComponent(
  component: EventComponent,
  appendError: (error: string) => void,
) {
  return (
    <DynamicComponentErrorBoundary
      onError={appendError}
      eventType={component.type}
    >
      {React.createElement(component.comp, { events: component.events })}
    </DynamicComponentErrorBoundary>
  );
}
