import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  AgentDetails,
  SessionEntry,
  TeamDetails,
  type ChatMessage
} from '@/types/os'

interface Store {
  hydrated: boolean
  setHydrated: () => void
  streamingErrorMessage: string
  setStreamingErrorMessage: (streamingErrorMessage: string) => void
  endpoints: {
    endpoint: string
    id__endpoint: string
  }[]
  setEndpoints: (
    endpoints: {
      endpoint: string
      id__endpoint: string
    }[]
  ) => void
  isStreaming: boolean
  setIsStreaming: (isStreaming: boolean) => void
  isEndpointActive: boolean
  setIsEndpointActive: (isActive: boolean) => void
  isEndpointLoading: boolean
  setIsEndpointLoading: (isLoading: boolean) => void
  messages: ChatMessage[]
  setMessages: (
    messages: ChatMessage[] | ((prevMessages: ChatMessage[]) => ChatMessage[])
  ) => void
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>
  selectedEndpoint: string
  setSelectedEndpoint: (selectedEndpoint: string) => void
  authToken: string
  setAuthToken: (authToken: string) => void
  agents: AgentDetails[]
  setAgents: (agents: AgentDetails[]) => void
  teams: TeamDetails[]
  setTeams: (teams: TeamDetails[]) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  mode: 'agent' | 'team'
  setMode: (mode: 'agent' | 'team') => void
  sessionsData: SessionEntry[] | null
  setSessionsData: (
    sessionsData:
      | SessionEntry[]
      | ((prevSessions: SessionEntry[] | null) => SessionEntry[] | null)
  ) => void
  isSessionsLoading: boolean
  setIsSessionsLoading: (isSessionsLoading: boolean) => void
  isChatLoading: boolean
  setIsChatLoading: (isChatLoading: boolean) => void
  useWebSocket: boolean
  setUseWebSocket: (useWebSocket: boolean) => void
  inputMessage: string
  setInputMessage: (inputMessage: string) => void
  submitMessage: (() => void) | null
  setSubmitMessage: (submitFn: (() => void) | null) => void
  chatSessions: Record<string, ChatMessage[]>
  setChatSessions: (
    chatSessions:
      | Record<string, ChatMessage[]>
      | ((
        prev: Record<string, ChatMessage[]>
      ) => Record<string, ChatMessage[]>)
  ) => void
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: (isCollapsed: boolean) => void
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      streamingErrorMessage: '',
      setStreamingErrorMessage: (streamingErrorMessage) =>
        set(() => ({ streamingErrorMessage })),
      endpoints: [],
      setEndpoints: (endpoints) => set(() => ({ endpoints })),
      isStreaming: false,
      setIsStreaming: (isStreaming) => set(() => ({ isStreaming })),
      isEndpointActive: false,
      setIsEndpointActive: (isActive) =>
        set(() => ({ isEndpointActive: isActive })),
      isEndpointLoading: true,
      setIsEndpointLoading: (isLoading) =>
        set(() => ({ isEndpointLoading: isLoading })),
      messages: [],
      setMessages: (messages) =>
        set((state) => ({
          messages:
            typeof messages === 'function' ? messages(state.messages) : messages
        })),
      chatInputRef: { current: null },
      selectedEndpoint: process.env.NEXT_PUBLIC_AGENTOS_URL || 'http://localhost:9000',
      setSelectedEndpoint: (selectedEndpoint) =>
        set(() => ({ selectedEndpoint })),
      authToken: '',
      setAuthToken: (authToken) => set(() => ({ authToken })),
      agents: [],
      setAgents: (agents) => set({ agents }),
      teams: [],
      setTeams: (teams) => set({ teams }),
      selectedModel: '',
      setSelectedModel: (selectedModel) => set(() => ({ selectedModel })),
      mode: 'agent',
      setMode: (mode) => set(() => ({ mode })),
      sessionsData: null,
      setSessionsData: (sessionsData) =>
        set((state) => ({
          sessionsData:
            typeof sessionsData === 'function'
              ? sessionsData(state.sessionsData)
              : sessionsData
        })),
      isSessionsLoading: false,
      setIsSessionsLoading: (isSessionsLoading) =>
        set(() => ({ isSessionsLoading })),
      isChatLoading: false,
      setIsChatLoading: (isChatLoading) => set(() => ({ isChatLoading })),
      useWebSocket: true,
      setUseWebSocket: (useWebSocket) => set(() => ({ useWebSocket })),
      inputMessage: '',
      setInputMessage: (inputMessage) => set(() => ({ inputMessage })),
      submitMessage: null,
      setSubmitMessage: (submitFn) => set(() => ({ submitMessage: submitFn })),
      chatSessions: {},
      setChatSessions: (chatSessions) =>
        set((state) => ({
          chatSessions:
            typeof chatSessions === 'function'
              ? chatSessions(state.chatSessions)
              : chatSessions
        })),
      isSidebarCollapsed: false,
      setIsSidebarCollapsed: (isSidebarCollapsed) =>
        set(() => ({ isSidebarCollapsed }))
    }),
    {
      name: 'chat-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        useWebSocket: state.useWebSocket,
        sessionsData: state.sessionsData,
        chatSessions: state.chatSessions
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.()
      }
    }
  )
)
