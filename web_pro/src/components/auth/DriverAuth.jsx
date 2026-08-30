import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Gauge, LogIn, UserPlus } from 'lucide-react';
import { DriverSignIn } from './DriverSignIn';
import { DriverSignUp } from './DriverSignUp';

export const DriverAuth = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'signup' ? { mode: 'signup' } : {});
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8">
      <div className="p-6 sm:p-8 rounded-xl bg-white border border-gray-200 shadow-clean-md">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-brand-red mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Role Selection</span>
        </Link>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center space-x-1.5 text-brand-red mb-1">
            <Gauge className="w-4 h-4" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase">
              EV Pilot & Cockpit
            </span>
          </div>
          <h2 className="text-2xl font-bold text-brand-dark">Driver Portal</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeTab === 'signin'
              ? 'Access vehicle telemetry, battery health, and driving statistics'
              : 'Register your electric vehicle and pair your driver telemetry ID'}
          </p>
        </div>

        {/* Sliding Tab Switcher */}
        <div className="p-1 rounded-lg bg-gray-100 border border-gray-200 flex items-center mb-6">
          <button
            type="button"
            onClick={() => handleTabSwitch('signin')}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'signin'
                ? 'bg-brand-red text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('signup')}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'signup'
                ? 'bg-brand-red text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up / Onboard</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'signin' ? <DriverSignIn /> : <DriverSignUp />}
      </div>
    </div>
  );
};
