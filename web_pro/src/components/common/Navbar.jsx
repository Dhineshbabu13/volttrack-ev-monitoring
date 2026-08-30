import React from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminAvatar } from '../../utils/avatarUtils';

export const Navbar = () => {
  const { currentUser, role, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-clean-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shadow-clean-sm transition-transform group-hover:scale-105 flex-shrink-0">
            <svg
              width={28}
              height={28}
              viewBox="0 0 24 24"
              style={{ fill: '#E30613', display: 'block', minWidth: 28, minHeight: 28 }}
            >
              <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className="font-extrabold text-xl tracking-tight text-brand-dark"
                style={{ WebkitTextFillColor: 'initial' }}
              >
                VOLT<span className="text-brand-red" style={{ color: '#E30613', WebkitTextFillColor: '#E30613' }}>TRACK</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-50 text-brand-red border border-red-200 font-bold uppercase tracking-wider">
                v2.6
              </span>
            </div>
            <p
              className="text-[10px] text-gray-500 font-medium tracking-wider uppercase"
              style={{ WebkitTextFillColor: 'initial' }}
            >
              EV Telemetry & Driver Monitoring
            </p>
          </div>
        </Link>

        {/* Live Network Telemetry status badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-gray-400 text-[11px]">STATUS:</span>
          <span className="font-bold text-gray-800 text-[11px] tracking-wide">TELEMETRY ONLINE</span>
          <span className="text-gray-300">|</span>
          <Radio className="w-3.5 h-3.5 text-brand-red animate-pulse" />
          <span className="text-[11px] text-gray-500 font-mono">1.2ms LATENCY</span>
        </div>

        {/* User Session Logout */}
        {currentUser && (
          <div className="flex items-center space-x-3">
            <AdminAvatar
              name={currentUser.name || currentUser.admin_name || currentUser.adminId}
              id={currentUser.adminId || currentUser.id || currentUser.name}
              size="sm"
            />
            <span className="hidden sm:inline text-xs font-semibold text-gray-700 font-mono">
              {currentUser.name || currentUser.admin_name || currentUser.adminId} ({role})
            </span>
            <button
              onClick={logout}
              className="text-xs px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
