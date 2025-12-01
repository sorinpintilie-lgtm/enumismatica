'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (toast: { type?: ToastType; title?: string; message: string }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = 'info', title, message }: { type?: ToastType; title?: string; message: string }) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, title, message }]);
      // Auto-dismiss after 5 seconds
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => {
          const baseClasses =
            'pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.6)] backdrop-blur-sm flex items-start gap-3';
          const typeClasses =
            toast.type === 'success'
              ? 'bg-emerald-900/80 border-emerald-400/50 text-emerald-50'
              : toast.type === 'error'
              ? 'bg-red-900/80 border-red-500/60 text-red-50'
              : 'bg-navy-900/90 border-gold-500/40 text-slate-50';

          return (
            <div key={toast.id} className={`${baseClasses} ${typeClasses}`}>
              <div className="mt-1">
                {toast.type === 'success' && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 text-sm">
                    ✓
                  </span>
                )}
                {toast.type === 'error' && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-200 text-sm">
                    !
                  </span>
                )}
                {toast.type === 'info' && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold-500/20 text-gold-100 text-sm">
                    i
                  </span>
                )}
              </div>
              <div className="flex-1">
                {toast.title && <p className="text-sm font-semibold mb-0.5">{toast.title}</p>}
                <p className="text-xs text-slate-100/90">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="ml-2 text-xs text-slate-200/80 hover:text-white"
                aria-label="Închide notificarea"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}