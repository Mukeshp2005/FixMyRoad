import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const RegisterPage = () => {
  const location = useLocation();
  const initialEmail = location.state?.email || '';
  const initialStep = location.state?.step || 'REGISTER';

  const [formData, setFormData] = useState({
    name: '',
    email: initialEmail,
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [step, setStep] = useState(initialStep); // 'REGISTER' | 'OTP'
  const [registeredEmail, setRegisteredEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [devOTP, setDevOTP] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, verifyOTP, resendOTP, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If redirected from login because verification is needed, auto-trigger resend OTP
  useEffect(() => {
    if (initialStep === 'OTP' && initialEmail) {
      resendOTP(initialEmail).then((res) => {
        if (res.success) {
          if (res.devOTP) setDevOTP(res.devOTP);
          setInfoMessage(`A fresh 6-digit OTP verification code has been dispatched to ${initialEmail}.`);
        }
      });
    }
  }, [initialStep, initialEmail]);

  // Redirect if user is already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'MUNICIPALITY_ADMIN' || user.role === 'MUNICIPALITY_OFFICER') {
        navigate('/municipality/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const validatePasswordRules = (pass) => {
    return {
      length: pass.length >= 8,
      upper: /[A-Z]/.test(pass),
      lower: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass),
    };
  };

  const passRules = validatePasswordRules(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const { length, upper, lower, number, special } = passRules;
    if (!length || !upper || !lower || !number || !special) {
      setErrorMessage('Password does not meet security policy requirements.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.confirmPassword,
        formData.phone
      );

      if (result.success) {
        setRegisteredEmail(formData.email);
        setDevOTP(result.devOTP || '');
        if (result.emailDispatched) {
          setInfoMessage(`A 6-digit verification code has been dispatched to ${formData.email}.`);
        } else if (result.emailError) {
          setErrorMessage(`Email notice: Mail server reported "${result.emailError}". Please verify SMTP configuration for production.`);
          setInfoMessage(`Verification code generated for ${formData.email}.`);
        } else {
          setInfoMessage(`A 6-digit verification code has been generated for ${formData.email}.`);
        }
        setStep('OTP');
      } else {
        setErrorMessage(result.error || 'Registration failed');
      }
    } catch (err) {
      setErrorMessage('An error occurred during registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!otpCode || otpCode.length < 6) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await verifyOTP(registeredEmail, otpCode);
      if (result.success) {
        navigate('/citizen/dashboard', { replace: true });
      } else {
        setErrorMessage(result.error || 'Verification failed');
      }
    } catch (err) {
      setErrorMessage('Verification error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setErrorMessage('');
    setInfoMessage('');
    const res = await resendOTP(registeredEmail);
    if (res.success) {
      if (res.devOTP) setDevOTP(res.devOTP);
      if (res.emailDispatched) {
        setInfoMessage('A fresh OTP code has been dispatched to your email inbox.');
      } else if (res.emailError) {
        setErrorMessage(`Email notice: Mail server reported "${res.emailError}".`);
        setInfoMessage('A new verification code has been generated.');
      } else {
        setInfoMessage('A new OTP code has been generated.');
      }
    } else {
      setErrorMessage(res.error || 'Failed to resend OTP.');
    }
  };

  if (step === 'OTP') {
    return (
      <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto bg-[#f9f8f6]">
        <div className="editorial-panel p-8 sm:p-10 border border-[#e5e5e0] bg-white shadow-sm">
          <div className="text-center space-y-2 mb-6">
            <div className="frame-box mx-auto text-xs">F</div>
            <p className="font-script-accent text-2xl text-neutral-500">Verification Required</p>
            <h2 className="font-serif text-3xl font-bold tracking-[0.2em] uppercase text-neutral-900">
              ENTER OTP CODE
            </h2>
            <p className="text-xs text-neutral-500 mt-2">
              We sent a 6-digit verification code to <span className="font-semibold text-neutral-900">{registeredEmail}</span>
            </p>
            <div className="line-divider max-w-xs mx-auto my-3">❖</div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{infoMessage}</span>
            </div>
          )}



          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5 text-center">
                6-Digit Security OTP
              </label>
              <input
                id="otp-code-input"
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

            <button
              id="btn-verify-otp"
              type="submit"
              disabled={isSubmitting}
              className="w-full editorial-btn text-white py-3.5 text-xs font-bold tracking-[0.2em] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'VERIFYING...' : 'VERIFY & COMPLETE REGISTRATION'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={handleResendOTP}
              className="text-xs text-neutral-600 hover:text-neutral-900 underline font-medium"
            >
              Didn't receive code? Resend OTP
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto bg-[#f9f8f6]">
      <div className="editorial-panel p-8 sm:p-10 border border-[#e5e5e0] bg-white shadow-sm">
        <div className="text-center space-y-2 mb-6">
          <div className="frame-box mx-auto text-xs">F</div>
          <p className="font-script-accent text-2xl text-neutral-500">Join FixMyRoad</p>
          <h2 className="font-serif text-3xl font-bold tracking-[0.2em] uppercase text-neutral-900">
            CREATE ACCOUNT
          </h2>
          <div className="line-divider max-w-xs mx-auto">❖</div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
              Full Name <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                id="register-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                required
                className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
              />
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
              Email Address <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                id="register-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="jane@example.com"
                required
                className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
              />
            </div>
          </div>

          {/* Phone Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
              Phone Number <span className="text-neutral-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                id="register-phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 234 567 8900"
                className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
              Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
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

            {/* Password Policy Indicator */}
            {formData.password && (
              <div className="mt-2.5 p-3 bg-[#f9f8f6] border border-[#e5e5e0] text-[11px] space-y-1">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passRules.length ? 'text-neutral-900' : 'text-neutral-400'}`} />
                  <span className={passRules.length ? 'text-neutral-900 font-medium' : 'text-neutral-500'}>Min 8 characters</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passRules.upper && passRules.lower ? 'text-neutral-900' : 'text-neutral-400'}`} />
                  <span className={passRules.upper && passRules.lower ? 'text-neutral-900 font-medium' : 'text-neutral-500'}>Uppercase & lowercase</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${passRules.number && passRules.special ? 'text-neutral-900' : 'text-neutral-400'}`} />
                  <span className={passRules.number && passRules.special ? 'text-neutral-900 font-medium' : 'text-neutral-500'}>Number & special character</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
              Confirm Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-register-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full editorial-btn bg-neutral-900 text-white hover:bg-neutral-800 py-3.5 text-xs font-bold tracking-[0.2em] mt-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Account...' : 'REGISTER ACCOUNT'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-[#e5e5e0] pt-5">
          <p className="text-xs text-neutral-500 font-light">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-neutral-900 hover:underline ml-1">
              Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
