import { useStore } from '@/store'
import { useQueryState } from 'nuqs'
import { useEffect, useState } from 'react'
import { SessionEntry } from '@/types/os'
import { truncateText } from '@/lib/utils'
import Icon from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const ChatHistory = () => {
    const {
        sessionsData,
        setSessionsData,
        chatSessions,
        setChatSessions,
        setMessages,
        selectedEndpoint,
        isStreaming
    } = useStore()
    const [sessionId, setSessionId] = useQueryState('session')
    const [, setAgentId] = useQueryState('agent')
    const [, setTeamId] = useQueryState('team')

    const handleSelectSession = (session: SessionEntry) => {
        if (isStreaming) return
        setSessionId(session.session_id)
        const messages = chatSessions[session.session_id] || []
        setMessages(messages)
        setAgentId(null)
        setTeamId(null)
    }

    const handleDeleteSession = (e: React.MouseEvent, session_id: string) => {
        e.stopPropagation()
        if (isStreaming) return

        // Remove from sessionsData
        setSessionsData((prev) =>
            prev ? prev.filter((s) => s.session_id !== session_id) : []
        )

        // Remove from chatSessions
        setChatSessions((prev) => {
            const newState = { ...prev }
            delete newState[session_id]
            return newState
        })

        // If current session is deleted, clear messages
        if (sessionId === session_id) {
            setSessionId(null)
            setMessages([])
        }
    }

    if (!sessionsData || sessionsData.length === 0) {
        return null
    }

    // Sort sessions by updated_at desc
    const sortedSessions = [...sessionsData].sort(
        (a, b) => (b.updated_at || 0) - (a.updated_at || 0)
    )

    return (
        <div className="flex w-full flex-col gap-2 overflow-hidden">
            <div className="text-xs font-medium uppercase text-primary">
                Chats
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20">
                <AnimatePresence initial={false}>
                    {sortedSessions.map((session) => (
                        <motion.div
                            key={session.session_id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div
                                onClick={() => handleSelectSession(session)}
                                className={`group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs transition-colors ${sessionId === session.session_id
                                    ? 'bg-primary/10 text-primary'
                                    : isStreaming
                                        ? 'cursor-not-allowed opacity-50 text-muted-foreground'
                                        : 'cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-primary'
                                    }`}
                            >
                                <div className="flex flex-col gap-0.5 overflow-hidden">
                                    <span className="truncate font-medium">
                                        {truncateText(session.session_name, 25)}
                                    </span>
                                    <span className="text-[10px] opacity-70">
                                        {dayjs(session.updated_at || Date.now()).fromNow()}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-6 w-6 transition-opacity hover:bg-destructive/10 hover:text-destructive ${isStreaming ? 'cursor-not-allowed opacity-0' : 'opacity-0 group-hover:opacity-100'
                                        }`}
                                    disabled={isStreaming}
                                    onClick={(e) => handleDeleteSession(e, session.session_id)}
                                >
                                    <Icon type="trash" size="xs" />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default ChatHistory
