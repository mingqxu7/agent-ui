'use client'
import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import { Suspense } from 'react'

export default function Home() {
  // Check if OS_SECURITY_KEY is defined on server-side
  const hasEnvToken = !!process.env.NEXT_PUBLIC_OS_SECURITY_KEY
  const envToken = process.env.NEXT_PUBLIC_OS_SECURITY_KEY || ''
  return (
    <div className="flex h-screen bg-background/80">
      <Suspense fallback={<div>Loading Sidebar...</div>}>
        <Sidebar hasEnvToken={hasEnvToken} envToken={envToken} />
      </Suspense>
      <Suspense fallback={<div>Loading Chat...</div>}>
        <ChatArea />
      </Suspense>
    </div>
  )
}
