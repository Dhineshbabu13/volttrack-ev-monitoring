import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  KeyRound,
  Calendar,
  Car,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Gauge
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { EV_BRANDS } from '../../data/evVehicles';
import { BatteryProgress } from './BatteryProgress';
import { PasswordStrengthMeter, calculatePasswordStrength } from './PasswordStrengthMeter';
import { OtpModal } from './OtpModal';
import { ChargeButton } from '../common/ChargeButton';

export const DriverSignUp = () => {
  const navigate = useNavigate();
  const { registerDriver } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    driverName: '',
    driverId: 'DRV-2025-15001',
    dob: '',
    email: '',
    phone: '',
    brand: 'tata',
    model: 'curvv-ev',
    regNumber: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch next auto-generated server ID on mount
    fetch('http://localhost:4000/api/driver/next-id')
      .then((res) => res.json())
      .then((data) => {
        if (data.next_driver_id) {
          setFormData((prev) => ({ ...prev, driverId: data.next_driver_id }));
        }
      })
      .catch((err) => {
        console.warn('Could not fetch next driver ID:', err);
      });
  }, []);

  const selectedBrandObj = EV_BRANDS.find((b) => b.id === formData.brand) || EV_BRANDS[0];
  const availableModels = selectedBrandObj.models;
  const selectedModelObj = availableModels.find((m) => m.id === formData.model) || availableModels[0];

  const handleBrandChange = (e) => {
    const newBrandId = e.target.value;
    const newBrand = EV_BRANDS.find((b) => b.id === newBrandId) || EV_BRANDS[0];
    setFormData((prev) => ({
      ...prev,
      brand: newBrandId,
      model: newBrand.models[0]?.id || ''
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateDob = (dobString) => {
    if (!dobString) return 'Date of Birth is required';
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      return 'Driver must be at least 18 years old';
    }
    return '';
  };

  const validateStep1 = () => {
    const errs = {};
    if (!formData.driverName.trim()) {
      errs.driverName = 'Driver Full Name is required';
    }
    const dobErr = validateDob(formData.dob);
    if (dobErr) {
      errs.dob = dobErr;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.brand) errs.brand = 'EV Brand selection is required';
    if (!formData.model) errs.model = 'EV Model selection is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs = {};
    const strength = calculatePasswordStrength(formData.password);
    if (!strength.isValid) {
      errs.password = 'Password must meet at least 3 security criteria';
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (!formData.acceptTerms) {
      errs.acceptTerms = 'You must accept the terms & conditions';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (validateStep1()) setStep(2);
      else showToast('Please complete required details', 'warning');
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
      else showToast('Please select your vehicle', 'warning');
    }
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    if (!validateStep3()) {
      showToast('Please fix validation requirements', 'error');
      return;
    }
    setIsOtpModalOpen(true);
  };

  const handleOtpVerified = async (tokenCode) => {
    setIsOtpModalOpen(false);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/driver/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_name: formData.driverName,
          date_of_birth: formData.dob,
          driver_email: formData.email,
          driver_mobile_number: formData.phone,
          password: formData.password,
          vehicle_brand: selectedBrandObj.name,
          vehicle_model: selectedModelObj.name,
          car_reg_no: formData.regNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete registration');
      }

      registerDriver({
        name: data.driver_name,
        driverId: data.driver_id,
        token: data.token,
        brandName: selectedBrandObj.name,
        modelName: selectedModelObj.name,
      });

      showToast(`Welcome! Allocated Driver ID: ${data.driver_id}`, 'success', 'Registration Complete');
      navigate('/dashboard/driver');
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <BatteryProgress currentStep={step} totalSteps={3} onStepClick={(s) => setStep(s)} />

      {/* STEP 1: Personal Details */}
      {step === 1 && (
        <form onSubmit={handleNext} className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 font-mono uppercase">
                Allocated Driver ID <span className="text-brand-red font-bold">(Auto-Generated)</span>
              </label>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-50 text-brand-red border border-red-200">
                DRV-2025 PATTERN
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-red">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="driverId"
                value={formData.driverId}
                readOnly
                className="w-full py-2.5 pl-9 pr-3 corporate-input font-mono text-sm font-bold text-brand-red bg-red-50/50 border-red-200 cursor-not-allowed select-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
              Driver Full Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="driverName"
                placeholder="e.g. Aarav Sharma"
                value={formData.driverName}
                onChange={handleChange}
                className={`w-full py-2.5 pl-9 pr-3 corporate-input text-sm ${
                  errors.driverName ? 'border-red-500' : ''
                }`}
              />
            </div>
            {errors.driverName && (
              <p className="text-[11px] text-red-600 mt-1">{errors.driverName}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 font-mono uppercase">
                Date of Birth (18+ Required) *
              </label>
              <span className="text-[10px] text-gray-400 font-mono">18+</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className={`w-full py-2.5 pl-9 pr-3 corporate-input text-sm ${
                  errors.dob ? 'border-red-500' : ''
                }`}
              />
            </div>
            {errors.dob && (
              <p className="text-[11px] text-red-600 mt-1">{errors.dob}</p>
            )}
          </div>

          <div className="pt-2">
            <ChargeButton type="submit" variant="red" icon={ArrowRight}>
              Continue to Vehicle Info
            </ChargeButton>
          </div>
        </form>
      )}

      {/* STEP 2: Vehicle Specs */}
      {step === 2 && (
        <form onSubmit={handleNext} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
              Car Brand *
            </label>
            <div className="relative">
              <select
                name="brand"
                value={formData.brand}
                onChange={handleBrandChange}
                className="w-full py-2.5 px-3 corporate-input text-sm appearance-none bg-white cursor-pointer"
              >
                {EV_BRANDS.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name} ({brand.country})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <Car className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
              Car Model Edition *
            </label>
            <div className="relative">
              <select
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full py-2.5 px-3 corporate-input text-sm appearance-none bg-white cursor-pointer"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} — {model.battery} ({model.range})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Vehicle specs summary */}
          {selectedModelObj && (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800">{selectedModelObj.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-50 text-brand-red font-bold">
                  {selectedBrandObj.name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-1.5 rounded bg-white border border-gray-200">
                  <p className="text-[10px] text-gray-400">Battery</p>
                  <p className="font-mono font-bold text-gray-800">{selectedModelObj.battery}</p>
                </div>
                <div className="p-1.5 rounded bg-white border border-gray-200">
                  <p className="text-[10px] text-gray-400">Range</p>
                  <p className="font-mono font-bold text-gray-800">{selectedModelObj.range}</p>
                </div>
                <div className="p-1.5 rounded bg-white border border-gray-200">
                  <p className="text-[10px] text-gray-400">Charge Rate</p>
                  <p className="font-mono font-bold text-brand-red">{selectedModelObj.maxChargeRate}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
              License Plate (Optional)
            </label>
            <input
              type="text"
              name="regNumber"
              placeholder="e.g. TN 28 EV 9920"
              value={formData.regNumber}
              onChange={handleChange}
              className="w-full py-2.5 px-3 corporate-input uppercase font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center justify-center space-x-1 py-2.5 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <ChargeButton type="submit" variant="red" icon={ArrowRight}>
              Continue
            </ChargeButton>
          </div>
        </form>
      )}

      {/* STEP 3: Password & Security */}
      {step === 3 && (
        <form onSubmit={handleFinalSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
              Create Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter secure password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full py-2.5 pl-9 pr-10 corporate-input text-sm ${
                  errors.password ? 'border-red-500' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-600 mt-1">{errors.password}</p>
            )}

            <PasswordStrengthMeter password={formData.password} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 font-mono uppercase">
                Confirm Password *
              </label>
              {formData.confirmPassword && (
                <span
                  className={`text-[11px] font-semibold flex items-center space-x-1 ${
                    formData.password === formData.confirmPassword
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Match Confirmed</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>Does Not Match</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full py-2.5 pl-9 pr-10 corporate-input text-sm ${
                  errors.confirmPassword ? 'border-red-500' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-red-600 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="pt-1">
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-brand-red focus:ring-brand-red cursor-pointer"
              />
              <span className="text-xs text-gray-600 leading-snug">
                I agree to the <span className="text-brand-red underline">EV Telemetry Protocols</span> and Terms of Service.
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="text-[11px] text-red-600 mt-1">{errors.acceptTerms}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center justify-center space-x-1 py-2.5 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <ChargeButton
              type="submit"
              variant="red"
              isLoading={isLoading}
              loadingText="Creating..."
              icon={ShieldCheck}
            >
              Create Account
            </ChargeButton>
          </div>
        </form>
      )}

      {/* OTP Modal */}
      <OtpModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        onVerify={handleOtpVerified}
        driverData={formData}
      />
    </div>
  );
};
