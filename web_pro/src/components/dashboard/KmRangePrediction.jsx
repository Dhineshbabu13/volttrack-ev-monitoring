import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Zap,
  Users,
  Info,
  CheckCircle2,
  Cpu,
  Navigation,
  Car,
  Activity,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Compass,
  ArrowRight
} from 'lucide-react';

/**
 * KM Range Tab: Full EV Trip Planner with Explicit "Predict Range" Button
 */
export const KmRangePrediction = ({ driverId, vehicle, latestTelemetry }) => {
  // Catalog state for Brands and Models
  const [catalog, setCatalog] = useState({ brands: [], vehicles: [] });
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [currentSpecs, setCurrentSpecs] = useState(null);

  // User input states
  const defaultSoc = latestTelemetry?.soc_percent != null ? Number(latestTelemetry.soc_percent) : 80;
  const defaultRoute = latestTelemetry?.route_type || 'City';
  
  const [socPercent, setSocPercent] = useState(defaultSoc);
  const [routeType, setRouteType] = useState(defaultRoute);
  const [passengerCount, setPassengerCount] = useState(1);
  const [destinationDistance, setDestinationDistance] = useState(150);

  // Explicit prediction state
  const [hasPredicted, setHasPredicted] = useState(false);
  const [predictedRange, setPredictedRange] = useState(null);
  const [modelR2, setModelR2] = useState(0.8891);
  const [modelName, setModelName] = useState('Random Forest Regressor');

  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  // Max passenger seating capacity for currently selected vehicle model (default to 5)
  const maxPassengerCap = currentSpecs?.max_passenger_capacity != null ? Number(currentSpecs.max_passenger_capacity) : 5;

  // 1. Fetch Vehicle Catalog (Brands & Models with real specs) on mount
  useEffect(() => {
    fetch('http://localhost:4000/api/driver/vehicle-catalog')
      .then((res) => res.json())
      .then((data) => {
        if (data.brands && data.vehicles) {
          // Deduplicate vehicles by (brand + model)
          const uniqueVehiclesMap = new Map();
          data.vehicles.forEach((v) => {
            const key = `${v.vehicle_brand}::${v.vehicle_model}`;
            if (!uniqueVehiclesMap.has(key)) {
              uniqueVehiclesMap.set(key, v);
            }
          });
          const deduplicatedVehicles = Array.from(uniqueVehiclesMap.values());
          const catalogData = { brands: data.brands, vehicles: deduplicatedVehicles };
          setCatalog(catalogData);
          
          // Initial Brand & Model selection
          const driverBrand = vehicle?.vehicle_brand || data.brands[0] || 'Tata';
          setSelectedBrand(driverBrand);

          const matchingVehicles = deduplicatedVehicles.filter((v) => v.vehicle_brand === driverBrand);
          const driverModel = vehicle?.vehicle_model || (matchingVehicles[0]?.vehicle_model) || 'Nexon EV';
          setSelectedModel(driverModel);

          const matchedSpec = matchingVehicles.find((v) => v.vehicle_model === driverModel) || matchingVehicles[0] || deduplicatedVehicles[0];
          setCurrentSpecs(matchedSpec);

          // Clamp passenger count to vehicle's seating capacity if needed
          const initialMaxCap = matchedSpec?.max_passenger_capacity != null ? Number(matchedSpec.max_passenger_capacity) : 5;
          setPassengerCount((prev) => Math.max(1, Math.min(initialMaxCap, prev)));
        }
      })
      .catch((err) => console.error('Catalog fetch error:', err));
  }, [vehicle]);

  // 2. Local Handler for Brand Selection (No auto-prediction)
  const handleBrandChange = (brand) => {
    setSelectedBrand(brand);
    const matchingVehicles = catalog.vehicles.filter((v) => v.vehicle_brand === brand);
    if (matchingVehicles.length > 0) {
      const firstModel = matchingVehicles[0].vehicle_model;
      const matchedSpec = matchingVehicles[0];
      setSelectedModel(firstModel);
      setCurrentSpecs(matchedSpec);

      // Clamp passenger count to new vehicle's max capacity
      const newMaxCap = matchedSpec.max_passenger_capacity != null ? Number(matchedSpec.max_passenger_capacity) : 5;
      if (passengerCount > newMaxCap) {
        setPassengerCount(newMaxCap);
      }
    }
  };

  // 3. Local Handler for Model Selection (No auto-prediction)
  const handleModelChange = (model) => {
    setSelectedModel(model);
    const matchedSpec = catalog.vehicles.find((v) => v.vehicle_brand === selectedBrand && v.vehicle_model === model) || catalog.vehicles.find((v) => v.vehicle_model === model);
    if (matchedSpec) {
      setCurrentSpecs(matchedSpec);

      // Clamp passenger count to new model's max capacity
      const newMaxCap = matchedSpec.max_passenger_capacity != null ? Number(matchedSpec.max_passenger_capacity) : 5;
      if (passengerCount > newMaxCap) {
        setPassengerCount(newMaxCap);
      }
    }
  };

  // Handlers for sliders and controls (Updating local state only — NO auto-prediction!)
  const handleSocChange = (newSoc) => {
    setSocPercent(newSoc);
  };

  const handleRouteTypeChange = (newRoute) => {
    setRouteType(newRoute);
  };

  const handlePassengerChange = (newCount) => {
    const clamped = Math.max(1, Math.min(maxPassengerCap, newCount));
    setPassengerCount(clamped);
  };

  const handleDestinationChange = (val) => {
    const num = Math.max(0, Number(val) || 0);
    setDestinationDistance(num);
  };

  // 4. Explicit Prediction Call triggered ONLY when user clicks "Predict Range" button
  const executePrediction = () => {
    if (isCalculating || !destinationDistance || destinationDistance <= 0) return;

    setIsCalculating(true);
    setError(null);

    const b = selectedBrand || vehicle?.vehicle_brand || 'Tata';
    const m = selectedModel || vehicle?.vehicle_model || 'Nexon EV';
    const spec = currentSpecs;

    fetch('http://localhost:4000/api/driver/predict-range', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driverId: driverId || 'DRV-2025-00001',
        vehicle_brand: b,
        vehicle_model: m,
        battery_capacity_kwh: spec?.battery_capacity_kwh || 40.5,
        motor_power_kw: spec?.motor_power_kw || 105,
        torque: spec?.torque || 245,
        weight_kg: spec?.weight_kg || 1390,
        length_mm: spec?.length_mm || 3993,
        width_mm: spec?.width_mm || 1811,
        height_mm: spec?.height_mm || 1616,
        wheel_base_mm: spec?.wheel_base_mm || 2498,
        route_type: routeType,
        soc_percent: socPercent,
        passenger_count: passengerCount,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to compute range prediction');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setPredictedRange(data.predicted_range_km);
          if (data.model_r2_score != null) setModelR2(data.model_r2_score);
          if (data.model_name) setModelName(data.model_name);
          setHasPredicted(true);
        } else {
          throw new Error(data.error || 'Prediction failed');
        }
        setIsCalculating(false);
      })
      .catch((err) => {
        console.error('Prediction fetch error:', err);
        setError(err.message);
        setIsCalculating(false);
      });
  };

  // Speedometer Gauge Math (180deg semi-circle arc)
  const radius = 100;
  const circumference = Math.PI * radius; // ~314.15
  const maxGaugeRange = 400; // gauge reference max
  const currentKm = predictedRange != null ? predictedRange : 0;
  const gaugePercent = hasPredicted ? Math.min(100, Math.max(0, (currentKm / maxGaugeRange) * 100)) : 0;
  const strokeDashoffset = circumference - (gaugePercent / 100) * circumference;

  // Real R² percentage string
  const r2Formatted = (modelR2 * 100).toFixed(1);

  // Destination reachability calculations
  const isDestinationValid = destinationDistance != null && Number(destinationDistance) > 0;
  const canReach = predictedRange != null && predictedRange >= destinationDistance;
  const shortfallKm = predictedRange != null ? Math.round(destinationDistance - predictedRange) : 0;
  
  // Estimated arrival SOC %
  const estimatedArrivalSoc = predictedRange && predictedRange > 0
    ? Math.max(0, Math.round(socPercent * (1 - destinationDistance / predictedRange)))
    : 0;

  // Available energy calculation
  const batteryCap = currentSpecs?.battery_capacity_kwh || vehicle?.battery_capacity_kwh || 40.5;
  const availableEnergyKwh = ((batteryCap * socPercent) / 100).toFixed(1);

  // Filter distinct model names for selected brand
  const availableModelNames = Array.from(
    new Set(
      catalog.vehicles
        .filter((v) => v.vehicle_brand === selectedBrand)
        .map((v) => v.vehicle_model)
        .filter(Boolean)
    )
  );

  const isButtonDisabled = isCalculating || !isDestinationValid;

  return (
    <div className="space-y-6">
      
      {/* 1. HERO SECTION — Speedometer Gauge & Prediction Display */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-950 via-gray-900 to-red-950 border border-red-900/40 p-6 md:p-8 text-white shadow-2xl">
        
        {/* Glowing Ambient Background */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-brand-red/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-red-600/15 blur-2xl pointer-events-none" />
        
        {/* Header Tag & Real R2 Accuracy Badge */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-brand-red/30 text-red-400 border border-red-500/30">
              <Sparkles className="w-4 h-4 text-red-400 animate-pulse" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-300">
              Full EV Trip Planner
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40">
              Real Trained ML Model
            </span>
          </div>

          {/* Model Accuracy Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono text-gray-200 shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-red-400" />
            <span>Random Forest Model — <strong>{r2Formatted}% R² Accuracy</strong> on test data</span>
          </div>
        </div>

        {/* Center Hero Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
          
          {/* Left Arc / Speedometer Gauge */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center text-center">
            
            <div className="relative w-64 h-36 flex items-end justify-center">
              <svg className="w-64 h-36 overflow-visible" viewBox="0 0 240 130">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="50%" stopColor="#E30613" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                  
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Track */}
                <path
                  d="M 20,120 A 100,100 0 0,1 220,120"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />

                {/* Animated Value Arc */}
                <path
                  d="M 20,120 A 100,100 0 0,1 220,120"
                  fill="none"
                  stroke="url(#gaugeGradient)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  filter="url(#glow)"
                  className="transition-all duration-500 ease-out"
                />

                {/* Scale Labels */}
                <text x="18" y="135" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="monospace" textAnchor="middle">0 km</text>
                <text x="120" y="15" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="monospace" textAnchor="middle">200 km</text>
                <text x="222" y="135" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="monospace" textAnchor="middle">400 km</text>
              </svg>

              {/* Value Text Overlay */}
              <div className="absolute bottom-0 text-center flex flex-col items-center">
                <div className="flex items-baseline space-x-1">
                  <span className={`text-5xl md:text-6xl font-black font-mono tracking-tight transition-all ${
                    isCalculating ? 'opacity-60 scale-95' : 'opacity-100 scale-100'
                  }`}>
                    {hasPredicted && predictedRange != null ? Math.round(predictedRange) : '---'}
                  </span>
                  <span className="text-xl font-bold font-mono text-red-400">km</span>
                </div>
                <p className="text-xs font-mono text-gray-300 font-semibold tracking-wide uppercase mt-0.5">
                  Predicted Remaining Range
                </p>
              </div>
            </div>

            {/* Recalculating / Status Indicator */}
            <div className="mt-6 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/10 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${
                isCalculating ? 'bg-amber-400 animate-ping' : (hasPredicted ? 'bg-emerald-400' : 'bg-gray-400')
              }`} />
              <span className="text-gray-300">
                {isCalculating
                  ? 'Executing ML prediction...'
                  : (hasPredicted
                      ? `${selectedBrand} ${selectedModel} • ${socPercent}% Battery • ${routeType} Route`
                      : 'Configure trip below & click Predict Range')}
              </span>
            </div>

          </div>

          {/* Right Column: Active Vehicle & Trip Specs Summary */}
          <div className="lg:col-span-5 bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-red-300 flex items-center space-x-2">
              <Car className="w-4 h-4 text-brand-red" />
              <span>Selected Specs Summary</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-gray-400 block text-[10px]">SELECTED VEHICLE</span>
                <span className="font-bold text-white text-sm truncate block">{selectedBrand} {selectedModel}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-gray-400 block text-[10px]">ROUTE TYPE</span>
                <span className="font-bold text-emerald-400 text-sm">{routeType}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-gray-400 block text-[10px]">BATTERY CAPACITY</span>
                <span className="font-bold text-white">{currentSpecs?.battery_capacity_kwh || 40.5} kWh</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-gray-400 block text-[10px]">PASSENGER COUNT</span>
                <span className="font-bold text-white">{passengerCount} / {maxPassengerCap} Passengers</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 text-[11px] font-mono text-gray-300 flex items-center justify-between">
              <span>Model Algorithm:</span>
              <span className="font-bold text-red-300">{modelName}</span>
            </div>
          </div>

        </div>

      </div>

      {/* 2. REAL-TIME DESTINATION REACHABILITY CHECK CARD — Displayed after first prediction */}
      {hasPredicted && isDestinationValid ? (
        <div className={`p-6 rounded-2xl border transition-all shadow-clean-md ${
          canReach
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-950'
            : 'bg-amber-950/20 border-amber-500/40 text-amber-950'
        }`}>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-gray-200/20">
            <div className="flex items-start space-x-3">
              <div className={`p-2.5 rounded-xl ${canReach ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                {canReach ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6 animate-pulse" />}
              </div>

              <div>
                {/* High contrast badges */}
                <div className="flex items-center space-x-2">
                  {canReach ? (
                    <span className="bg-emerald-600 text-white font-mono font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-md shadow-sm border border-emerald-500">
                      SAFE TRIP CONFIRMED
                    </span>
                  ) : (
                    <span className="bg-amber-600 text-white font-mono font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-md shadow-sm border border-amber-500">
                      INSUFFICIENT RANGE WARNING
                    </span>
                  )}
                </div>

                <h4 className="text-base font-bold font-mono text-gray-900 mt-2">
                  {canReach ? (
                    <span>✅ Safe Trip — You'll reach your destination with an estimated <strong>{estimatedArrivalSoc}%</strong> battery remaining</span>
                  ) : (
                    <span>⚠️ Insufficient Range — You may not reach your destination on the current charge. Consider charging first or reducing load.</span>
                  )}
                </h4>

                {!canReach && (
                  <p className="text-xs font-mono text-amber-800 font-bold mt-1">
                    Shortfall: Vehicle will fall short by ~{shortfallKm} km before reaching destination.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Supporting Numbers Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-white/80 border border-gray-200">
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Available Battery Energy</span>
              <span className="text-sm font-black text-gray-900 mt-0.5 block">{availableEnergyKwh} kWh</span>
              <span className="text-[10px] text-gray-400">At current {socPercent}% SOC</span>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-gray-200">
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Estimated Max Range</span>
              <span className="text-sm font-black text-gray-900 mt-0.5 block">{predictedRange != null ? Math.round(predictedRange) : '---'} km</span>
              <span className="text-[10px] text-gray-400">At selected route & load</span>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-gray-200">
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Planned Trip Distance</span>
              <span className="text-sm font-black text-brand-red mt-0.5 block">{destinationDistance} km</span>
              <span className="text-[10px] text-gray-400">Target destination input</span>
            </div>
          </div>

        </div>
      ) : (
        /* Neutral Placeholder before first prediction */
        <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-center font-mono space-y-1">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Trip Analysis Readiness</p>
          <p className="text-xs text-gray-500">Configure your trip parameters below and click <strong>Predict Range</strong> to view AI ML calculation & reachability analysis.</p>
        </div>
      )}

      {/* 3. INPUT CONTROLS SECTION — TRIP PLANNER PARAMETERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Vehicle & Trip Selector Cards */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card A: Car Brand & Model Selector */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-clean-sm space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-gray-100">
              <div className="p-2 rounded-xl bg-red-50 text-brand-red border border-red-100">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-mono">1. Vehicle Brand & Model Selection</h3>
                <p className="text-xs text-gray-500 font-mono">Select any EV vehicle brand and model to explore specs & range</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand Dropdown */}
              <div className="space-y-1.5 font-mono">
                <label className="text-xs font-bold text-gray-700 block">Car Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all cursor-pointer"
                >
                  {catalog.brands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {/* Model Dropdown — Deduplicated distinct vehicle models only */}
              <div className="space-y-1.5 font-mono">
                <label className="text-xs font-bold text-gray-700 block">Car Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all cursor-pointer"
                >
                  {availableModelNames.map((modelName) => (
                    <option key={modelName} value={modelName}>{modelName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card B: Trip Parameters + PROMINENT "PREDICT RANGE" BUTTON */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-clean-sm space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-gray-100">
              <div className="p-2 rounded-xl bg-gray-100 text-gray-700 border border-gray-200">
                <Navigation className="w-5 h-5 text-gray-800" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-mono">2. Trip Parameters</h3>
                <p className="text-xs text-gray-500 font-mono">Adjust battery state, route profile, passenger load & target distance</p>
              </div>
            </div>

            {/* Battery Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 font-mono flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-brand-red" />
                  <span>Battery Percentage (SOC %)</span>
                </label>
                <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-brand-red font-mono font-black text-sm border border-red-200">
                  {socPercent}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={socPercent}
                onChange={(e) => handleSocChange(Number(e.target.value))}
                className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-red transition-all"
              />
            </div>

            {/* Grid of Route Type, Passenger Count & Destination Distance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              
              {/* Route Type Dropdown */}
              <div className="space-y-1.5 font-mono">
                <label className="text-xs font-bold text-gray-700 block">Route Type</label>
                <select
                  value={routeType}
                  onChange={(e) => handleRouteTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all cursor-pointer"
                >
                  <option value="City">City (Traffic / Stop-Go)</option>
                  <option value="Highway">Highway (High Speed)</option>
                  <option value="Mixed">Mixed (City + Highway)</option>
                </select>
              </div>

              {/* Passenger Count Stepper */}
              <div className="space-y-1.5 font-mono">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 block">Passengers</label>
                  <span className="text-[10px] text-gray-400">Max {maxPassengerCap}</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl border border-gray-300">
                  <button
                    onClick={() => handlePassengerChange(passengerCount - 1)}
                    disabled={passengerCount <= 1}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Minimum 1 passenger required (driver)"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono font-bold text-sm text-gray-900">
                    {passengerCount}
                  </span>
                  <button
                    onClick={() => handlePassengerChange(passengerCount + 1)}
                    disabled={passengerCount >= maxPassengerCap}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title={`Maximum seating capacity for ${selectedModel} is ${maxPassengerCap}`}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Destination Distance Input */}
              <div className="space-y-1.5 font-mono">
                <label className="text-xs font-bold text-gray-700 block">Trip Distance (km)</label>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={destinationDistance}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all"
                  placeholder="e.g. 150"
                />
              </div>

            </div>

            {/* PROMINENT "PREDICT RANGE" PRIMARY CALL-TO-ACTION BUTTON */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <button
                onClick={executePrediction}
                disabled={isButtonDisabled}
                className={`w-full py-3.5 px-6 rounded-xl font-mono font-bold text-base flex items-center justify-center space-x-2 shadow-lg transition-all ${
                  isButtonDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60 shadow-none'
                    : 'bg-brand-red hover:bg-red-700 text-white cursor-pointer hover:shadow-red-600/30 active:scale-[0.99]'
                }`}
              >
                {isCalculating ? (
                  <>
                    <Activity className="w-5 h-5 animate-spin" />
                    <span>Predicting Range...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-white" />
                    <span>Predict Range</span>
                  </>
                )}
              </button>

              {/* Inline hint when trip distance is missing/invalid */}
              {!isDestinationValid && (
                <div className="flex items-center space-x-1.5 text-amber-700 text-xs font-mono justify-center pt-1">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>Enter a trip distance to predict your range.</span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Column: Read-Only Specs Panel */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-clean-sm space-y-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 font-mono flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Specs for Selected Model</span>
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  Real Vehicle Data
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-2">
                Physical specifications auto-filled from database vehicle records for {selectedBrand} {selectedModel}:
              </p>

              <div className="grid grid-cols-2 gap-3 pt-4 font-mono text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Battery Capacity</span>
                  <span className="font-bold text-gray-900 mt-1 block text-sm">
                    {currentSpecs?.battery_capacity_kwh || 40.5} kWh
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Motor Power</span>
                  <span className="font-bold text-gray-900 mt-1 block text-sm">
                    {currentSpecs?.motor_power_kw || 105} kW
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Peak Torque</span>
                  <span className="font-bold text-gray-900 mt-1 block text-sm">
                    {currentSpecs?.torque || 245} Nm
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Seating Capacity</span>
                  <span className="font-bold text-gray-900 mt-1 block text-sm">
                    {maxPassengerCap} Seats Max
                  </span>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Dimensions (L x W x H)</span>
                <span className="font-bold text-gray-900 mt-1 block">
                  {currentSpecs?.length_mm || 3993} mm × {currentSpecs?.width_mm || 1811} mm × {currentSpecs?.height_mm || 1616} mm
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 block">Curb Weight: {currentSpecs?.weight_kg || 1390} kg</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 text-[11px] font-mono text-gray-500 flex items-center justify-between">
              <span>Feature Payload Status:</span>
              <span className="font-bold text-emerald-600">All 12 Features Active in ML</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default KmRangePrediction;
