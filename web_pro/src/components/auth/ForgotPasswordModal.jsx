import React, { useState, useEffect } from 'react';
import { X, KeyRound, ShieldCheck, Mail, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { ChargeButton } from '../common/ChargeButton';
import { useToast } from '../../context/ToastContext';

export const ForgotPasswordModal = ({ isOpen, onClose, defaultId = '' }) => {
  const [step, setStep] = useState(1);
  const [driverId, setDriverId] = useState(defaultId);
  const [maskedMobile, setMaskedMobile] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDriverId(defaultId);
      setMaskedMobile('');
      setDevOtp('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setIsLoading(false);
    }
  }, [isOpen, defaultId]);

  if (!isOpen) return null;

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!driverId.trim()) {
      showToast('Please enter your Driver ID', 'warning');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:4000/api/driver/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request OTP');
      }

      setMaskedMobile(data.masked_mobile || 'registered mobile');
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
      }
      setStep(2);
      showToast(data.message || 'OTP sent successfully', 'info', 'OTP Dispatched');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send OTP');
      showToast(err.message || 'Failed to send OTP', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:4000/api/driver/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: driverId.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      setStep(3);
      showToast('OTP verified successfully! Set your new password.', 'success', 'Verified');
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:4000/api/driver/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: driverId.trim(),
          otp: otp.trim(),
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      showToast('Password updated! You can now sign in with your new password.', 'success', 'Password Reset');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-xl bg-white text-gray-900 shadow-2xl z-10 border border-gray-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-red-50 text-brand-red border border-red-200 flex items-center justify-center">
            {step === 1 && <KeyRound className="w-6 h-6" />}
            {step === 2 && <Mail className="w-6 h-6" />}
            {step === 3 && <Lock className="w-6 h-6" />}
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Enter 6-Digit OTP'}
            {step === 3 && 'Set New Password'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {step === 1 && 'Enter your Driver ID to receive a verification OTP code'}
            {step === 2 && `OTP sent to ${maskedMobile}`}
            {step === 3 && 'Enter and confirm your new secure password'}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-600 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
                Driver ID
              </label>
              <input
                type="text"
                placeholder="e.g. DRV-2025-00001"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full py-2.5 px-3 corporate-input text-sm font-mono uppercase"
                required
              />
            </div>

            <ChargeButton
              type="submit"
              variant="red"
              isLoading={isLoading}
              loadingText="Sending OTP..."
              icon={Mail}
            >
              Send Reset Code
            </ChargeButton>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {/* Dev Mode OTP Notice */}
            {devOtp && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <span className="font-bold">Local Dev Gateway:</span> Check server console or use code{' '}
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="font-mono font-bold underline text-brand-red ml-1"
                >
                  {devOtp}
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
                Verification Code (6 Digits)
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full py-3 px-3 text-center font-mono text-xl font-bold tracking-widest corporate-input"
                required
              />
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrorMsg('');
                }}
                className="w-1/3 py-2.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <div className="w-2/3">
                <ChargeButton
                  type="submit"
                  variant="red"
                  isLoading={isLoading}
                  loadingText="Verifying..."
                  icon={ShieldCheck}
                >
                  Verify OTP
                </ChargeButton>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
                New Password
              </label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full py-2.5 px-3 corporate-input text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 font-mono uppercase">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full py-2.5 px-3 corporate-input text-sm"
                required
              />
            </div>

            <ChargeButton
              type="submit"
              variant="red"
              isLoading={isLoading}
              loadingText="Updating..."
              icon={CheckCircle2}
            >
              Update Password
            </ChargeButton>
          </form>
        )}
      </div>
    </div>
  );
};
