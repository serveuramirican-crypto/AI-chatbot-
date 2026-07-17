"use client"

import { useState } from 'react';
import { mockConversations } from '@/components/chats/mockData';
import { ChatSidebar } from '@/components/chats/ChatSidebar';
import { ChatArea } from '@/components/chats/ChatArea';
import { ChatInput } from '@/components/chats/ChatInput';
import { Conversation, ChatMessage } from '@/components/chats/types';

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedId, setSelectedId] = useState<string | null>(mockConversations[0]?.id || null);

  const selectedConversation = conversations.find(c => c.id === selectedId);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
  };

  const handleTakeOverToggle = () => {
    if (!selectedId) return;
    
    setConversations(prev => prev.map(conv => {
      if (conv.id === selectedId) {
        return { ...conv, isTakenOver: !conv.isTakenOver };
      }
      return conv;
    }));
  };

  const handleSendMessage = (content: string) => {
    if (!selectedId) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'admin',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === selectedId) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastInteraction: newMessage.timestamp,
        };
      }
      return conv;
    }));
  };

  return (
    <div className="flex h-full -mx-4 -my-8 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-xl bg-[#000000]">
      {/* We use negative margins to break out of the layout.tsx padding because this is a full-bleed app-like page */}
      <ChatSidebar 
        conversations={conversations} 
        selectedId={selectedId} 
        onSelect={handleSelectConversation} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 bg-[#000000]">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-zinc-800 bg-[#0a0a0b] flex items-center px-6 shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center font-bold">
                  {selectedConversation.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold text-white">{selectedConversation.user.name}</h2>
                  <p className="text-xs text-zinc-400">
                    {selectedConversation.isTakenOver ? (
                      <span className="text-orange-500">Admin Control</span>
                    ) : (
                      <span className="text-blue-400">AI Control</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <ChatArea conversation={selectedConversation} />

            {/* Input Area */}
            <ChatInput 
              isTakenOver={selectedConversation.isTakenOver}
              onTakeOverToggle={handleTakeOverToggle}
              onSendMessage={handleSendMessage}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 bg-[#000000]">
            Select a conversation to start
          </div>
        )}
      </div>
    </div>
  );
}
