'use client';

import { useAuth } from '../../../context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  isAdmin,
  getUserAnalytics,
  getUserCollection,
  getUserConversations,
  getConversationMessages,
  deleteUserCollectionItem,
  deleteConversation,
} from 'shared/adminService';
import { User, CollectionItem, Conversation, ChatMessage } from 'shared/types';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function AdminUserDetail() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'collection' | 'messages'>('overview');

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      const adminStatus = await isAdmin(currentUser.uid);
      if (!adminStatus) {
        router.push('/dashboard');
        return;
      }

      setIsAdminUser(true);
      await loadUserData();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdminAndLoad();
    }
  }, [currentUser, authLoading, router, userId]);

  const loadUserData = async () => {
    try {
      // Load user document
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUser({
          id: userDoc.id,
          ...userDoc.data(),
          createdAt: userDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: userDoc.data().updatedAt?.toDate() || new Date(),
        } as User);
      }

      // Load analytics
      const analyticsData = await getUserAnalytics(userId);
      setAnalytics(analyticsData);

      // Load collection
      const collectionData = await getUserCollection(userId);
      setCollection(collectionData);

      // Load conversations
      const conversationsData = await getUserConversations(userId);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    const messages = await getConversationMessages(conversationId);
    setConversationMessages(messages);
    setSelectedConversation(conversationId);
  };

  const handleDeleteCollectionItem = async (itemId: string) => {
    if (!confirm('Șterge acest articol din colecția utilizatorului?')) return;
    
    const result = await deleteUserCollectionItem(userId, itemId);
    if (result.success) {
      await loadUserData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm('Șterge această conversație?')) return;
    
    const result = await deleteConversation(conversationId);
    if (result.success) {
      await loadUserData();
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setConversationMessages([]);
      }
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  if (authLoading || loading || !isAdminUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Utilizator negăsit</h1>
          <Link href="/admin/users" className="text-blue-600 hover:text-blue-800">
            ← Înapoi la utilizatori
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block">
            ← Înapoi la utilizatori
          </Link>
          <div className="flex items-center gap-4">
            {user.avatar && (
              <img src={user.avatar} alt={user.displayName} className="w-16 h-16 rounded-full" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user.displayName}</h1>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex gap-2 mt-2">
                {user.role === 'admin' && (
                  <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                    Admin
                  </span>
                )}
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                  ID: {user.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Produse</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalProducts}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Licitații</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalAuctions}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Licitări</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalBids}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Colecție</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalCollectionItems}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Conversații</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalConversations}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Valoare Colecție</p>
              <p className="text-2xl font-bold text-green-600">${analytics.collectionValue.toFixed(0)}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Prezentare Generală
            </button>
            <button
              onClick={() => setActiveTab('collection')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'collection'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Colecție ({collection.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Mesaje ({conversations.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistici Produse</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Aprobate:</span>
                  <span className="font-medium text-green-600">{analytics.approvedProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">În așteptare:</span>
                  <span className="font-medium text-yellow-600">{analytics.pendingProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Respinse:</span>
                  <span className="font-medium text-red-600">{analytics.rejectedProducts}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistici Licitații</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium text-green-600">{analytics.activeAuctions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Încheiate:</span>
                  <span className="font-medium text-gray-600">{analytics.endedAuctions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total licitări plasate:</span>
                  <span className="font-medium text-blue-600">{analytics.totalBids}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'collection' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Colecția Personală ({collection.length} articole)
              </h3>
              {collection.length === 0 ? (
                <p className="text-gray-500">Utilizatorul nu are articole în colecție.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collection.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <button
                          onClick={() => handleDeleteCollectionItem(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Șterge
                        </button>
                      </div>
                      <div className="text-sm space-y-1">
                        {item.country && <p className="text-gray-600">Țară: {item.country}</p>}
                        {item.year && <p className="text-gray-600">An: {item.year}</p>}
                        {item.metal && <p className="text-gray-600">Metal: {item.metal}</p>}
                        {item.grade && <p className="text-gray-600">Grad: {item.grade}</p>}
                        {item.currentValue && (
                          <p className="text-green-600 font-medium">Valoare: ${item.currentValue.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Conversații ({conversations.length})</h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm">Nicio conversație</p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedConversation === conv.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => loadConversationMessages(conv.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Conversație #{conv.id.slice(-6)}
                          </p>
                          {conv.lastMessage && (
                            <p className="text-sm text-gray-500 truncate mt-1">
                              {conv.lastMessage}
                            </p>
                          )}
                          {conv.auctionId && (
                            <p className="text-xs text-blue-600 mt-1">
                              Licitație: {conv.auctionId.slice(-6)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          className="text-red-600 hover:text-red-800 text-xs ml-2"
                        >
                          Șterge
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Messages View */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">
                  {selectedConversation ? `Mesaje Conversație` : 'Selectează o conversație'}
                </h3>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {!selectedConversation ? (
                  <p className="text-gray-500 text-center py-8">
                    Selectează o conversație pentru a vedea mesajele
                  </p>
                ) : conversationMessages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Niciun mesaj în această conversație</p>
                ) : (
                  <div className="space-y-4">
                    {conversationMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.senderId === userId
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm font-medium mb-1">
                            {msg.senderName || 'Unknown'}
                            {msg.senderId === userId && ' (Acest utilizator)'}
                          </p>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {msg.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}