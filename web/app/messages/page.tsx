'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ConversationList, PrivateChat } from '../components/PrivateChat';
import Link from 'next/link';

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Autentificare necesară</h2>
            <p className="text-gray-600 mb-6">
              Trebuie să fii autentificat pentru a accesa mesajele tale
            </p>
            <Link
              href="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Autentifică-te
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mesajele Mele</h1>
        <p className="text-gray-600">
          Conversații private cu vânzătorii și cumpărătorii
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List - Left Sidebar */}
        <div className="lg:col-span-1">
          <ConversationList
            onSelectConversation={setSelectedConversationId}
            selectedConversationId={selectedConversationId}
          />
        </div>

        {/* Chat Area - Main Content */}
        <div className="lg:col-span-2">
          <PrivateChat
            conversationId={selectedConversationId}
            onClose={() => setSelectedConversationId(null)}
          />
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Despre Mesajele Private
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Conversațiile private se deschid automat după încheierea licitațiilor</li>
              <li>• Identitățile sunt vizibile în mesajele private</li>
              <li>• Poți discuta detalii despre livrare, plată și alte aspecte ale tranzacției</li>
              <li>• Mesajele sunt securizate și vizibile doar pentru tine și cealaltă parte</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
