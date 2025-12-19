'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	isAdmin,
	isSuperAdmin,
	getAllConversations,
	getConversationMessages,
	deleteConversation,
} from 'shared/adminService';
import { Conversation, ChatMessage } from 'shared/types';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

export default function AdminConversations() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
		const checkAdmin = async () => {
			if (!user) {
				router.push('/login');
				return;
			}

			const adminStatus = await isAdmin(user.uid);
			if (!adminStatus) {
				router.push('/dashboard');
				return;
			}

			// Full conversation monitoring/deletion is restricted to super-admins.
			const superAdminStatus = await isSuperAdmin(user.uid);
			if (!superAdminStatus) {
				router.push('/admin/moderator');
				return;
			}

			setIsAdminUser(true);
			await loadConversations();
			setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const loadConversations = async () => {
    const allConversations = await getAllConversations();
    setConversations(allConversations);
  };

  const loadMessages = async (conversationId: string) => {
    const msgs = await getConversationMessages(conversationId);
    setMessages(msgs);
    setSelectedConversation(conversationId);
  };

  const handleDelete = async (conversationId: string) => {
    if (!confirm('Șterge această conversație și toate mesajele?')) return;
    
    const result = await deleteConversation(conversationId);
    if (result.success) {
      await loadConversations();
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      conv.id.toLowerCase().includes(search) ||
      conv.buyerId.toLowerCase().includes(search) ||
      conv.sellerId.toLowerCase().includes(search) ||
      conv.lastMessage?.toLowerCase().includes(search)
    );
  });

  if (authLoading || loading || !isAdminUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Toate Conversațiile</h1>
            <p className="text-gray-600 mt-1">Monitorizează toate conversațiile private din platformă</p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Înapoi la Admin
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Caută conversații..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                Conversații ({filteredConversations.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-[700px] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <p className="p-4 text-gray-500 text-sm">
                  {searchTerm ? 'Niciun rezultat găsit' : 'Nicio conversație'}
                </p>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation === conv.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => loadMessages(conv.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Conversație #{conv.id.slice(-6)}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            Cumpărător: {conv.buyerId.slice(-6)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Vânzător: {conv.sellerId.slice(-6)}
                          </span>
                        </div>
                        {conv.auctionId && (
                          <Link
                            href={`/auctions/${conv.auctionId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                          >
                            Licitație: {conv.auctionId.slice(-6)}
                          </Link>
                        )}
                        {conv.lastMessage && (
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {conv.lastMessage}
                          </p>
                        )}
                        {conv.lastMessageAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(conv.lastMessageAt, { addSuffix: true, locale: ro })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conv.id);
                        }}
                        className="text-red-600 hover:text-red-800 text-xs ml-2"
                      >
                        Șterge
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        conv.status === 'active' ? 'bg-green-100 text-green-800' :
                        conv.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {conv.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Messages View */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                {selectedConversation ? `Mesaje Conversație #${selectedConversation.slice(-6)}` : 'Selectează o conversație'}
              </h3>
            </div>
            <div className="p-4 max-h-[700px] overflow-y-auto">
              {!selectedConversation ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>Selectează o conversație pentru a vedea mesajele</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Niciun mesaj în această conversație</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {msg.senderAvatar && (
                            <img src={msg.senderAvatar} alt={msg.senderName || 'User'} className="w-8 h-8 rounded-full" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {msg.senderName || 'Unknown User'}
                            </p>
                            <p className="text-xs text-gray-500">
                              ID: {msg.senderId.slice(-8)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {msg.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                      {msg.edited && (
                        <p className="text-xs text-gray-500 italic mt-2">(Editat)</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
