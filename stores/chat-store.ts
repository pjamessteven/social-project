import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { UIDataTypes, UITools } from "ai";
import { create } from "zustand";

interface ChatState {
  isResearch: boolean;
  chatHandler: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>> | null;
  chatStatus: string | null;
  inputText: string;
  setIsResearch: (value: boolean) => void;
  setChatHandler: (
    handler: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>> | null,
  ) => void;
  setChatStatus: (status: string | null) => void;
  setInputText: (text: string) => void;
  sendMessage: (message: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isResearch: false,
  chatHandler: null,
  chatStatus: "ready",
  inputText: "",
  setIsResearch: (value) => set({ isResearch: value }),
  setChatHandler: (handler) => set({ chatHandler: handler }),
  setChatStatus: (status) => set({ chatStatus: status }),
  setInputText: (text) => set({ inputText: text }),
  sendMessage: async (message) => {
    const { chatHandler, setInputText } = get();
    if (!chatHandler) return;

    try {
      await chatHandler.sendMessage({
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: message }],
      });
    } catch (e) {
      console.log("send message throws");

      // Restore the message text to the input field so user can retry
      setInputText(message);

      // Clear the error state to reset status from "pending" back to "ready"
      chatHandler.clearError();

      // Re-throw the error so the caller can handle it (e.g., captcha flow)
      throw e;
    }
  },
}));
