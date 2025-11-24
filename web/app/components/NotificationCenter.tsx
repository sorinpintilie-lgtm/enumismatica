'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import Link from 'next/link';

export default function NotificationCenter() {
  const { user } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    permissionGranted,
    requestPermission,
    markAsRead,
    markAllAsRead,
  } = useNotifications(user?.uid || null);
  const [isOpen, setIsOpen] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    // Check if we should show permission prompt
    if (user && !permissionGranted && 'Notification' in window && Notification.permission === 'default') {
      setShowPermissionPrompt(true);
    }
  }, [user, permissionGranted]);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setShowPermissionPrompt(false);
    if (granted) {
      console.log('Notification permission granted');
    }
  };

  const handleNotificationClick = async (notificationId: string, conversationId?: string, auctionId?: string) => {
    await markAsRead(notificationId);
    setIsOpen(false);
    
    // Navigate to the relevant page
    if (conversationId) {
      window.location.href = `/messages?conversation=${conversationId}`;
    } else if (auctionId) {
      window.location.href = `/auctions/${auctionId}`;
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Notificări</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Marchează toate ca citite
                </button>
              )}
            </div>

            {/* Permission Prompt */}
            {showPermissionPrompt && (
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 font-medium mb-1">
                      Activează notificările
                    </p>
                    <p className="text-xs text-blue-700 mb-2">
                      Primește notificări pentru mesaje noi
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRequestPermission}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-medium"
                      >
                        Activează
                      </button>
                      <button
                        onClick={() => setShowPermissionPrompt(false)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Mai târziu
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-sm">Nicio notificare</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(
                        notification.id,
                        notification.conversationId,
                        notification.auctionId
                      )}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          !notification.read ? 'bg-blue-600' : 'bg-transparent'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {notification.senderName}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              notification.type === 'new_message' ? 'bg-blue-100 text-blue-800' :
                              notification.type === 'auction_chat' ? 'bg-amber-100 text-amber-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {notification.type === 'new_message' ? 'Mesaj nou' :
                               notification.type === 'auction_chat' ? 'Chat licitație' :
                               'Conversație nouă'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: ro })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <Link
                  href="/messages"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium block text-center"
                >
                  Vezi toate conversațiile →
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
