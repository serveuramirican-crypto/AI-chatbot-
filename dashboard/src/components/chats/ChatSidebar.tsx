import { Conversation } from './types';
import { User, MessageSquare, Clock } from 'lucide-react';

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ChatSidebar({ conversations, selectedId, onSelect }: ChatSidebarProps) {
  // Sort conversations by last_interaction or created_at descending so newest chats appear first
  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = new Date(a.last_interaction || a.created_at || 0).getTime();
    const timeB = new Date(b.last_interaction || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div className="w-80 bg-[#0a0a0b] border-r border-zinc-800 flex flex-col h-full text-zinc-300">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-white">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          Conversations
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {sortedConversations.length === 0 ? (
          <div className="p-4 text-xs text-zinc-500 text-center">No active chats</div>
        ) : (
          sortedConversations.map((conv) => {
            const interactionDate = new Date(conv.last_interaction || conv.created_at || Date.now());
            const displayTime = isNaN(interactionDate.getTime())
              ? 'Just now'
              : interactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left p-4 border-b border-zinc-800/50 hover:bg-zinc-900 transition-colors ${
                  selectedId === conv.id ? 'bg-zinc-900 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-zinc-100 truncate">{conv.user_name || 'Visitor'}</span>
                      {conv.is_taken_over && (
                        <span className="w-2 h-2 rounded-full bg-orange-500" title="Taken over by human" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{displayTime}</span>
                      <span className="mx-1">•</span>
                      <span>{conv.chat_messages?.length || 0} Interactions</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

