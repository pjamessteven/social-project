import { ChatHandler } from "@llamaindex/chat-ui";
import { create } from "zustand";

interface ChatState {
  isResearch: boolean;
  chatHandler: ChatHandler | null;
  chatStatus: string | null;
  setIsResearch: (value: boolean) => void;
  setChatHandler: (handler: ChatHandler | null) => void;
  setChatStatus: (status: string | null) => void;
  sendMessage: (message: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isResearch: false,
  chatHandler: null,
  chatStatus: "ready",
  setIsResearch: (value) => set({ isResearch: value }),
  setChatHandler: (handler) => set({ chatHandler: handler }),
  setChatStatus: (status) => set({ chatStatus: status }),
  sendMessage: (message) => {
    const { chatHandler } = get();
    if (chatHandler) {
      chatHandler.sendMessage({
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: message }],
      });
    }
  },
}));
