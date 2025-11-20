'use client'
import { Button } from '@/components/ui/button'
import useChatActions from '@/hooks/useChatActions'
import useAuthToken from '@/hooks/useAuthToken'
import { useStore } from '@/store'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Icon from '@/components/ui/icon'
import { getProviderIcon } from '@/lib/modelProvider'
import ChatHistory from './ChatHistory'
import { useQueryState } from 'nuqs'
import { Skeleton } from '@/components/ui/skeleton'


const SidebarHeader = () => (
  <div className="flex items-center gap-2">
    <Icon type="agno" size="xs" />
    <span className="text-xs font-medium uppercase text-white">Agent UI</span>
  </div>
)

const NewChatButton = ({
  disabled,
  onClick
}: {
  disabled: boolean
  onClick: () => void
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    size="lg"
    className="h-9 w-full rounded-xl bg-primary text-xs font-medium text-background hover:bg-primary/80"
  >
    <Icon type="plus-icon" size="xs" className="text-background" />
    <span className="uppercase">New Chat</span>
  </Button>
)

const ModelDisplay = ({ model }: { model: string }) => (
  <div className="flex h-9 w-full items-center gap-3 rounded-xl border border-primary/15 bg-accent p-3 text-xs font-medium uppercase text-muted">
    {(() => {
      const icon = getProviderIcon(model)
      return icon ? <Icon type={icon} className="shrink-0" size="xs" /> : null
    })()}
    {model}
  </div>
)



const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { clearChat, focusChatInput, initialize } = useChatActions()
  const {
    messages,
    selectedEndpoint,
    isEndpointActive,
    selectedModel,
    hydrated,
    isEndpointLoading,
    mode
  } = useStore()
  const [isMounted, setIsMounted] = useState(false)
  const [agentId] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [isMobile, setIsMobile] = useState(false)

  // Initialize auto token fetching
  useAuthToken()

  useEffect(() => {
    setIsMounted(true)

    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setIsCollapsed(true)
      }
    }

    // Initial check
    checkMobile()

    // Add resize listener
    window.addEventListener('resize', checkMobile)

    // Auto-update endpoint if on non-localhost (e.g. mobile) but endpoint is localhost
    if (
      selectedEndpoint.includes('localhost') &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      const port = selectedEndpoint.split(':').pop()?.split('/')[0] || '9000'
      const protocol = window.location.protocol
      const newEndpoint = `${protocol}//${window.location.hostname}:${port}`
      useStore.getState().setSelectedEndpoint(newEndpoint)
      console.log(`Auto-updated endpoint from ${selectedEndpoint} to ${newEndpoint}`)
    }

    if (hydrated) initialize()

    return () => window.removeEventListener('resize', checkMobile)
  }, [selectedEndpoint, initialize, hydrated, mode])

  const handleNewChat = () => {
    clearChat()
    focusChatInput()
    if (isMobile) {
      setIsCollapsed(true)
    }
  }

  return (
    <>
      <motion.aside
        className={`absolute z-50 flex h-screen shrink-0 grow-0 flex-col overflow-hidden bg-background px-2 py-3 font-dmmono md:relative md:border-none ${isCollapsed ? 'border-none' : 'border-r'}`}
        initial={{ width: '16rem' }}
        animate={{ width: isCollapsed ? (isMobile ? 0 : '2.5rem') : '16rem' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          paddingLeft: isCollapsed && isMobile ? 0 : undefined,
          paddingRight: isCollapsed && isMobile ? 0 : undefined,
        }}
      >
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-2 top-2 z-10 p-1"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
          whileTap={{ scale: 0.95 }}
        >
          <Icon
            type="sheet"
            size="xs"
            className={`transform ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
          />
        </motion.button>
        <motion.div
          className="w-60 space-y-5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -20 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{
            pointerEvents: isCollapsed ? 'none' : 'auto'
          }}
        >
          <SidebarHeader />
          <NewChatButton
            disabled={messages.length === 0}
            onClick={handleNewChat}
          />
          {isMounted && (
            <>

              {isEndpointActive && (
                <>
                  <motion.div
                    className="flex w-full flex-col items-start gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  >
                    {isEndpointLoading ? (
                      <div className="flex w-full flex-col gap-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton
                            key={index}
                            className="h-9 w-full rounded-xl"
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        {selectedModel && (agentId || teamId) && (
                          <ModelDisplay model={selectedModel} />
                        )}
                      </>
                    )}
                  </motion.div>
                  <ChatHistory onChatSelect={() => isMobile && setIsCollapsed(true)} />
                </>
              )}
            </>
          )}
        </motion.div>
      </motion.aside>

      {/* Mobile Floating Toggle Button */}
      {isMounted && isMobile && isCollapsed && (
        <Button
          onClick={() => setIsCollapsed(false)}
          className="fixed left-4 top-4 z-50 h-10 w-10 rounded-xl bg-background border shadow-sm md:hidden"
          size="icon"
          variant="ghost"
        >
          <Icon type="sheet" size="sm" className="rotate-180" />
        </Button>
      )}
    </>
  )
}

export default Sidebar
