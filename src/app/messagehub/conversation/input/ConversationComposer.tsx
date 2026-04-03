import { useEffect, useRef, useState } from 'react'
import { Paperclip, Send } from 'lucide-react'

export function ConversationComposer({
  placeholder,
  onSendMessage,
}: {
  placeholder: string
  onSendMessage: (content: string) => void
}) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = inputRef.current
    if (!element) {
      return
    }

    element.style.height = '0px'
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`
  }, [inputValue])

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text) {
      return
    }

    onSendMessage(text)
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex-shrink-0 px-3 py-2"
      style={{
        borderTop: '1px solid var(--cp-border)',
        background: 'var(--cp-surface)',
      }}
    >
      <div
        className="flex items-end gap-2 rounded-2xl px-3 py-2"
        style={{
          background: 'color-mix(in srgb, var(--cp-text) 5%, transparent)',
        }}
      >
        <button
          className="p-1 rounded-lg flex-shrink-0 self-end mb-0.5"
          style={{ color: 'var(--cp-muted)' }}
          type="button"
        >
          <Paperclip size={18} />
        </button>
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent border-none outline-none text-sm resize-none"
          style={{
            color: 'var(--cp-text)',
            maxHeight: 120,
            lineHeight: '1.4',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="p-1.5 rounded-full flex-shrink-0 self-end transition-colors"
          style={{
            background: inputValue.trim()
              ? 'var(--cp-accent)'
              : 'color-mix(in srgb, var(--cp-text) 10%, transparent)',
            color: inputValue.trim() ? '#fff' : 'var(--cp-muted)',
          }}
          type="button"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
