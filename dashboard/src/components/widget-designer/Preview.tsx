"use client"

import { MessageSquare, X, Send } from "lucide-react"

export type WidgetSettings = {
  id?: string
  color: string
  header_text: string
  logo_url: string
  position: string
  welcome_message: string
  enable_ai_fallback: boolean
  ai_model: string
  openrouter_api_key: string
}

export function Preview({ settings }: { settings: WidgetSettings }) {
  const isRight = settings.position === 'bottom-right'

  return (
    <div className="relative h-[600px] w-full border rounded-xl bg-gray-50 overflow-hidden flex flex-col justify-end p-6">
      {/* Background illustration */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 to-transparent pointer-events-none"></div>

      {/* Widget container */}
      <div className={`absolute bottom-6 flex flex-col ${isRight ? 'right-6 items-end' : 'left-6 items-start'}`}>
        
        {/* Chat Window */}
        <div className="w-80 h-96 bg-white rounded-2xl shadow-xl border flex flex-col overflow-hidden mb-4">
          
          {/* Header */}
          <div 
            className="p-4 flex items-center justify-between text-white"
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
            <button className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 bg-gray-50 overflow-y-auto flex flex-col gap-4">
            <div className="flex gap-2 max-w-[85%]">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-6 h-6 rounded-full object-cover mt-1" />
              ) : (
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white mt-1 shrink-0"
                  style={{ backgroundColor: settings.color }}
                >
                  <MessageSquare className="w-3 h-3" />
                </div>
              )}
              <div className="bg-white border rounded-2xl rounded-tl-none p-3 text-sm shadow-sm">
                {settings.welcome_message}
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 border-t bg-white">
            <div className="flex items-center gap-2 border rounded-full px-3 py-2 bg-gray-50">
              <input 
                type="text" 
                placeholder="Type a message..." 
                className="flex-1 bg-transparent text-sm outline-none"
                disabled
              />
              <button 
                className="p-1.5 rounded-full text-white shrink-0"
                style={{ backgroundColor: settings.color }}
              >
                <Send className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Launcher Button */}
        <button 
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
          style={{ backgroundColor: settings.color }}
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
