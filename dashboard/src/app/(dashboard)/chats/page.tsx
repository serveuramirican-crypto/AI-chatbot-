"use client"

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatSidebar } from '@/components/chats/ChatSidebar';
import { ChatArea } from '@/components/chats/ChatArea';
import { ChatInput } from '@/components/chats/ChatInput';
import { ChatSession } from '@/components/chats/types';

export default function ChatsPage() {
  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch initial data
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_messages(*)
        `)
        .order('last_interaction', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
      } else if (data) {
        setConversations(data as ChatSession[]);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    };

    fetchConversations();

    // 2. Setup Realtime Subscriptions
    const channel = supabase.channel('chats_realtime')
      // Listen to new chat sessions created by widget visitors
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_sessions' }, async (payload) => {
        const newSession = payload.new as ChatSession;
        setConversations(prev => {
          if (prev.some(c => c.id === newSession.id)) return prev;
          const fullSession = { ...newSession, chat_messages: newSession.chat_messages || [] };
          return [fullSession, ...prev];
        });
        setSelectedId(prev => prev || newSession.id);
      })
      // Listen to new messages
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const newMessage = payload.new;
        setConversations(prev => {
          const exists = prev.some(conv => conv.id === newMessage.session_id);
          if (exists) {
            return prev.map(conv => {
              if (conv.id === newMessage.session_id) {
                const msgs = conv.chat_messages || [];
                if (msgs.some(m => m.id === newMessage.id)) return conv;
                return {
                  ...conv,
                  chat_messages: [...msgs, newMessage as any],
                  last_interaction: newMessage.created_at || new Date().toISOString(),
                };
              }
              return conv;
            });
          }
          return prev;
        });

        // If session wasn't found in existing state, fetch it from DB on-the-fly
        const { data: freshSession } = await supabase
          .from('chat_sessions')
          .select('*, chat_messages(*)')
          .eq('id', newMessage.session_id)
          .single();

        if (freshSession) {
          setConversations(prev => {
            if (prev.some(c => c.id === freshSession.id)) {
              return prev.map(conv => conv.id === freshSession.id ? (freshSession as ChatSession) : conv);
            }
            return [freshSession as ChatSession, ...prev];
          });
          setSelectedId(prev => prev || freshSession.id);
        }
      })
      // Listen to session updates (e.g. takeover status, name change)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_sessions' }, (payload) => {
        const updatedSession = payload.new;
        setConversations(prev => prev.map(conv => {
          if (conv.id === updatedSession.id) {
            return {
              ...conv,
              ...updatedSession,
              chat_messages: conv.chat_messages // preserve messages since they are not in the payload
            };
          }
          return conv;
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId]); // Intentionally keeping dependencies light, we handle selectedId initialization only

  const selectedConversation = conversations.find(c => c.id === selectedId);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
  };

  const handleTakeOverToggle = async () => {
    if (!selectedConversation) return;
    
    // Optimistic UI update
    const newStatus = !selectedConversation.is_taken_over;
    setConversations(prev => prev.map(conv => 
      conv.id === selectedId ? { ...conv, is_taken_over: newStatus } : conv
    ));

    // Update Supabase
    const { error } = await supabase
      .from('chat_sessions')
      .update({ is_taken_over: newStatus })
      .eq('id', selectedId);

    if (error) {
      console.error('Error updating takeover status:', error);
      // Revert optimistic update on error
      setConversations(prev => prev.map(conv => 
        conv.id === selectedId ? { ...conv, is_taken_over: !newStatus } : conv
      ));
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedId) return;

    // Send to Supabase (Realtime subscription will automatically update the UI)
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: selectedId,
        role: 'admin',
        content,
      });

    if (error) {
      console.error('Error sending message:', error);
    }
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
                  {selectedConversation.user_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold text-white">{selectedConversation.user_name}</h2>
                  <p className="text-xs text-zinc-400">
                    {selectedConversation.is_taken_over ? (
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
              isTakenOver={selectedConversation.is_taken_over}
              onTakeOverToggle={handleTakeOverToggle}
              onSendMessage={handleSendMessage}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 bg-[#000000]">
            {conversations.length === 0 ? 'No conversations found.' : 'Select a conversation to start'}
          </div>
        )}
      </div>
    </div>
  );
}
