/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  /** Show a transient confirmation. `message` must already be translated. */
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => undefined });

const TONE = {
  success: { icon: CheckCircle2, className: 'border-accent/40 bg-accent/10 text-accent' },
  error: { icon: AlertTriangle, className: 'border-danger/40 bg-danger/10 text-danger' },
  info: { icon: Info, className: 'border-border bg-surface text-text-primary' },
} as const;

/**
 * In-app confirmations, replacing the browser `alert()` this app used to call.
 * A native dialog cannot be translated, blocks the render loop, and on a kiosk
 * it drops an OS-styled box on top of the demo.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[400] flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <AnimatePresence>
          {toasts.map(toast => {
            const { icon: Icon, className } = TONE[toast.tone];
            return (
              <motion.div
                key={toast.id}
                role="status"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                className={`pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-medium shadow-2xl backdrop-blur-md ${className}`}
              >
                <Icon size={14} className="mt-0.5 shrink-0" />
                <span className="leading-relaxed">{toast.message}</span>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="ml-1 cursor-pointer opacity-60 transition-opacity hover:opacity-100"
                  aria-label="close"
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastContextValue => useContext(ToastContext);
