'use client';

import { useState, useEffect } from 'react';
import { HelpArticle } from 'shared/types';
import { getPopularHelpArticles } from 'shared/helpService';
import Link from 'next/link';

export default function HelpWidget() {
  const [popularArticles, setPopularArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadPopularArticles() {
      try {
        setLoading(true);
        const result = await getPopularHelpArticles(3);

        if (result.success && result.articles) {
          setPopularArticles(result.articles);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading popular articles:', err);
        setError('Failed to load popular articles');
        setLoading(false);
      }
    }

    loadPopularArticles();
  }, []);

  const toggleWidget = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Help Widget Button */}
      <button
        onClick={toggleWidget}
        className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Help Center"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Help Widget Content */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 bg-white rounded-lg shadow-xl border overflow-hidden">
          <div className="bg-blue-600 text-white p-4">
            <h3 className="font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help Center
            </h3>
          </div>

          <div className="p-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mb-3">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading popular articles...</p>
              </div>
            ) : popularArticles.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">No popular articles available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {popularArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/help/${article.id}`}
                    className="block p-3 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <h4 className="font-medium text-sm mb-1 line-clamp-1">{article.title}</h4>
                    <div className="flex items-center text-xs text-gray-500 gap-2">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {article.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7.5 14.5m4.5 6.5l-3.5-7A2 2 0 008.263 7h-4.017c-.163 0-.326-.02-.485-.06L2.5 10.5" />
                        </svg>
                        {article.helpfulCount}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t">
              <Link
                href="/help"
                className="block w-full text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm"
                onClick={() => setIsOpen(false)}
              >
                Browse All Articles
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}