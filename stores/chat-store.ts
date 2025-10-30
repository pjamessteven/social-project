import { ChatHandler } from '@llamaindex/chat-ui'
import { create } from 'zustand'

interface ChatState {
  isDeepResearch: boolean
  chatHandler: ChatHandler | null
  chatStatus: string | null
  setIsDeepResearch: (value: boolean) => void
  setChatHandler: (handler: ChatHandler | null) => void
  setChatStatus: (status: string | null) => void
  sendMessage: (message: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  isDeepResearch: false,
  chatHandler: null,
  chatStatus: null,
  setIsDeepResearch: (value) => set({ isDeepResearch: value }),
  setChatHandler: (handler) => set({ chatHandler: handler }),
  setChatStatus: (status) => set({ chatStatus: status }),
  sendMessage: (message) => {
    const { chatHandler } = get()
    if (chatHandler) {
      chatHandler.sendMessage({ text: message })
    }
  }
}))
