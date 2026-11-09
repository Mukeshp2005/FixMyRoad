import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, X } from 'lucide-react';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { changePassword } = useAuth();

  if (!isOpen) return null;

  const validateRules = (pass) => ({
    length: pass.length >= 8,
    upper: /[A-Z]/.test(pass),
    lower: /[a-z]/.test(pass),
    number: /[0-9]/.test(pass),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass),
  });

  const rules = validateRules(newPassword);
  const isValid = rules.length && rules.upper && rules.lower && rules.number && rules.special;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please fill in both new password and confirmation.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (!isValid) {
      setErrorMessage('New password does not meet all security requirements.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setSuccessMessage('Your password has been changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1800);
      } else {
        setErrorMessage(res.error || 'Failed to update password.');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-[#e5e5e0] shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-900 transition-colors p-1"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-full bg-neutral-100 border border-[#e5e5e0] flex items-center justify-center mx-auto text-neutral-800 mb-2">
            <KeyRound className="w-5 h-5" />
          </div>
          <p className="font-script-accent text-xl text-neutral-500">Account Security</p>
          <h2 className="font-serif text-2xl font-bold tracking-[0.15em] uppercase text-neutral-900">
            CHANGE PASSWORD
          </h2>
          <div className="line-divider max-w-xs mx-auto my-2">❖</div>
          <p className="text-xs text-neutral-500 font-light">
            Update your account credentials to keep your account secure.
          </p>
        </div>

        {/* Alert Banners */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Current Password */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
              Current Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-10 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
              New Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                required
                className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-10 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
              Confirm New Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
              />
            </div>
          </div>

          {/* Security Policy Requirements Indicator */}
          {newPassword.length > 0 && (
            <div className="p-3 bg-[#f9f8f6] border border-[#e5e5e0] space-y-1.5 text-[11px]">
              <p className="font-bold text-neutral-700 uppercase tracking-wider text-[10px]">
                Password Requirements:
              </p>
              <div className="grid grid-cols-2 gap-1 text-neutral-600">
                <span className={rules.length ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                  {rules.length ? '✓' : '•'} 8+ Characters
                </span>
                <span className={rules.upper ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                  {rules.upper ? '✓' : '•'} Uppercase (A-Z)
                </span>
                <span className={rules.lower ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                  {rules.lower ? '✓' : '•'} Lowercase (a-z)
                </span>
                <span className={rules.number ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                  {rules.number ? '✓' : '•'} Number (0-9)
                </span>
                <span className={rules.special ? 'text-emerald-700 font-medium' : 'text-neutral-400'}>
                  {rules.special ? '✓' : '•'} Special Symbol
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-1/3 py-3 border border-[#e5e5e0] hover:border-neutral-900 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 editorial-btn bg-neutral-900 text-white hover:bg-neutral-800 py-3 text-xs font-bold tracking-[0.2em] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ChangePasswordModal;

