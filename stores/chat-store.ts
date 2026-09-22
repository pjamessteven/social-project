import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { UIDataTypes, UITools } from "ai";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ChatState {
  includeTransPerspectives: boolean;
  wikiUpdateMode: boolean;
  proModel: boolean;
  chatHandler: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>> | null;
  chatStatus: string | null;
  inputText: string;
  setIncludeTransPerspectives: (value: boolean) => void;
  setWikiUpdateMode: (value: boolean) => void;
  setProModel: (value: boolean) => void;
  setChatHandler: (
    handler: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>> | null,
  ) => void;
  setChatStatus: (status: string | null) => void;
  setInputText: (text: string) => void;
  sendMessage: (message: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      includeTransPerspectives: false,
      wikiUpdateMode: false,
      proModel: false,
      chatHandler: null,
      chatStatus: "ready",
      inputText: "",
      setIncludeTransPerspectives: (value) =>
        set({ includeTransPerspectives: value }),
      setWikiUpdateMode: (value) => set({ wikiUpdateMode: value }),
      setProModel: (value) => set({ proModel: value }),
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
    }),
    {
      name: "chat-bar-prefs",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only the user's chat-bar preferences survive reloads — never the
      // live handler/status/input state.
      partialize: (state) => ({
        includeTransPerspectives: state.includeTransPerspectives,
        wikiUpdateMode: state.wikiUpdateMode,
        proModel: state.proModel,
      }),
    },
  ),
);
