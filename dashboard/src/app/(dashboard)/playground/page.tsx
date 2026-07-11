"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Terminal, Clock, Server, Database, Sparkles, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"

function ProductCarousel({ products }: { products: any[] | undefined }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  console.log('DEBUG_UI_DATA:', products);

  if (!products || products.length === 0 || !products[0]) {
    return <p>No products found matching your criteria.</p>;
  }

  const showArrows = products.length > 1;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -248 : 248;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full mb-1">
      {showArrows && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); scroll('left'); }}
            className="absolute left-2 top-[160px] -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-opacity flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); scroll('right'); }}
            className="absolute right-2 top-[160px] -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-opacity flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </button>
        </>
      )}

      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto w-full pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {products.map((p: any, pIdx: number) => {
          if (!p) return null;
          const cardContent = (
            <>
              {p?.image_url && (
                <img src={getProxyUrl(p?.image_url) || '/placeholder.png'} alt={p?.name ?? 'Unknown'} className="w-full h-[320px] object-cover" referrerPolicy="no-referrer" />
              )}
              <div className="p-4 flex flex-col gap-1.5 flex-1">
                <h3 className="font-bold text-[15px] text-gray-900 leading-snug">{p?.name ?? 'Unknown'} - {p?.price ?? '0'}</h3>
                {p?.description && <p className="text-[14px] text-gray-600 leading-relaxed" dir="auto">{p?.description}</p>}
                
                <div className="mt-auto pt-3">
                  <div className="w-full flex items-center justify-center gap-2 bg-[#e5e7eb] hover:bg-[#d1d5db] text-gray-800 text-[14px] font-medium py-2.5 rounded-lg transition-colors group">
                    Voir le Produit
                    <span className="bg-white rounded-full p-1 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <ArrowDown className="w-3 h-3 text-gray-600" />
                    </span>
                  </div>
                </div>
              </div>
            </>
          );
          
          const cardClassName = "bg-[#f4f4f5] rounded-xl overflow-hidden shadow-sm min-w-[240px] max-w-[240px] shrink-0 snap-center flex flex-col border border-slate-200 block transition-transform hover:scale-[1.02]";
          
          if (p?.link) {
            return (
              <a key={pIdx} href={p?.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={cardClassName}>
                {cardContent}
              </a>
            );
          }
          return (
            <div key={pIdx} className={cardClassName}>
              {cardContent}
            </div>
          );
        })}
      </div>
    </div>
  )
}

type Message = {
  id: string
  role: 'user' | 'bot'
  content: string
  source?: string
  latency?: number
  rawJson?: any
  product?: any
  suggestedButtons?: string[]
}

const getProxyUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http') && !url.includes('placehold.co')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (overrideText?: string) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : inputValue;
    if (!textToSend.trim() || loading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend
    }
    
    setMessages(prev => [...prev, userMessage])
    if (typeof overrideText !== 'string') setInputValue("")
    setLoading(true)

    const startTime = performance.now()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, sessionId })
      })
      
      const data = await res.json()
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: data.response || `Error: ${data.error}`,
        source: data.source || 'Unknown',
        latency: latency,
        rawJson: data.raw_json || data,
        product: data.raw_json?.matched_product || data.raw_json?.matched_products,
        suggestedButtons: data.raw_json?.suggested_buttons
      }
      
      setMessages(prev => [...prev, botMessage])
      setSelectedMessageId(botMessage.id)
      
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'bot', 
        content: "Failed to connect to the server." 
      }])
    } finally {
      setLoading(false)
    }
  }

  const selectedMessage = messages.find(m => m.id === selectedMessageId)

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-slate-500" />
          <h2 className="font-semibold text-slate-700">Chat Playground</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <Sparkles className="w-12 h-12 text-slate-300" />
              <p>Send a message to test your Hybrid Intelligence System.</p>
              

            </div>
          ) : (
            messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1;
              return (
              <div 
                key={msg.id} 
                className={`flex flex-col gap-3 w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                onClick={() => msg.role === 'bot' && setSelectedMessageId(msg.id)}
              >
                {msg.product && (
                  <div className={`${msg.role === 'bot' && selectedMessageId === msg.id ? 'ring-2 ring-slate-400 rounded-xl' : ''}`}>
                    <ProductCarousel products={Array.isArray(msg.product) ? msg.product : (msg.product ? [msg.product] : undefined)} />
                  </div>
                )}
                
                <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 cursor-pointer'}`}>
                    {msg.role === 'user' ? <span className="text-white text-xs font-medium">You</span> : <Server className="w-4 h-4 text-white" />}
                  </div>
                  <div 
                    className={`p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : `bg-slate-100 text-slate-800 rounded-tl-none ${selectedMessageId === msg.id ? 'ring-2 ring-slate-400' : 'cursor-pointer hover:bg-slate-200'}`
                    }`}
                    dir="auto"
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Dynamic Buttons for AI */}
                {isLast && msg.role === 'bot' && msg.suggestedButtons && msg.suggestedButtons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1 ml-11">
                    {msg.suggestedButtons.map((btnText: string, i: number) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); handleSend(btnText); }}
                        className="bg-blue-50 text-blue-500 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                      >
                        {btnText}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )})
          )}
          {loading && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <Server className="w-4 h-4 text-white" />
              </div>
              <div className="p-3 rounded-2xl rounded-tl-none bg-slate-100 text-slate-500 text-sm italic">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t bg-white">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Test your chatbot..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={() => handleSend()} disabled={loading || !inputValue.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="w-96 flex flex-col bg-slate-950 rounded-xl overflow-hidden shadow-sm text-slate-300">
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-slate-200 text-sm tracking-wide uppercase">Debug Log</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedMessage ? (
            <div className="h-full flex items-center justify-center text-slate-600 text-sm text-center px-4">
              Click on a bot message to view its debug traces.
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Message Source</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                    selectedMessage.source === 'Supabase' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : selectedMessage.source?.includes('OpenRouter') || selectedMessage.source?.includes('OpenAI') || selectedMessage.source?.includes('Anthropic')
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-slate-800 text-slate-400'
                  }`}>
                    {selectedMessage.source || 'Unknown'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Latency</h3>
                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/50 p-2 rounded-md border border-slate-800">
                  <Clock className="w-4 h-4 text-amber-400" />
                  {selectedMessage.latency} ms
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Raw JSON Response</h3>
                <pre className="bg-slate-900 p-3 rounded-md text-xs font-mono overflow-x-auto text-emerald-400 border border-slate-800">
                  {JSON.stringify(selectedMessage.rawJson, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
