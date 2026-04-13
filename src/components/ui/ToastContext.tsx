import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "pointer-events-auto flex items-center gap-3 py-3 px-4 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border backdrop-blur-md min-w-[300px]",
                toast.type === 'success' ? "bg-emerald-50/90 border-emerald-500/20 text-emerald-800" :
                toast.type === 'error' ? "bg-red-50/90 border-red-500/20 text-red-800" :
                "bg-blue-50/90 border-blue-500/20 text-blue-800"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full shadow-inner",
                toast.type === 'success' ? "bg-emerald-500 text-white" :
                toast.type === 'error' ? "bg-red-500 text-white" :
                "bg-blue-500 text-white"
              )}>
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5" />}
                {toast.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              
              <p className="flex-1 text-sm font-semibold">{toast.message}</p>
              
              <button 
                onClick={() => removeToast(toast.id)}
                className={cn(
                  "opacity-50 hover:opacity-100 transition-opacity",
                  toast.type === 'success' ? "text-emerald-800" :
                  toast.type === 'error' ? "text-red-800" :
                  "text-blue-800"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
