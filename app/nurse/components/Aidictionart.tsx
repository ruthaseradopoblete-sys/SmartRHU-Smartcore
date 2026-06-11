'use client'
import { useState, useEffect, useRef } from 'react'

interface Message { role: 'ai' | 'user'; text: string }

const SUGGESTIONS = ['BCG schedule', 'Pentavalent dose', 'Paracetamol dosage', 'Amoxicillin use']

export default function AIDictionary() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hello! I'm your AI medical assistant. Ask me about medications, dosages, vaccine schedules, or medical terms." },
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const send = async (text?: string) => {
    const q = text ?? input.trim()
    if (!q) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a concise medical reference assistant for nurses in a Philippine Rural Health Unit (RHU). Answer in 2-4 sentences. Cover dosage, schedule, indications, or contraindications as relevant. Use simple, clear language. Do not recommend diagnosis.',
          messages: [{ role: 'user', content: q }],
        }),
      })
      const data  = await res.json()
      const reply = data.content?.find((b: { type: string; text?: string }) => b.type === 'text')?.text ?? 'No response.'
      setMessages(m => [...m, { role: 'ai', text: reply }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Connection error. Please try again.' }])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages, loading])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: '#fff', borderRadius: 14,
      border: '1px solid #e5e7eb', overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '12px 16px',
        background: 'linear-gradient(90deg, #14532d, #16a34a)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '.08em' }}>
          AI MEDICAL DICTIONARY
        </span>
        <span style={{
          background: 'rgba(255,255,255,.25)', color: '#fff',
          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
        }}>
          POWERED BY CLAUDE
        </span>
      </div>

      {/* Chat log */}
      <div
        ref={logRef}
        style={{
          padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
          maxHeight: 260, minHeight: 160, overflowY: 'auto',
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: '90%', padding: '8px 12px', borderRadius: 12,
              fontSize: 12, lineHeight: 1.5,
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? '#14532d' : '#f0fdf4',
              color: m.role === 'user' ? '#fff' : '#14532d',
              borderBottomRightRadius: m.role === 'user' ? 3 : 12,
              borderBottomLeftRadius:  m.role === 'ai'   ? 3 : 12,
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{
            display: 'flex', gap: 4, alignSelf: 'flex-start',
            padding: '8px 12px', background: '#f0fdf4',
            borderRadius: 12, borderBottomLeftRadius: 3,
          }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#16a34a',
                  display: 'inline-block',
                  animation: 'dotBounce .9s infinite ease-in-out',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 12px', borderTop: '1px solid #f3f4f6' }}>
        {SUGGESTIONS.map(sg => (
          <button
            key={sg}
            onClick={() => send(sg)}
            style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
              border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', cursor: 'pointer',
            }}
          >
            {sg}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #e5e7eb' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about a medicine or vaccine..."
          style={{
            flex: 1, background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: 20, padding: '7px 14px', fontSize: 12,
            color: '#111827', outline: 'none',
          }}
        />
        <button
          onClick={() => send()}
          style={{
            width: 34, height: 34, borderRadius: '50%', background: '#16a34a',
            border: 'none', color: '#fff', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, fontSize: 16,
          }}
        >
          ➤
        </button>
      </div>

      <style>{`
        @keyframes dotBounce {
          0%,80%,100% { transform: translateY(0); opacity: .4; }
          40%          { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}