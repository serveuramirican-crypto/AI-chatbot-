"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { MessageSquare, X, Send } from "lucide-react"

function WidgetContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  
  const [settings, setSettings] = useState<any>(null)
  const [open, setOpen] = useState(false)
  
  const [messages, setMessages] = useState<{role: 'user'|'bot', content: string}[]>([])
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))

  useEffect(() => {
    // In a real multi-tenant app, we would fetch settings by projectId.
    // For this single-project MVP, we just fetch the first settings row.
    async function fetchSettings() {
      const { data } = await supabase
        .from('widget_settings')
        .select('*')
        .limit(1)
        .single()
      
      if (data) setSettings(data)
    }
    fetchSettings()
  }, [projectId])

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return
    
    const userMessage = inputValue
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInputValue("")
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId })
      })
      const data = await res.json()
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'bot', content: data.response }])
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'bot', content: `Error: ${data.error}` }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: "Failed to connect to the server." }])
    } finally {
      setLoading(false)
    }
  }

  if (!settings) return null

  const isRight = settings.position === 'bottom-right'

  return (
    <div className="w-full h-full p-4 pointer-events-none flex flex-col justify-end">
      <div className={`w-full flex flex-col ${isRight ? 'items-end' : 'items-start'} pointer-events-auto`}>
        
        {/* Chat Window */}
        {open && (
          <div className="w-80 h-[500px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden mb-4 pointer-events-auto">
            {/* Header */}
            <div 
              className="p-4 flex items-center justify-between text-white shadow-sm z-10"
              style={{ backgroundColor: settings.color }}
            >
              <div className="flex items-center gap-3">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-8 h-8 rounded-full object-cover bg-white/20" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                )}
                <span className="font-medium">{settings.header_text}</span>
              </div>
              <button 
                className="text-white/80 hover:text-white transition-colors"
                onClick={() => setOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 bg-gray-50 overflow-y-auto flex flex-col gap-4">
              {/* Welcome Message */}
              <div className="flex gap-2 max-w-[85%]">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-6 h-6 rounded-full object-cover mt-1 shadow-sm" />
                ) : (
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white mt-1 shrink-0 shadow-sm"
                    style={{ backgroundColor: settings.color }}
                  >
                    <MessageSquare className="w-3 h-3" />
                  </div>
                )}
                <div className="bg-white border rounded-2xl rounded-tl-none p-3 text-sm shadow-sm whitespace-pre-wrap">
                  {settings.welcome_message}
                </div>
              </div>

              {/* Chat History */}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : ''}`}>
                  {msg.role === 'bot' && (
                    settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="w-6 h-6 rounded-full object-cover mt-1 shadow-sm" />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white mt-1 shrink-0 shadow-sm" style={{ backgroundColor: settings.color }}>
                        <MessageSquare className="w-3 h-3" />
                      </div>
                    )
                  )}
                  <div 
                    className={`border rounded-2xl p-3 text-sm shadow-sm whitespace-pre-wrap ${
                      msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none border-blue-700' : 'bg-white rounded-tl-none'
                    }`}
                    style={msg.role === 'user' ? { backgroundColor: settings.color, borderColor: settings.color } : {}}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 max-w-[85%]">
                  <div className="bg-white border rounded-2xl rounded-tl-none p-3 text-sm shadow-sm text-gray-500 italic">
                    Typing...
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t">
              <div className="flex items-center gap-2 border rounded-full px-3 py-2 bg-gray-50 focus-within:ring-1 focus-within:border-transparent transition-all"
                   style={{ '--tw-ring-color': settings.color } as any}>
                <input 
                  type="text" 
                  placeholder="Type your message..." 
                  className="flex-1 bg-transparent text-sm outline-none"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button 
                  className="p-1.5 rounded-full text-white shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: settings.color }}
                  onClick={handleSend}
                  disabled={loading || !inputValue.trim()}
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Launcher Button */}
        {!open && (
          <button 
            className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-105 transition-transform pointer-events-auto"
            style={{ backgroundColor: settings.color }}
            onClick={() => setOpen(true)}
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function WidgetPage() {
  return (
    <Suspense fallback={null}>
      <WidgetContent />
    </Suspense>
  )
}
