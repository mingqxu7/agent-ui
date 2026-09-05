'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/ui/icon'

const DISMISS_KEY = 'migration-notice-dismissed-entu'
const NEW_SITE_URL = 'https://entu.lw4ever.net/?src=gotq'

// Prerendered as static HTML, so the first paint has no window/localStorage
// -- default hidden to match that, then useEffect (runs once, after mount)
// reads the real value. Standard hidden-by-default-until-mounted pattern.
function MigrationNotice() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // localStorage unavailable (private mode, etc.) -- dismiss for this
      // session only, nothing else to do.
    }
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b-4 border-primary bg-brand px-4 py-4 text-primary shadow-xl sm:py-5">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-2 pr-8 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="text-lg font-extrabold sm:text-2xl">🎉 我们正在搬家</span>
          <span className="text-sm sm:text-base">
            新增「研经空间」逐节讲解经文 · 每条陈述均核实来源 · 无需登录
          </span>
          <a
            href={NEW_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-primary px-3 py-1 text-sm font-bold text-brand hover:bg-primary/80 sm:text-base"
          >
            entu.lw4ever.net →
          </a>
        </div>
        <div className="rounded bg-primary/15 px-3 py-1 text-sm font-bold underline decoration-2 underline-offset-2 sm:text-base">
          ⭐ 关闭本提示前，请先收藏新网址，以便日后访问
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-primary/20"
      >
        <Icon type="x" size="sm" />
      </button>
    </div>
  )
}

export default MigrationNotice
