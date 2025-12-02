'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpArticle, HelpCategory } from '../../../shared/types';
import { getHelpArticles, getHelpCategories, searchHelpContent } from '../../../shared/helpService';
import Link from 'next/link';

export default function HelpCenterPage() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ro' | 'en'>('en');
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load categories
        const categoriesResult = await getHelpCategories();
        if (categoriesResult.success && categoriesResult.categories) {
          setCategories(categoriesResult.categories);
        }

        // Load articles
        const articlesResult = await getHelpArticles({
          language,
          status: 'published'
        });

        if (articlesResult.success && articlesResult.articles) {
          setArticles(articlesResult.articles);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading help center data:', err);
        setError('Failed to load help center data');
        setLoading(false);
      }
    }

    loadData();
  }, [language]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const result = await searchHelpContent(searchQuery, language);

      if (result.success && result.results) {
        // Convert search results to articles
        const articleIds = result.results.map(r => r.articleId);
        const articlesResult = await getHelpArticles({
          language,
          status: 'published'
        });

        if (articlesResult.success && articlesResult.articles) {
          const filteredArticles = articlesResult.articles.filter(article =>
            articleIds.includes(article.id)
          );
          setSearchResults(filteredArticles);
        }
      } else {
        setSearchResults([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error searching help content:', err);
      setError('Failed to search help content');
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    setSearchQuery('');
    setSearchResults([]);
  };

  const filteredArticles = selectedCategory
    ? articles.filter(article => article.categoryId === selectedCategory)
    : searchResults.length > 0
      ? searchResults
      : articles;

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'General';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Help Center</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar - Categories */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Categories</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'ro' | 'en')}
                className="w-full p-2 border rounded-md"
              >
                <option value="en">English</option>
                <option value="ro">Română</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search help articles..."
                  className="flex-1 p-2 border rounded-md"
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {categories
                .filter(cat => cat.language === language)
                .sort((a, b) => a.order - b.order)
                .map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`w-full text-left p-2 rounded-md ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Main Content - Articles */}
        <div className="lg:w-3/4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading help articles...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">No articles found</h3>
              <p className="text-gray-600">
                {searchQuery
                  ? 'No articles match your search. Try different keywords.'
                  : 'No articles available in this category.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/help/${article.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-blue-600 hover:underline">
                      {article.title}
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      {getCategoryName(article.categoryId)}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {article.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                  </p>

                  <div className="flex items-center text-sm text-gray-500 justify-between">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {article.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7.5 14.5m4.5 6.5l-3.5-7A2 2 0 008.263 7h-4.017c-.163 0-.326-.02-.485-.06L2.5 10.5" />
                        </svg>
                        {article.helpfulCount} helpful
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {article.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}