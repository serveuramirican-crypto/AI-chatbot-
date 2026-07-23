import { Conversation, ChatMessage } from './types';
import { Bot, User, ShieldAlert } from 'lucide-react';
import Image from 'next/image';

interface ChatAreaProps {
  conversation: Conversation;
}

export function ChatArea({ conversation }: ChatAreaProps) {
  // Sort messages by created_at safely
  const messages = [...(conversation.chat_messages || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#000000] text-zinc-300">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}

function parseMessageContent(content: string): { cleanText: string; options: string[] } {
  if (!content) return { cleanText: '', options: [] };

  let text = content;
  const options: string[] = [];

  // Extract <options>[...]</options>
  const optionsMatch = text.match(/<options>\s*(\[[\s\S]*?\])\s*<\/options>/);
  if (optionsMatch) {
    try {
      const parsed = JSON.parse(optionsMatch[1]);
      if (Array.isArray(parsed)) {
        parsed.forEach((opt: any) => {
          if (typeof opt === 'string' && opt.trim()) options.push(opt.trim());
        });
      }
    } catch (e) {}
    text = text.replace(/\s*<options>\s*\[[\s\S]*?\]\s*<\/options>/g, '').trimEnd();
  }

  // Extract [BUTTON]Label[/BUTTON]
  const btnRegex = /\[BUTTON\](.*?)\[\/BUTTON\]/g;
  let match;
  while ((match = btnRegex.exec(text)) !== null) {
    if (match[1]?.trim()) options.push(match[1].trim());
  }
  text = text.replace(/\[BUTTON\](.*?)\[\/BUTTON\]/g, '').trim();

  return { cleanText: text, options };
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isAdmin = message.role === 'admin';
  const isAgent = message.role === 'agent';

  const { cleanText, options } = parseMessageContent(message.content);

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar for agent/admin */}
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${isAdmin ? 'bg-orange-500/20 text-orange-500' : 'bg-zinc-800 text-zinc-400'}`}>
          {isAdmin ? <ShieldAlert className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[80%]`}>
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-[#1a1a1a] text-white rounded-br-sm'
              : isAdmin
              ? 'bg-orange-500/10 border border-orange-500/20 text-orange-100 rounded-bl-sm'
              : 'bg-[#1a1a1a] text-white rounded-bl-sm'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{cleanText || message.content}</div>
        </div>

        {/* Options / Quick Reply Badges */}
        {!isUser && options.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 text-xs rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-400 font-medium flex items-center gap-1.5 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {opt}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-[10px] text-zinc-500 ${isUser ? 'text-right' : 'text-left'} px-1`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {isAdmin && '• Admin'}
        </div>

        {/* Product Recommendations */}
        {message.products && message.products.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
            {message.products.map((product) => (
              <div key={product.id} className="min-w-[160px] bg-[#1a1a1a] rounded-xl overflow-hidden border border-zinc-800/50 hover:border-zinc-700 transition-colors cursor-pointer group">
                <div className="relative h-40 w-full bg-zinc-800">
                  <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium text-white truncate">{product.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">${product.price.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avatar for user (optional, right side) */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
