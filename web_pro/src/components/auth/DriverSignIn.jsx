import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ChargeButton } from '../common/ChargeButton';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const DriverSignIn = () => {
  const navigate = useNavigate();
  const { loginDriver, rememberMe, setRememberMe } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    driverId: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.driverId.trim()) {
      errs.driverId = 'Driver ID is required (e.g. DRV-2025-00001)';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please correct form errors', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/driver/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: formData.driverId.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      loginDriver(data.driver_name, data.driver_id, data.token);
      showToast(`Welcome back, ${data.driver_name}!`, 'success', 'Cockpit Initialized');
      navigate('/dashboard/driver');
    } catch (err) {
      showToast(err.message || 'Driver Sign In failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Driver ID */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
            Driver ID
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type="text"
              name="driverId"
              placeholder="e.g. DRV-2025-00001"
              value={formData.driverId}
              onChange={handleChange}
              className={`w-full py-2.5 pl-9 pr-3 corporate-input font-mono text-sm uppercase ${
                errors.driverId ? 'border-red-500' : ''
              }`}
            />
          </div>
          {errors.driverId && (
            <p className="text-[11px] text-red-600 mt-1">{errors.driverId}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-gray-700 font-mono uppercase">
              Password
            </label>
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className="text-xs text-brand-red hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••••••"
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
        </div>

        {/* Remember Me */}
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-red focus:ring-brand-red cursor-pointer"
          />
          <label htmlFor="rememberMe" className="text-xs text-gray-600 cursor-pointer select-none">
            Keep me signed in on this device
          </label>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <ChargeButton
            type="submit"
            variant="red"
            isLoading={isLoading}
            loadingText="Connecting..."
          >
            Connect to Cockpit
          </ChargeButton>
        </div>
      </form>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultId={formData.driverId}
      />
    </div>
  );
};
