'use client'

import { useState, useEffect } from 'react'
import ChatInput from './ChatInput'
import MessageArea from './MessageArea'
import { useStore } from '@/store'
import Icon from '@/components/ui/icon'

const ChatArea = () => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const { isChatLoading, setIsSidebarCollapsed } = useStore()

  if (!isMounted) {
    return null
  }

  const handleClick = () => {
    if (window.innerWidth < 768) {
      setIsSidebarCollapsed(true)
    }
  }

  return (
    <main
      className="relative m-1.5 flex flex-grow flex-col rounded-xl bg-background"
      onClick={handleClick}
    >
      {isChatLoading ? (
        <div className="flex h-full w-full items-center justify-center">
          <Icon type="loading" className="animate-spin text-primary" size="lg" />
        </div>
      ) : (
        <MessageArea />
      )}
      <div className="sticky bottom-0 ml-9 px-4 pb-2">
        <ChatInput />
      </div>
    </main>
  )
}

export default ChatArea
