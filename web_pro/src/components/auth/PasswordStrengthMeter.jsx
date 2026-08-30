import React from 'react';
import { Check, X, ShieldCheck } from 'lucide-react';

export const calculatePasswordStrength = (password = '') => {
  const criteria = [
    { id: 'length', label: '8+ Characters', met: password.length >= 8 },
    { id: 'upper', label: 'Uppercase Letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'number', label: 'Number (0-9)', met: /[0-9]/.test(password) },
    { id: 'special', label: 'Special Character (@$!%*#?&)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = criteria.filter((c) => c.met).length;

  let label = 'Very Weak';
  let color = 'bg-red-500 text-red-600';
  let percentage = 20;

  if (score === 1) {
    label = 'Weak';
    color = 'bg-orange-500 text-orange-600';
    percentage = 35;
  } else if (score === 2) {
    label = 'Fair';
    color = 'bg-amber-500 text-amber-600';
    percentage = 60;
  } else if (score === 3) {
    label = 'Good';
    color = 'bg-blue-600 text-blue-600';
    percentage = 80;
  } else if (score === 4) {
    label = 'Strong';
    color = 'bg-emerald-600 text-emerald-600';
    percentage = 100;
  }

  return { criteria, score, label, color, percentage, isValid: score >= 3 };
};

export const PasswordStrengthMeter = ({ password = '' }) => {
  const { criteria, score, label, color, percentage } = calculatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1 text-xs">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-gray-600">
          <span className="font-medium text-[11px]">Password Strength:</span>
          <span className={`font-mono font-bold text-[11px] ${color.split(' ')[1]}`}>
            {percentage}% — {label}
          </span>
        </div>

        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              score <= 1
                ? 'bg-red-500'
                : score === 2
                ? 'bg-amber-500'
                : score === 3
                ? 'bg-blue-600'
                : 'bg-emerald-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 pt-1">
        {criteria.map((item) => (
          <div
            key={item.id}
            className={`flex items-center space-x-1 text-[11px] ${
              item.met ? 'text-emerald-600 font-medium' : 'text-gray-400'
            }`}
          >
            {item.met ? (
              <Check className="w-3 h-3 flex-shrink-0 text-emerald-600" />
            ) : (
              <X className="w-3 h-3 flex-shrink-0 text-gray-400" />
            )}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
