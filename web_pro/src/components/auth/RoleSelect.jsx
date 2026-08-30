import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Gauge, ArrowRight } from 'lucide-react';

export const RoleSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col justify-center">
      {/* Top Hero Section: Split Headline + Real EV Car Image */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center mb-6 lg:mb-8">
        {/* Left Column: Heading & Subtitle */}
        <div className="lg:col-span-6 space-y-3 text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-red-50 text-brand-red border border-red-200 text-xs font-bold uppercase tracking-wider">
            <span style={{ WebkitTextFillColor: 'initial' }}>Electric Fleet Sentinel</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-brand-dark leading-tight"
            style={{ WebkitTextFillColor: 'initial' }}
          >
            Select Your <span className="text-brand-red" style={{ color: '#E30613', WebkitTextFillColor: '#E30613' }}>Access Portal</span>
          </h1>

          <p
            className="text-sm sm:text-base text-gray-600 font-normal leading-relaxed max-w-lg"
            style={{ WebkitTextFillColor: 'initial' }}
          >
            Real-time electric vehicle telemetry, battery analytics, and driver safety ecosystem. Choose your portal to proceed.
          </p>
        </div>

        {/* Right Column: Single Real High-Quality EV Car Hero Image */}
        <div className="lg:col-span-6">
          <div className="relative rounded-2xl overflow-hidden shadow-clean-md border border-gray-200 bg-white">
            <img
              src="/assets/ev-hero-car.jpg"
              alt="High-Performance Electric Vehicle"
              className="w-full h-44 sm:h-56 lg:h-64 object-cover object-center transform hover:scale-[1.02] transition-transform duration-500"
            />
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-[11px] font-mono text-white font-medium">
              High-Voltage Telemetry Active
            </div>
          </div>
        </div>
      </div>

      {/* Compact Portal Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto w-full">
        {/* Card 1: Admin Portal */}
        <div
          onClick={() => navigate('/auth/admin')}
          className="group cursor-pointer p-5 sm:p-6 rounded-xl bg-white border border-gray-200 hover:border-brand-red shadow-clean-sm hover:shadow-clean-md transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                Command Level
              </span>
            </div>

            <h2
              className="text-xl font-bold text-brand-dark mb-1 group-hover:text-brand-red transition-colors"
              style={{ WebkitTextFillColor: 'initial' }}
            >
              Admin Portal
            </h2>

            <p
              className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4"
              style={{ WebkitTextFillColor: 'initial' }}
            >
              Centralized fleet oversight, live multi-vehicle telemetry, battery thermal alerts, and driver roster management.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-brand-red text-xs sm:text-sm font-semibold">
            <span style={{ WebkitTextFillColor: 'initial' }}>Enter Fleet Command</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Driver Login */}
        <div
          onClick={() => navigate('/auth/driver')}
          className="group cursor-pointer p-5 sm:p-6 rounded-xl bg-white border border-gray-200 hover:border-brand-red shadow-clean-sm hover:shadow-clean-md transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors">
                <Gauge className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                Pilot & Vehicle
              </span>
            </div>

            <h2
              className="text-xl font-bold text-brand-dark mb-1 group-hover:text-brand-red transition-colors"
              style={{ WebkitTextFillColor: 'initial' }}
            >
              Driver Login
            </h2>

            <p
              className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4"
              style={{ WebkitTextFillColor: 'initial' }}
            >
              Personal EV telemetry cockpit, live SoC % battery status, dynamic range calculator, and trip efficiency logs.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-brand-red text-xs sm:text-sm font-semibold">
            <span style={{ WebkitTextFillColor: 'initial' }}>Sign In or Register Vehicle</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
