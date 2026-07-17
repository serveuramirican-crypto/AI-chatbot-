import { useState } from 'react';
import { Send, Paperclip, Bot, Shield } from 'lucide-react';

interface ChatInputProps {
  isTakenOver: boolean;
  onTakeOverToggle: () => void;
  onSendMessage: (content: string) => void;
}

export function ChatInput({ isTakenOver, onTakeOverToggle, onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#0a0a0b] border-t border-zinc-800 p-4 shrink-0">
      <div className="max-w-4xl mx-auto">
        {!isTakenOver ? (
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-3 text-zinc-400">
              <Bot className="w-5 h-5" />
              <span className="text-sm font-medium">AI is handling this conversation.</span>
            </div>
            <button
              onClick={onTakeOverToggle}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Take over chat
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-orange-500 font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                You have taken over this chat. The AI is paused.
              </span>
              <button
                onClick={onTakeOverToggle}
                className="text-sm text-zinc-400 hover:text-white underline transition-colors"
              >
                Hand back to AI
              </button>
            </div>
            <div className="flex items-end gap-2 bg-[#1a1a1a] p-2 rounded-xl border border-zinc-800 focus-within:border-zinc-700 transition-colors shadow-sm">
              <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message as an admin..."
                className="w-full max-h-32 min-h-[44px] bg-transparent text-white placeholder:text-zinc-600 resize-none outline-none py-3 px-2 text-sm leading-relaxed"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="p-3 bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
