import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState('EMAIL'); // 'EMAIL' | 'OTP' | 'SUCCESS'
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [devOTP, setDevOTP] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const validatePasswordRules = (pass) => {
    return {
      length: pass.length >= 8,
      upper: /[A-Z]/.test(pass),
      lower: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass),
    };
  };

  const passRules = validatePasswordRules(newPassword);

  // Step 1: Submit email to request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await forgotPassword(email);
      if (res.success) {
        if (res.devOTP) setDevOTP(res.devOTP);
        if (res.emailDispatched) {
          setInfoMessage(`A 6-digit password reset code has been dispatched to ${email}.`);
        } else if (res.emailError) {
          setErrorMessage(`Email notice: Mail server reported "${res.emailError}". Please check SMTP configuration.`);
          setInfoMessage(`Password reset code generated for ${email}.`);
        } else {
          setInfoMessage(`A 6-digit password reset code has been generated for ${email}.`);
        }
        setStep('OTP');
      } else {
        setErrorMessage(res.error || 'Failed to send password reset code.');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit OTP and new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!otpCode || otpCode.length < 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const { length, upper, lower, number, special } = passRules;
    if (!length || !upper || !lower || !number || !special) {
      setErrorMessage('Password must meet all security policy requirements.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await resetPassword(email, otpCode, newPassword, confirmPassword);
      if (res.success) {
        setStep('SUCCESS');
      } else {
        setErrorMessage(res.error || 'Password reset failed. Please check your code.');
      }
    } catch (err) {
      setErrorMessage('An error occurred while resetting password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setErrorMessage('');
    setInfoMessage('');
    try {
      const res = await forgotPassword(email);
      if (res.success) {
        if (res.devOTP) setDevOTP(res.devOTP);
        if (res.emailDispatched) {
          setInfoMessage('A fresh verification code has been dispatched to your email.');
        } else if (res.emailError) {
          setErrorMessage(`Email notice: Mail server reported "${res.emailError}".`);
          setInfoMessage('A fresh verification code has been generated.');
        } else {
          setInfoMessage('A fresh verification code has been generated.');
        }
      } else {
        setErrorMessage(res.error || 'Failed to resend code.');
      }
    } catch (err) {
      setErrorMessage('Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f9f8f6]">
      <div className="w-full max-w-md bg-white border border-[#e5e5e0] shadow-sm p-8 sm:p-10">
        
        {/* Top Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="frame-box mx-auto text-xs">F</div>
          <p className="font-script-accent text-2xl text-neutral-500">Account Recovery</p>
          <h1 className="font-serif text-3xl font-bold tracking-[0.2em] uppercase text-neutral-900">
            {step === 'SUCCESS' ? 'PASSWORD RESET' : 'FORGOT PASSWORD'}
          </h1>
          <div className="line-divider max-w-xs mx-auto my-3">❖</div>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Info message banner */}
        {infoMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{infoMessage}</span>
          </div>
        )}



        {/* STEP 1: Enter Email */}
        {step === 'EMAIL' && (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <p className="text-xs text-neutral-500 leading-relaxed text-center mb-4">
              Enter the email address associated with your account. We will send you a 6-digit verification code to reset your password.
            </p>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full editorial-btn bg-neutral-900 hover:bg-neutral-800 text-white py-3.5 text-xs font-bold tracking-[0.2em] cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'SENDING CODE...' : 'SEND VERIFICATION CODE'}
            </button>

            <div className="text-center pt-4 border-t border-[#e5e5e0]">
              <Link
                to="/login"
                className="inline-flex items-center space-x-1 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP & New Password */}
        {step === 'OTP' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-neutral-500 text-center mb-2">
              Verification code sent to <strong className="text-neutral-900">{email}</strong>
            </p>

            {/* OTP Code */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5 text-center">
                6-Digit Security OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoComplete="one-time-code"
                required
                className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-3 text-center text-lg tracking-[0.4em] font-mono text-neutral-900 outline-none transition-all"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-10 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Validation Policy Indicators */}
            {newPassword.length > 0 && (
              <div className="p-3 bg-[#f9f8f6] border border-[#e5e5e0] space-y-1 text-[11px]">
                <p className="font-bold text-neutral-700 uppercase tracking-wider text-[10px] mb-1">
                  Password Requirements:
                </p>
                <div className="grid grid-cols-2 gap-1 text-neutral-600">
                  <span className={passRules.length ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                    {passRules.length ? '✓' : '•'} 8+ Characters
                  </span>
                  <span className={passRules.upper ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                    {passRules.upper ? '✓' : '•'} Uppercase (A-Z)
                  </span>
                  <span className={passRules.lower ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                    {passRules.lower ? '✓' : '•'} Lowercase (a-z)
                  </span>
                  <span className={passRules.number ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                    {passRules.number ? '✓' : '•'} Number (0-9)
                  </span>
                  <span className={passRules.special ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                    {passRules.special ? '✓' : '•'} Special Symbol
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full editorial-btn bg-neutral-900 hover:bg-neutral-800 text-white py-3.5 text-xs font-bold tracking-[0.2em] cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'UPDATING PASSWORD...' : 'RESET PASSWORD'}
            </button>

            <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e0] text-xs">
              <button
                type="button"
                onClick={handleResend}
                className="text-neutral-600 hover:text-neutral-900 underline font-medium"
              >
                Didn't receive code? Resend
              </button>
              <button
                type="button"
                onClick={() => setStep('EMAIL')}
                className="text-neutral-500 hover:text-neutral-900"
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 'SUCCESS' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl font-bold tracking-[0.1em] text-neutral-900 uppercase">
              Password Updated Successfully
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Your account password has been updated. You can now use your new password to sign in.
            </p>
            <div className="pt-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full editorial-btn bg-neutral-900 hover:bg-neutral-800 text-white py-3.5 text-xs font-bold tracking-[0.2em] cursor-pointer"
              >
                SIGN IN NOW
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPasswordPage;

