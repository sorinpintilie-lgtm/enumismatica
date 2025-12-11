'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { HelpArticle, HelpCategory } from '../../../../shared/types';
import { getHelpArticle, getHelpCategories, submitHelpFeedback } from '../../../../shared/helpService';
import Link from 'next/link';

export default function HelpArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<'helpful' | 'not_helpful' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load article
        const articleResult = await getHelpArticle(id);
        if (articleResult.success && articleResult.article) {
          setArticle(articleResult.article);
        } else {
          setError('Article not found');
        }

        // Load categories for breadcrumb
        const categoriesResult = await getHelpCategories();
        if (categoriesResult.success && categoriesResult.categories) {
          setCategories(categoriesResult.categories);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading help article:', err);
        setError('Failed to load help article');
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleFeedbackSubmit = async () => {
    if (!feedbackRating || !article) return;

    try {
      setIsSubmitting(true);
      const result = await submitHelpFeedback(
        article.id,
        'current-user-id', // In real app, this would be the actual user ID
        feedbackRating,
        feedbackComment
      );

      if (result.success) {
        setFeedbackSubmitted(true);
        // Update local state to reflect the feedback
        setArticle(prev => prev ? {
          ...prev,
          [feedbackRating === 'helpful' ? 'helpfulCount' : 'notHelpfulCount']:
            prev[feedbackRating === 'helpful' ? 'helpfulCount' : 'notHelpfulCount'] + 1
        } : null);
      } else {
        setError('Failed to submit feedback');
      }
      setIsSubmitting(false);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback');
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'General';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading article...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error || 'Article not found'}
        </div>
        <Link href="/help" className="text-blue-600 hover:underline">
          ← Back to Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="mb-4">
        <Link href="/help" className="text-blue-600 hover:underline">
          Help Center
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-600">{getCategoryName(article.categoryId)}</span>
      </nav>

      <article className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-4">{article.title}</h1>

        <div className="flex items-center text-sm text-gray-500 mb-6 gap-4">
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
            {article.helpfulCount} found this helpful
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7.5 14.5m4.5 6.5l-3.5-7A2 2 0 008.263 7h-4.017c-.163 0-.326-.02-.485-.06L2.5 10.5" />
            </svg>
            {article.notHelpfulCount} found this not helpful
          </span>
        </div>

        {/* Article Content */}
        <div className="prose max-w-none mb-8">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        <div className="border-t pt-6 mt-8">
          <h3 className="text-xl font-semibold mb-4">Was this article helpful?</h3>

          {feedbackSubmitted ? (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Thank you for your feedback!
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setFeedbackRating('helpful')}
                  className={`flex-1 py-2 px-4 rounded-md border ${
                    feedbackRating === 'helpful'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7.5 14.5m4.5 6.5l-3.5-7A2 2 0 008.263 7h-4.017c-.163 0-.326-.02-.485-.06L2.5 10.5" />
                  </svg>
                  Yes, this was helpful
                </button>
                <button
                  onClick={() => setFeedbackRating('not_helpful')}
                  className={`flex-1 py-2 px-4 rounded-md border ${
                    feedbackRating === 'not_helpful'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.737 3h4.017c.163 0 .326.02.485.06L16.5 9.5m-4.5-6.5l3.5 7A2 2 0 0015.737 16H10.717c.163 0 .326.02.485.06L16.5 10.5" />
                  </svg>
                  No, this wasn't helpful
                </button>
              </div>

              {feedbackRating === 'not_helpful' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How can we improve this article? (optional)
                  </label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="What information are you missing? What could be clearer?"
                    className="w-full p-3 border rounded-md min-h-[100px]"
                  />
                </div>
              )}

              <button
                onClick={handleFeedbackSubmit}
                disabled={!feedbackRating || isSubmitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Back to Help Center */}
      <div className="mt-8 text-center">
        <Link href="/help" className="text-blue-600 hover:underline">
          ← Back to Help Center
        </Link>
      </div>
    </div>
  );
}