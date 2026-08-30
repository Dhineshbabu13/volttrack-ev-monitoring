import React from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

export const ChargeButton = ({
  children,
  onClick,
  type = 'button',
  variant = 'red', // 'red' | 'dark' | 'outline' | 'white'
  isLoading = false,
  loadingText = 'Processing...',
  icon: Icon = ArrowRight,
  className = '',
  disabled = false,
  fullWidth = true
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'red':
      case 'green': // Backward compatibility
        return 'bg-brand-red hover:bg-brand-red-hover active:bg-brand-red-dark text-white font-semibold shadow-sm';
      case 'dark':
      case 'blue':
        return 'bg-brand-dark hover:bg-black text-white font-semibold shadow-sm';
      case 'white':
        return 'bg-white hover:bg-gray-50 text-brand-dark font-semibold border border-gray-300 shadow-clean-sm';
      case 'outline':
      default:
        return 'bg-transparent text-gray-700 border border-gray-300 hover:border-brand-red hover:text-brand-red';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`relative flex items-center justify-center space-x-2 py-3 px-5 rounded-lg text-sm font-semibold transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed ${
        fullWidth ? 'w-full' : ''
      } ${getVariantStyles()} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {Icon && <Icon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
        </>
      )}
    </button>
  );
};
