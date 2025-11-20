import { useCallback } from 'react'
import { toast } from 'sonner'

import { generateUUID } from '@/lib/utils'

import { useStore } from '../store'

import { AgentDetails, TeamDetails, type ChatMessage } from '@/types/os'
import { getAgentsAPI, getStatusAPI, getTeamsAPI } from '@/api/os'
import { useQueryState } from 'nuqs'

const useChatActions = () => {
  const { chatInputRef } = useStore()
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const [sessionId, setSessionId] = useQueryState('session')
  const setChatSessions = useStore((state) => state.setChatSessions)
  const setSessionsData = useStore((state) => state.setSessionsData)
  const setMessages = useStore((state) => state.setMessages)
  const setIsEndpointActive = useStore((state) => state.setIsEndpointActive)
  const setIsEndpointLoading = useStore((state) => state.setIsEndpointLoading)
  const setAgents = useStore((state) => state.setAgents)
  const setTeams = useStore((state) => state.setTeams)
  const setSelectedModel = useStore((state) => state.setSelectedModel)
  const setMode = useStore((state) => state.setMode)
  const [agentId, setAgentId] = useQueryState('agent')
  const [teamId, setTeamId] = useQueryState('team')
  const [, setDbId] = useQueryState('db_id')

  const getStatus = useCallback(async () => {
    try {
      const status = await getStatusAPI(selectedEndpoint, authToken)
      return status
    } catch {
      return 503
    }
  }, [selectedEndpoint, authToken])

  const getAgents = useCallback(async () => {
    try {
      const agents = await getAgentsAPI(selectedEndpoint, authToken)
      return agents
    } catch {
      toast.error('Error fetching agents')
      return []
    }
  }, [selectedEndpoint, authToken])

  const getTeams = useCallback(async () => {
    try {
      const teams = await getTeamsAPI(selectedEndpoint, authToken)
      return teams
    } catch {
      toast.error('Error fetching teams')
      return []
    }
  }, [selectedEndpoint, authToken])

  const clearChat = useCallback(() => {
    setMessages([])
    setSessionId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusChatInput = useCallback(() => {
    setTimeout(() => {
      requestAnimationFrame(() => chatInputRef?.current?.focus())
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addMessage = useCallback(
    (message: ChatMessage, explicitSessionId?: string) => {
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages, message]

        // Generate session ID if not exists
        const currentSessionId = explicitSessionId || sessionId || generateUUID()
        if (!sessionId && !explicitSessionId) {
          setSessionId(currentSessionId)
        } else if (explicitSessionId && !sessionId) {
          setSessionId(explicitSessionId)
        }

        // Update chat sessions
        setChatSessions((prev) => ({
          ...prev,
          [currentSessionId]: newMessages
        }))

        // Update sessions list
        setSessionsData((prev) => {
          const existingSessionIndex = prev ? prev.findIndex(s => s.session_id === currentSessionId) : -1
          const timestamp = Date.now()
          const sessionName = newMessages[0]?.content?.slice(0, 50) || 'New Chat'

          if (existingSessionIndex >= 0 && prev) {
            const newSessions = [...prev]
            newSessions[existingSessionIndex] = {
              ...newSessions[existingSessionIndex],
              updated_at: timestamp,
              session_name: sessionName
            }
            return newSessions
          } else {
            return [
              {
                session_id: currentSessionId,
                session_name: sessionName,
                created_at: timestamp,
                updated_at: timestamp
              },
              ...(prev || [])
            ]
          }
        })

        return newMessages
      })
    },
    [setMessages, sessionId, setSessionId, setChatSessions, setSessionsData]
  )

  const initialize = useCallback(async () => {
    setIsEndpointLoading(true)
    try {
      const status = await getStatus()
      let agents: AgentDetails[] = []
      let teams: TeamDetails[] = []
      if (status === 200) {
        setIsEndpointActive(true)
        teams = await getTeams()
        agents = await getAgents()

        if (!agentId && !teamId) {
          const currentMode = useStore.getState().mode

          if (currentMode === 'team' && teams.length > 0) {
            const firstTeam = teams[0]
            setTeamId(firstTeam.id)
            setSelectedModel(firstTeam.model?.provider || '')
            setDbId(firstTeam.db_id || '')
            setAgentId(null)
            setTeams(teams)
          } else if (currentMode === 'agent' && agents.length > 0) {
            const firstAgent = agents[0]
            setMode('agent')
            setAgentId(firstAgent.id)
            setSelectedModel(firstAgent.model?.model || '')
            setDbId(firstAgent.db_id || '')
            setAgents(agents)
          }
        } else {
          setAgents(agents)
          setTeams(teams)
          if (agentId) {
            const agent = agents.find((a) => a.id === agentId)
            if (agent) {
              setMode('agent')
              setSelectedModel(agent.model?.model || '')
              setDbId(agent.db_id || '')
              setTeamId(null)
            } else if (agents.length > 0) {
              const firstAgent = agents[0]
              setMode('agent')
              setAgentId(firstAgent.id)
              setSelectedModel(firstAgent.model?.model || '')
              setDbId(firstAgent.db_id || '')
              setTeamId(null)
            }
          } else if (teamId) {
            const team = teams.find((t) => t.id === teamId)
            if (team) {
              setMode('team')
              setSelectedModel(team.model?.provider || '')
              setDbId(team.db_id || '')
              setAgentId(null)
            } else if (teams.length > 0) {
              const firstTeam = teams[0]
              setMode('team')
              setTeamId(firstTeam.id)
              setSelectedModel(firstTeam.model?.provider || '')
              setDbId(firstTeam.db_id || '')
              setAgentId(null)
            }
          }
        }
      } else {
        setIsEndpointActive(false)
        setMode('agent')
        setSelectedModel('')
        setAgentId(null)
        setTeamId(null)
      }
      return { agents, teams }
    } catch (error) {
      console.error('Error initializing :', error)
      setIsEndpointActive(false)
      setMode('agent')
      setSelectedModel('')
      setAgentId(null)
      setTeamId(null)
      setAgents([])
      setTeams([])
    } finally {
      setIsEndpointLoading(false)
    }
  }, [
    getStatus,
    getAgents,
    getTeams,
    setIsEndpointActive,
    setIsEndpointLoading,
    setAgents,
    setTeams,
    setAgentId,
    setSelectedModel,
    setMode,
    setTeamId,
    setDbId,
    agentId,
    teamId
  ])

  return {
    clearChat,
    addMessage,
    getAgents,
    focusChatInput,
    getTeams,
    initialize
  }
}

export default useChatActions
