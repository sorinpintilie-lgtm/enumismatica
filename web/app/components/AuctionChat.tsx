'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuctionChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { ChatMessage } from 'shared/types';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

interface AuctionChatProps {
  auctionId: string;
  auctionStatus: 'pending' | 'active' | 'ended' | 'cancelled' | 'rejected';
  isOwner?: boolean;
}

export default function AuctionChat({ auctionId, auctionStatus, isOwner = false }: AuctionChatProps) {
  const { user } = useAuth();
  const {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    searchTerm,
    setSearchTerm,
    searchResults,
    searching,
    handleSearch,
  } = useAuctionChat(auctionId, user?.uid || null);
  const [messageText, setMessageText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Auto-scroll chat content without moving the whole page when new messages arrive
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Always keep the latest messages in view inside the chat panel only
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;

    try {
      // Messages are anonymous during active bidding, revealed after auction ends
      const isAnonymous = auctionStatus === 'active' && !isOwner;
      await sendMessage(messageText, isAnonymous);
      setMessageText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwnMessage = message.senderId === user?.uid;
    const displayName = message.isAnonymous
      ? `Utilizator Anonim #${message.senderId.slice(-4)}`
      : message.senderName || 'Utilizator';
    const isRead = message.readBy && message.readBy.length > 1;

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          {/* Avatar and Name */}
          <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
            {!message.isAnonymous && message.senderAvatar ? (
              <img
                src={message.senderAvatar}
                alt={displayName}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-navy-800 flex items-center justify-center">
                <svg className="w-4 h-4 text-gold-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <span className="text-xs text-slate-200 font-medium">{displayName}</span>
            {message.isAnonymous && (
              <span className="text-xs text-gold-200 bg-navy-800 border border-gold-500/50 px-2 py-0.5 rounded">
                Anonim
              </span>
            )}
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
              </svg>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="bg-navy-900/70 border border-gold-500/30 rounded-2xl p-6 text-center">
        <svg className="w-12 h-12 text-gold-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-slate-200">Autentifică-te pentru a participa la chat</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-navy-900/80 border border-gold-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 px-4 py-3 border-b border-gold-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#e7b73c]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <h3 className="text-white font-semibold">Chat Licitație</h3>
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
            {auctionStatus === 'active' && !isOwner && (
              <span className="text-xs text-gold-200 bg-navy-800 border border-gold-500/50 px-2 py-1 rounded">
                Identitățile sunt ascunse
              </span>
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
                placeholder="Caută în chat..."
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
        
        {auctionStatus === 'ended' && (
          <p className="text-xs text-gold-200 mt-2">
            Licitația s-a încheiat. Identitățile sunt acum vizibile.
          </p>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-navy-950/70"
      >
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
            <p className="text-xs mt-1">Fii primul care trimite un mesaj!</p>
          </div>
        ) : (
          <>
            {(showSearch && searchResults.length > 0 ? searchResults : messages).map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      {auctionStatus !== 'cancelled' && auctionStatus !== 'rejected' && (
        <form onSubmit={handleSendMessage} className="border-t border-gold-500/20 p-4 bg-navy-900/90">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={
                auctionStatus === 'ended'
                  ? 'Licitația s-a încheiat...'
                  : 'Scrie un mesaj...'
              }
              disabled={sending || auctionStatus === 'ended'}
              className="flex-1 px-4 py-2 border border-gold-500/40 rounded-lg bg-navy-900/70 text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent disabled:bg-navy-900/40 disabled:text-slate-500 disabled:cursor-not-allowed"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sending || auctionStatus === 'ended'}
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
          <p className="text-xs text-slate-400 mt-2">
            {auctionStatus === 'active' && !isOwner
              ? 'Mesajele tale sunt anonime până la încheierea licitației'
              : auctionStatus === 'ended'
              ? 'Chat-ul este închis. Folosește mesajele private pentru a continua conversația.'
              : 'Mesajele tale vor fi vizibile tuturor participanților'}
          </p>
        </form>
      )}
    </div>
  );
}
