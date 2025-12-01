'use client';

import { useState, useRef, useEffect } from 'react';
import { useConversation, useConversations } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, Conversation } from 'shared/types';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import Link from 'next/link';

interface PrivateChatProps {
  conversationId: string | null;
  onClose?: () => void;
}

export function PrivateChat({ conversationId, onClose }: PrivateChatProps) {
  const { user } = useAuth();
  const {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    typingUsers,
    handleTyping,
    searchTerm,
    setSearchTerm,
    searchResults,
    searching,
    handleSearch,
  } = useConversation(conversationId, user?.uid || null);
  const [messageText, setMessageText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;

    try {
      await sendMessage(messageText);
      setMessageText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    handleTyping();
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwnMessage = message.senderId === user?.uid;
    const isRead = message.readBy && message.readBy.length > 1; // More than just sender

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          {/* Avatar and Name */}
          <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
            {message.senderAvatar ? (
              <img
                src={message.senderAvatar}
                alt={message.senderName || 'User'}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-navy-800 flex items-center justify-center">
                <svg className="w-4 h-4 text-gold-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <span className="text-xs text-slate-200 font-medium">
              {message.senderName || 'Utilizator'}
            </span>
          </div>

          {/* Message Bubble */}
          <div
            className={`rounded-lg px-4 py-2 ${
              isOwnMessage
                ? 'bg-[#e7b73c] text-[#000940]'
                : 'bg-navy-800 text-slate-50 border border-gold-500/20'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
            {message.edited && (
              <span className="text-xs opacity-70 italic mt-1 block">
                (editat)
              </span>
            )}
          </div>

          {/* Timestamp and Read Receipt */}
          <div className={`flex items-center gap-1 text-xs text-slate-400 mt-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
            <span>{formatDistanceToNow(message.timestamp, { addSuffix: true, locale: ro })}</span>
            {isOwnMessage && isRead && (
              <svg className="w-4 h-4 text-[#e7b73c]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!conversationId) {
    return (
      <div className="bg-navy-900/70 border border-gold-500/30 rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
        <svg className="w-16 h-16 text-gold-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-slate-100 text-lg font-medium mb-2">Selectează o conversație</p>
        <p className="text-slate-400 text-sm">
          Alege o conversație din listă pentru a începe să trimiți mesaje
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-navy-900/70 border border-gold-500/30 rounded-2xl p-6 text-center">
        <p className="text-slate-200">Autentifică-te pentru a vedea mesajele</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-navy-900/80 border border-gold-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 px-4 py-3 border-b border-gold-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#e7b73c]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
            </svg>
            <h3 className="text-white font-semibold">Conversație Privată</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-gold-200 hover:text-white transition-colors p-1"
              title="Caută mesaje"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gold-200 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Caută în conversație..."
                className="w-full px-4 py-2 pr-10 rounded-lg bg-navy-900/70 text-slate-50 placeholder-slate-400 border border-gold-500/40 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#e7b73c]"></div>
                </div>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 text-xs text-gold-200">
                {searchResults.length} rezultate găsite
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-navy-950/70">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e7b73c]"></div>
          </div>
        ) : error ? (
          <div className="text-center px-4 py-3 bg-red-900/40 border border-red-500/60 text-red-100 rounded-lg">
            <p>Eroare la încărcarea mesajelor: {error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <svg className="w-16 h-16 text-slate-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Niciun mesaj încă</p>
            <p className="text-xs mt-1">Începe conversația trimițând un mesaj!</p>
          </div>
        ) : (
          <>
            {(showSearch && searchResults.length > 0 ? searchResults : messages).map(renderMessage)}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-slate-400 text-sm italic mb-4">
                <div className="flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                </div>
                <span>Scrie...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="border-t border-gold-500/20 p-4 bg-navy-900/90">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={handleInputChange}
            placeholder="Scrie un mesaj..."
            disabled={sending}
            className="flex-1 px-4 py-2 border border-gold-500/40 rounded-lg bg-navy-900/70 text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent disabled:bg-navy-900/40 disabled:text-slate-500 disabled:cursor-not-allowed"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!messageText.trim() || sending}
            className="px-6 py-2 bg-[#e7b73c] text-[#000940] rounded-lg hover:bg-[#f0c955] disabled:bg-navy-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#000940]"></div>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
}

export function ConversationList({ onSelectConversation, selectedConversationId }: ConversationListProps) {
  const { user } = useAuth();
  const { conversations, loading, totalUnreadCount } = useConversations(user?.uid || null);

  const getOtherUserName = (conversation: Conversation) => {
    // This would need to be enhanced to fetch actual user names
    const otherUserId = conversation.participants.find(id => id !== user?.uid);
    return `Utilizator ${otherUserId?.slice(-4)}`;
  };

  if (!user) {
    return (
      <div className="bg-navy-900/70 border border-gold-500/30 rounded-2xl p-6 text-center">
        <p className="text-slate-200">Autentifică-te pentru a vedea conversațiile</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-navy-900/80 border border-gold-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-semibold">Conversații</h3>
        {totalUnreadCount > 0 && (
          <span className="bg-[#e7b73c] text-[#000940] text-xs font-bold px-2 py-1 rounded-full">
            {totalUnreadCount}
          </span>
        )}
      </div>

      {/* Conversations List */}
      <div className="divide-y divide-gold-500/20 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e7b73c]"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Nicio conversație</p>
            <p className="text-xs mt-1">Conversațiile vor apărea aici după încheierea licitațiilor</p>
          </div>
        ) : (
          conversations.map((conversation) => {
            const isSelected = conversation.id === selectedConversationId;
            const unreadCount = user?.uid ? (conversation.unreadCount[user.uid] || 0) : 0;

            return (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full p-4 text-left hover:bg-navy-900/60 transition-colors ${
                  isSelected ? 'bg-navy-900/80 border-l-4 border-[#e7b73c]' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {getOtherUserName(conversation)}
                    </p>
                    {conversation.lastMessage && (
                      <p className="text-sm text-slate-400 truncate mt-1">
                        {conversation.lastMessage}
                      </p>
                    )}
                    {conversation.lastMessageAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDistanceToNow(conversation.lastMessageAt, { addSuffix: true, locale: ro })}
                      </p>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-[#e7b73c] text-[#000940] text-xs font-bold px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
