'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Loader2 as SpinnerIcon } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ComplianceAssistant({
  reportId,
  userPlan
}: {
  reportId?: string
  userPlan: string
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Step 2: Compliance Assistant is gated to any paid tier.
  const hasPaid = ['starter', 'growth', 'enterprise'].includes(userPlan)
  const isAllowed = hasPaid

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          reportId,
          history: messages,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'UPGRADE_REQUIRED') {
          setError('Upgrade to Starter to unlock the Compliance Assistant')
        } else {
          setError(data.error || 'Something went wrong')
        }
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Connection failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAllowed) {
    return (
      <button
        onClick={() => setError('Upgrade to Pro to unlock the Compliance Assistant')}
        className="fixed bottom-6 right-6 bg-surface-elevated border border-border
          text-text-secondary px-4 py-2 rounded-lg shadow-lg hover:border-neutral-500
          transition-colors z-50 text-sm"
      >
        💬 Compliance Assistant
      </button>
    )
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 bg-neutral-700 hover:bg-neutral-800
            text-text-primary px-4 py-2 rounded-lg shadow-lg transition-colors z-50
            text-sm"
        >
          ✨ Ask AI
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)]
          h-[500px] bg-surface border border-border rounded-2xl
          shadow-2xl flex flex-col z-50">

          <div className="flex items-center justify-between p-4
            border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 text-sm">✨</span>
              <span className="text-text-primary font-medium text-sm">
                Compliance Assistant
              </span>
            </div>
            <button onClick={() => setOpen(false)}>
              <X size={18} className="text-text-secondary hover:text-text-primary" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-gray-500 text-sm">
                Ask me about the violations in this report — why they matter,
                how to fix them, or what the legal risk looks like.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-neutral-700 text-text-primary'
                    : 'bg-surface-elevated text-gray-200'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-elevated rounded-xl px-3 py-2">
                  <SpinnerIcon size={14} className="animate-spin text-text-secondary" />
                </div>
              </div>
            )}
            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about this report..."
              className="flex-1 bg-background border border-border
                rounded-lg px-3 py-2 text-sm text-text-primary placeholder-gray-600
                focus:outline-none focus:border-neutral-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-neutral-700 hover:bg-neutral-800 disabled:opacity-50
                text-text-primary px-3 py-2 rounded-lg transition-colors text-xs"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}