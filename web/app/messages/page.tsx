'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ConversationList, PrivateChat } from '../components/PrivateChat';
import Link from 'next/link';

function MessagesPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Read conversation from URL params
  useEffect(() => {
    const conversationParam = searchParams.get('conversation');
    if (conversationParam) {
      setSelectedConversationId(conversationParam);
    }
  }, [searchParams]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-gold-500/40 bg-navy-900/85 px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
            <svg className="w-16 h-16 text-[#e7b73c] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">Autentificare necesară</h2>
            <p className="text-slate-200 mb-6">
              Trebuie să fii autentificat pentru a accesa mesajele tale.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-3 text-sm font-semibold text-[#000940] shadow-[0_0_25px_rgba(231,183,60,0.7)] hover:bg-[#f0c955] transition-colors"
            >
              Autentifică-te
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-120px)] flex flex-col">
      <div className="mb-6 rounded-3xl border border-gold-500/40 bg-gradient-to-r from-navy-700 via-navy-800 to-navy-900 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
        <h1 className="text-3xl font-bold text-white mb-2">Mesajele Mele</h1>
        <p className="text-sm text-slate-300">
          Conversații private cu vânzătorii și cumpărătorii
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Conversations List - Left Sidebar */}
        <div className="lg:col-span-1 min-h-0">
          <ConversationList
            onSelectConversation={setSelectedConversationId}
            selectedConversationId={selectedConversationId}
          />
        </div>

        {/* Chat Area - Main Content */}
        <div className="lg:col-span-2 min-h-0">
          <PrivateChat
            conversationId={selectedConversationId}
            onClose={() => setSelectedConversationId(null)}
          />
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-gold-500/40 bg-navy-900/85 px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e7b73c] mx-auto mb-4"></div>
            <p className="text-slate-200">Se încarcă...</p>
          </div>
        </div>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
