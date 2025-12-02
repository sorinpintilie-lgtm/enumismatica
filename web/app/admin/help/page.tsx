'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpArticle, HelpCategory } from '../../../../shared/types';
import {
  getHelpArticles,
  getHelpCategories,
  createHelpArticle,
  updateHelpArticle,
  createHelpCategory,
  getHelpAnalytics
} from '../../../../shared/helpService';
import { auth } from '../../../../shared/firebaseConfig';

export default function AdminHelpManagement() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
  const [editingCategory, setEditingCategory] = useState<HelpCategory | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
    language: 'en' as 'ro' | 'en',
    tags: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    order: 0,
    parentCategoryId: '',
    language: 'en' as 'ro' | 'en'
  });
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Check admin authentication
        const user = auth.currentUser;
        if (!user) {
          router.push('/login');
          return;
        }

        // Load analytics
        const analyticsResult = await getHelpAnalytics();
        if (analyticsResult.success && analyticsResult.analytics) {
          setAnalytics(analyticsResult.analytics);
        }

        // Load categories
        const categoriesResult = await getHelpCategories();
        if (categoriesResult.success && categoriesResult.categories) {
          setCategories(categoriesResult.categories);
        }

        // Load articles
        const articlesResult = await getHelpArticles({
          status: 'published'
        });

        if (articlesResult.success && articlesResult.articles) {
          setArticles(articlesResult.articles);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading admin help data:', err);
        setError('Failed to load help management data');
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleArticleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      if (editingArticle) {
        // Update existing article
        const result = await updateHelpArticle(editingArticle.id, {
          title: formData.title,
          content: formData.content,
          categoryId: formData.categoryId,
          language: formData.language,
          tags: tagsArray,
          status: formData.status
        });

        if (result.success) {
          // Refresh articles
          const articlesResult = await getHelpArticles({ status: 'published' });
          if (articlesResult.success && articlesResult.articles) {
            setArticles(articlesResult.articles);
          }
          resetArticleForm();
        } else {
          setError(result.error || 'Failed to update article');
        }
      } else {
        // Create new article
        const result = await createHelpArticle({
          title: formData.title,
          content: formData.content,
          categoryId: formData.categoryId,
          language: formData.language,
          tags: tagsArray,
          createdBy: auth.currentUser?.uid || '',
          status: formData.status
        });

        if (result.success && result.articleId) {
          // Refresh articles
          const articlesResult = await getHelpArticles({ status: 'published' });
          if (articlesResult.success && articlesResult.articles) {
            setArticles(articlesResult.articles);
          }
          resetArticleForm();
        } else {
          setError(result.error || 'Failed to create article');
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error submitting article form:', err);
      setError('Failed to submit article form');
      setLoading(false);
    }
  };

  const handleCategoryFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const result = await createHelpCategory({
        name: categoryFormData.name,
        description: categoryFormData.description,
        order: categoryFormData.order,
        parentCategoryId: categoryFormData.parentCategoryId || undefined,
        language: categoryFormData.language
      });

      if (result.success) {
        // Refresh categories
        const categoriesResult = await getHelpCategories();
        if (categoriesResult.success && categoriesResult.categories) {
          setCategories(categoriesResult.categories);
        }
        resetCategoryForm();
      } else {
        setError(result.error || 'Failed to create category');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error submitting category form:', err);
      setError('Failed to submit category form');
      setLoading(false);
    }
  };

  const resetArticleForm = () => {
    setFormData({
      title: '',
      content: '',
      categoryId: '',
      language: 'en',
      tags: '',
      status: 'draft'
    });
    setEditingArticle(null);
    setShowArticleForm(false);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
      order: 0,
      parentCategoryId: '',
      language: 'en'
    });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const startEditingArticle = (article: HelpArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      categoryId: article.categoryId,
      language: article.language,
      tags: article.tags.join(', '),
      status: article.status
    });
    setShowArticleForm(true);
  };

  const startEditingCategory = (category: HelpCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description,
      order: category.order,
      parentCategoryId: category.parentCategoryId || '',
      language: category.language
    });
    setShowCategoryForm(true);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'General';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">Help Center Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Articles</h3>
            <p className="text-3xl font-bold text-blue-600">{analytics.totalArticles}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Views</h3>
            <p className="text-3xl font-bold text-blue-600">{analytics.totalViews}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Helpful Rating</h3>
            <p className="text-3xl font-bold text-blue-600">{analytics.helpfulRatingPercentage.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Most Viewed</h3>
            {analytics.mostViewedArticles.length > 0 && (
              <p className="text-sm text-blue-600 hover:underline cursor-pointer">
                {analytics.mostViewedArticles[0].title}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            resetArticleForm();
            setShowArticleForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create New Article
        </button>
        <button
          onClick={() => {
            resetCategoryForm();
            setShowCategoryForm(true);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Create New Category
        </button>
      </div>

      {/* Article Form */}
      {showArticleForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingArticle ? 'Edit Article' : 'Create New Article'}
          </h2>

          <form onSubmit={handleArticleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="w-full p-2 border rounded-md min-h-[200px]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({...formData, language: e.target.value as 'ro' | 'en'})}
                className="w-full p-2 border rounded-md"
              >
                <option value="en">English</option>
                <option value="ro">Română</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as 'draft' | 'published' | 'archived'})}
                className="w-full p-2 border rounded-md"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Saving...' : editingArticle ? 'Update Article' : 'Create Article'}
              </button>
              <button
                type="button"
                onClick={resetArticleForm}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Form */}
      {showCategoryForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </h2>

          <form onSubmit={handleCategoryFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                className="w-full p-2 border rounded-md min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <input
                type="number"
                value={categoryFormData.order}
                onChange={(e) => setCategoryFormData({...categoryFormData, order: parseInt(e.target.value) || 0})}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category (optional)</label>
              <select
                value={categoryFormData.parentCategoryId}
                onChange={(e) => setCategoryFormData({...categoryFormData, parentCategoryId: e.target.value})}
                className="w-full p-2 border rounded-md"
              >
                <option value="">No parent category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={categoryFormData.language}
                onChange={(e) => setCategoryFormData({...categoryFormData, language: e.target.value as 'ro' | 'en'})}
                className="w-full p-2 border rounded-md"
              >
                <option value="en">English</option>
                <option value="ro">Română</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300"
              >
                {loading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
              </button>
              <button
                type="button"
                onClick={resetCategoryForm}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Articles List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Help Articles</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No articles found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Language</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Views</th>
                  <th className="text-left p-3">Helpful</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{article.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">
                        {article.content.replace(/<[^>]*>/g, '').substring(0, 50)}...
                      </div>
                    </td>
                    <td className="p-3">{getCategoryName(article.categoryId)}</td>
                    <td className="p-3">{article.language.toUpperCase()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        article.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : article.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="p-3">{article.views}</td>
                    <td className="p-3">{article.helpfulCount}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditingArticle(article)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/help/${article.id}`)}
                          className="text-gray-600 hover:text-gray-800"
                          title="View"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}