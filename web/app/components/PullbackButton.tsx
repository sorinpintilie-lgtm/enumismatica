import React, { useState } from 'react';
import { useToast } from './ToastProvider';

interface PullbackButtonProps {
  itemId: string;
  itemType: 'product' | 'auction';
  onPullbackSuccess: () => void;
  disabled?: boolean;
  className?: string;
}

export function PullbackButton({
  itemId,
  itemType,
  onPullbackSuccess,
  disabled = false,
  className = ''
}: PullbackButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handlePullback = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/${itemType === 'product' ? 'products' : 'auctions'}/${itemId}/pullback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la returnarea în colecție');
      }

      const data = await response.json();
      
      showToast({
        type: 'success',
        title: 'Succes',
        message: data.message || 'Articolul a fost returnat în colecție cu succes',
      });

      setIsDialogOpen(false);
      onPullbackSuccess();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Eroare',
        message: error instanceof Error ? error.message : 'Eroare la returnarea în colecție',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Se procesează...
          </span>
        ) : (
          'Retrage în colecție'
        )}
      </button>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmă retragerea
              </h3>
              <button
                onClick={() => setIsDialogOpen(false)}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Ești sigur că dorești să retragi acest {itemType === 'product' ? 'produs' : 'licitație'} în colecția ta personală?
            </p>

            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Notă:</strong> Această acțiune este imediată și nu necesită aprobarea administratorului. Articolul va fi returnat în colecția ta personală.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsDialogOpen(false)}
                disabled={isLoading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-navy-700"
              >
                Anulează
              </button>
              <button
                onClick={handlePullback}
                disabled={isLoading}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} dark:bg-blue-500 dark:hover:bg-blue-600`}
              >
                {isLoading ? 'Se procesează...' : 'Confirmă retragerea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}