import dayjs from 'dayjs'
import type { ChatMessage, SessionEntry } from '@/types/os'

export type ExportFormat = 'markdown' | 'json'

// Timestamps in the store are a mix of seconds (AgentOS stream) and
// milliseconds (Date.now()) -- anything below 1e12 is treated as seconds.
const toMillis = (ts?: number) =>
  ts === undefined ? undefined : ts < 1e12 ? ts * 1000 : ts

const formatTime = (ts?: number) => {
  const ms = toMillis(ts)
  return ms === undefined ? '' : dayjs(ms).format('YYYY-MM-DD HH:mm')
}

const ROLE_LABELS: Record<ChatMessage['role'], string> = {
  user: '我 (You)',
  agent: '助手 (Assistant)',
  system: '系统 (System)',
  tool: '工具 (Tool)'
}

// Messages with no content (e.g. an agent placeholder that never received a
// response) add nothing to the export.
const exportableMessages = (messages: ChatMessage[] = []) =>
  messages.filter((m) => m.content && m.content.trim().length > 0)

export const buildMarkdownExport = (
  sessions: SessionEntry[],
  chatSessions: Record<string, ChatMessage[]>
) => {
  const lines: string[] = [
    '# 聊天记录 / Chat History',
    '',
    `导出时间 / Exported: ${dayjs().format('YYYY-MM-DD HH:mm')}`,
    ''
  ]

  for (const session of sessions) {
    lines.push('---', '', `## ${session.session_name || 'Untitled chat'}`, '')
    const started = formatTime(session.created_at)
    if (started) lines.push(`*${started}*`, '')

    for (const message of exportableMessages(chatSessions[session.session_id])) {
      const time = formatTime(message.created_at)
      lines.push(
        `**${ROLE_LABELS[message.role] ?? message.role}**${time ? ` · ${time}` : ''}`,
        '',
        message.content.trim(),
        ''
      )
    }
  }

  return lines.join('\n')
}

export const buildJsonExport = (
  sessions: SessionEntry[],
  chatSessions: Record<string, ChatMessage[]>
) =>
  JSON.stringify(
    {
      version: 1,
      exported_at: new Date().toISOString(),
      sessions: sessions.map((session) => ({
        ...session,
        messages: exportableMessages(chatSessions[session.session_id]).map(
          // Drop transient UI-only state.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ progressStatus, streamingError, connectionInterrupted, ...rest }) =>
            rest
        )
      }))
    },
    null,
    2
  )

export const downloadSessions = (
  format: ExportFormat,
  sessions: SessionEntry[],
  chatSessions: Record<string, ChatMessage[]>
) => {
  const isMarkdown = format === 'markdown'
  const content = isMarkdown
    ? buildMarkdownExport(sessions, chatSessions)
    : buildJsonExport(sessions, chatSessions)
  const blob = new Blob([content], {
    type: isMarkdown ? 'text/markdown;charset=utf-8' : 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `chat-history-${dayjs().format('YYYYMMDD-HHmm')}.${isMarkdown ? 'md' : 'json'}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
