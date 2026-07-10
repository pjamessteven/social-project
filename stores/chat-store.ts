import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { UIDataTypes, UITools } from "ai";
import { create } from "zustand";

interface ChatState {
  includeTransPerspectives: boolean;
  chatHandler: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>> | null;
  chatStatus: string | null;
  inputText: string;
  setIncludeTransPerspectives: (value: boolean) => void;
  setChatHandler: (
    handler: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>> | null,
  ) => void;
  setChatStatus: (status: string | null) => void;
  setInputText: (text: string) => void;
  sendMessage: (message: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  includeTransPerspectives: false,
  chatHandler: null,
  chatStatus: "ready",
  inputText: "",
  setIncludeTransPerspectives: (value) =>
    set({ includeTransPerspectives: value }),
  setChatHandler: (handler) => set({ chatHandler: handler }),
  setChatStatus: (status) => set({ chatStatus: status }),
  setInputText: (text) => set({ inputText: text }),
  sendMessage: async (message) => {
    const { chatHandler } = get();
    if (!chatHandler) return;

    // Let errors propagate to be handled by the component's error handler
    await chatHandler.sendMessage({
      id: `user-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text: message }],
    });
  },
}));
