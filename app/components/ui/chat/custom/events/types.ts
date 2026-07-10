import { JSONValue } from "@llamaindex/chat-ui";
import { FunctionComponent } from "react";

export type ComponentDef = {
  type: string;
  comp: FunctionComponent<{ events: JSONValue[] }>;
};
