import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, ArrowLeft, User, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ChargeButton } from '../common/ChargeButton';
import { DEMO_ADMIN } from '../../data/evVehicles';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    adminName: '',
    adminId: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.adminName.trim()) {
      errs.adminName = 'Admin Name is required';
    }
    if (!formData.adminId.trim()) {
      errs.adminId = 'Admin ID is required (e.g. ADM-9021-X)';
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
      showToast('Please correct highlighted errors', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: formData.adminId,
          password: formData.password,
        }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (!response.ok) {
        showToast(data.error || 'Login failed', 'error', 'Authentication Error');
        return;
      }

      const adminName = data.admin_name || formData.adminName || 'Admin';
      loginAdmin(adminName, formData.adminId, data.token);
      showToast(`Welcome, Commander ${adminName}`, 'success', 'Access Granted');
      navigate('/dashboard/admin');
    } catch (err) {
      setIsLoading(false);
      console.error('Login error:', err);
      showToast('Failed to connect to backend server', 'error', 'Network Error');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
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
        <div className="mb-6">
          <div className="flex items-center space-x-1.5 text-brand-red mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase">
              Fleet Command
            </span>
          </div>
          <h2 className="text-2xl font-bold text-brand-dark">Admin Portal</h2>
          <p className="text-xs text-gray-500 mt-0.5">Sign in to monitor live fleet telemetry</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
              Admin Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="adminName"
                placeholder="e.g. Marcus Vance"
                value={formData.adminName}
                onChange={handleChange}
                className={`w-full py-2.5 pl-9 pr-3 corporate-input text-sm ${errors.adminName ? 'border-red-500' : ''
                  }`}
              />
            </div>
            {errors.adminName && (
              <p className="text-[11px] text-red-600 mt-1">{errors.adminName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
              Admin ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="adminId"
                placeholder="e.g. ADM-9021-X"
                value={formData.adminId}
                onChange={handleChange}
                className={`w-full py-2.5 pl-9 pr-3 corporate-input font-mono text-sm uppercase ${errors.adminId ? 'border-red-500' : ''
                  }`}
              />
            </div>
            {errors.adminId && (
              <p className="text-[11px] text-red-600 mt-1">{errors.adminId}</p>
            )}
          </div>

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
                Forgot key?
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
                className={`w-full py-2.5 pl-9 pr-10 corporate-input text-sm ${errors.password ? 'border-red-500' : ''
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

          <div className="pt-2">
            <ChargeButton
              type="submit"
              variant="red"
              isLoading={isLoading}
              loadingText="Authorizing..."
            >
              Sign In to Fleet Command
            </ChargeButton>
          </div>
        </form>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultId={formData.adminId || DEMO_ADMIN.adminId}
      />
    </div>
  );
};