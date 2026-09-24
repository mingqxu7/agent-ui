'use client'
import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import MigrationNotice from '@/components/MigrationNotice'
import { Suspense } from 'react'

export default function Home() {
  return (
    // The notice sits in normal flow above the app (not fixed over it), so
    // the app takes whatever height is left and nothing is hidden beneath it.
    <div className="flex h-screen flex-col">
      <MigrationNotice />
      <div className="relative flex min-h-0 flex-1 bg-background/80">
        <Suspense fallback={<div>Loading Sidebar...</div>}>
          <Sidebar />
        </Suspense>
        <Suspense fallback={<div>Loading Chat...</div>}>
          <ChatArea />
        </Suspense>
      </div>
    </div>
  )
}
