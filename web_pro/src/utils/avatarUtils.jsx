import React from 'react';

/**
 * Extract uppercase initials from a name or username.
 * e.g., "Keerthika" -> "K", "Keerthika E" -> "KE", "John Doe" -> "JD"
 */
export function getInitials(name) {
  if (!name) return 'A';
  const cleanName = name.trim().replace(/^admin_/i, '');
  const parts = cleanName.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PALETTE = [
  '#E30613', // Brand Red
  '#1E293B', // Deep Charcoal
  '#0F766E', // Dark Teal
  '#4338CA', // Indigo
  '#7C2D12', // Warm Amber/Brown
  '#334155', // Slate
  '#991B1B', // Burgundy
];

/**
 * Deterministically hash an ID or string to pick a consistent color from PALETTE.
 */
export function getAvatarColor(str) {
  if (!str) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

/**
 * AdminAvatar component: Renders a circle with initials or optional photo
 */
export function AdminAvatar({ name, id, photoUrl, size = 'md', className = '' }) {
  const initials = getInitials(name || id || 'Admin');
  const bgColor = getAvatarColor(id || name || 'Admin');

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base font-bold',
    xl: 'w-16 h-16 text-xl font-bold',
  };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || 'Admin'}
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full object-cover border border-gray-200 shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size] || sizeClasses.md} rounded-full flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0 select-none ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name || id}
    >
      {initials}
    </div>
  );
}
