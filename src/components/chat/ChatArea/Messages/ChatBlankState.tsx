'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Icon from '@/components/ui/icon'
import { IconType } from '@/components/ui/icon/types'
import React, { useEffect, useState } from 'react'

const EXTERNAL_LINKS = {
  banaba: 'https://www.aibanaba.com/',
  bibleStudy: 'https://biblestudy.aibanaba.com/',
  agno: 'https://agno.com'
}



interface ActionButtonProps {
  href: string
  variant?: 'primary'
  text: string
  icon?: IconType
}

const ActionButton = ({ href, variant, text, icon }: ActionButtonProps) => {
  const baseStyles =
    'px-4 py-2 text-sm transition-colors font-dmmono tracking-tight flex items-center gap-2'
  const variantStyles = {
    primary: 'border border-border hover:bg-neutral-800 rounded-xl'
  }

  return (
    <Link
      href={href}
      target="_blank"
      className={`${baseStyles} ${variant ? variantStyles[variant] : ''}`}
    >
      {icon && <Icon type={icon} />}
      {text}
    </Link>
  )
}

const ChatBlankState = () => {
  const [title, setTitle] = useState('Christian Faith Q&A')
  const [description, setDescription] = useState(
    'Grounded in true Christian Faith'
  )
  const [isChinese, setIsChinese] = useState(false)

  useEffect(() => {
    if (navigator.language.startsWith('zh')) {
      setTitle('基督教信仰问答')
      setDescription('向下扎根、向上生长')
      setDescription('向下扎根、向上生长')
      setIsChinese(true)
    }
  }, [])



  return (
    <section
      className="flex flex-col items-center text-center font-geist"
      aria-label="Welcome message"
    >
      <div className="flex max-w-3xl flex-col gap-y-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-3xl font-[600] tracking-tight"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-muted-foreground max-w-2xl text-lg"
        >
          {description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="md:hidden"
        >
          <span className="flex items-center justify-center gap-1 text-sm text-muted-foreground/80">
            {isChinese ? '(点击左上 ' : '(Click upper left '}
            <Icon type="sheet" size="xs" className="inline-block rotate-180" />
            {isChinese ? ' 查看历史记录)' : ' to view chat history)'}
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex justify-center gap-4"
        >
          <ActionButton
            href={EXTERNAL_LINKS.banaba}
            variant="primary"
            text="Banaba: Daily Encouragement"
            icon="banaba"
          />
          <ActionButton
            href={EXTERNAL_LINKS.bibleStudy}
            text="Cell-group Bible Study Guide"
            icon="banaba"
          />
        </motion.div>
      </div>
    </section>
  )
}

export default ChatBlankState
