import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', title = '', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, title };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
          borderColor: 'border-emerald-200',
        };
      case 'error':
        return {
          icon: <XCircle className="w-5 h-5 text-brand-red flex-shrink-0" />,
          borderColor: 'border-red-200',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
          borderColor: 'border-amber-200',
        };
      case 'charge':
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-brand-red flex-shrink-0" />,
          borderColor: 'border-red-200',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-lg p-3.5 bg-white border ${styles.borderColor} shadow-clean-lg flex items-start space-x-3 transition-all duration-200`}
            >
              {styles.icon}
              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <div className="text-xs font-bold text-gray-900 mb-0.5">
                    {toast.title}
                  </div>
                )}
                <p className="text-xs text-gray-600 leading-snug">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
