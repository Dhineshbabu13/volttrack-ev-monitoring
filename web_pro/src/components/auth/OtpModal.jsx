import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X, RefreshCw, KeyRound } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChargeButton } from '../common/ChargeButton';

export const OtpModal = ({ isOpen, onClose, onVerify, driverData }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setError('');
      setTimer(30);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval;
    if (isOpen && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#E30613', '#111111', '#B70510', '#FFFFFF']
      });
      onVerify(otpCode);
    }, 1000);
  };

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(30);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Box */}
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-xl bg-white text-gray-900 shadow-2xl z-10 border border-gray-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-red-50 text-brand-red border border-red-200 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Security Verification</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Enter the 6-digit security code for{' '}
            <span className="font-mono font-bold text-brand-red">{driverData?.driverId || 'DRV-2026'}</span>
          </p>
        </div>

        <div className="mb-5 p-2 rounded-md bg-gray-50 border border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            <span className="font-bold text-gray-900">Demo Hint:</span> Type any 6 digits or{' '}
            <button
              type="button"
              onClick={() => setOtp(['1', '2', '3', '4', '5', '6'])}
              className="font-mono text-brand-red font-bold underline"
            >
              123456
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center items-center space-x-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-11 h-12 text-center font-mono text-xl font-bold rounded-lg border border-gray-300 focus:border-brand-red focus:ring-2 focus:ring-red-500/20 text-gray-900"
              />
            ))}
          </div>

          {error && <p className="text-xs text-red-600 text-center font-medium">{error}</p>}

          <ChargeButton
            type="submit"
            isLoading={isVerifying}
            loadingText="Verifying..."
            variant="red"
            icon={ShieldCheck}
          >
            Verify & Enter Cockpit
          </ChargeButton>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <span>Didn't receive code?</span>
            {timer > 0 ? (
              <span className="font-mono text-gray-500">Resend in {timer}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-semibold text-brand-red hover:underline"
              >
                Resend Code
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
