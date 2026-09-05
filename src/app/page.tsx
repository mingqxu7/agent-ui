'use client'
import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
// import MigrationNotice from '@/components/MigrationNotice'
import { Suspense } from 'react'

export default function Home() {
  return (
    <>
      {/* <MigrationNotice /> */}
      <div className="flex h-screen bg-background/80">
        <Suspense fallback={<div>Loading Sidebar...</div>}>
          <Sidebar />
        </Suspense>
        <Suspense fallback={<div>Loading Chat...</div>}>
          <ChatArea />
        </Suspense>
      </div>
    </>
  )
}
