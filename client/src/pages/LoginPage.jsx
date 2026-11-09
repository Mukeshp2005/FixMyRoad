import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Cpu, 
  MapPin, 
  User, 
  Building2, 
  Shield,
  ArrowLeft,
  Users,
  Landmark,
  ChevronRight,
  KeyRound
} from 'lucide-react';

const ROLES = [
  {
    key: 'citizen',
    label: 'Citizen',
    subtitle: 'Report issues & track progress',
    icon: Users,
    color: '#2563eb',
    bgGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    bgLight: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  {
    key: 'govt',
    label: 'Government Official',
    subtitle: 'Manage complaints & take action',
    icon: Landmark,
    color: '#059669',
    bgGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    bgLight: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  {
    key: 'admin',
    label: 'System Admin',
    subtitle: 'Monitor officials & oversight',
    icon: Shield,
    color: '#dc2626',
    bgGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    bgLight: '#fef2f2',
    borderColor: '#fecaca',
  },
];

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  // Redirect if user is already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'MUNICIPALITY_ADMIN' || user.role === 'MUNICIPALITY_OFFICER') {
        navigate('/municipality/dashboard', { replace: true });
      } else {
        navigate('/citizen/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, from, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setFormData({ email: '', password: '' });
    setErrorMessage('');
  };

  const handleBack = () => {
    setSelectedRole(null);
    setFormData({ email: '', password: '' });
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.email || !formData.password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);

      const roleMapping = {
        citizen: ['CITIZEN'],
        govt: ['MUNICIPALITY_ADMIN', 'MUNICIPALITY_OFFICER'],
        admin: ['SUPER_ADMIN'],
      };
      const allowedRoles = roleMapping[selectedRole] || [];

      const result = await login(formData.email, formData.password, allowedRoles);

      if (result.success) {
        const role = result.user.role;
        if (from) {
          navigate(from, { replace: true });
        } else if (role === 'SUPER_ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else if (role === 'MUNICIPALITY_ADMIN' || role === 'MUNICIPALITY_OFFICER') {
          navigate('/municipality/dashboard', { replace: true });
        } else {
          navigate('/citizen/dashboard', { replace: true });
        }
      } else if (result.requiresVerification) {
        navigate('/register', { state: { email: result.email, step: 'OTP' } });
      } else {
        setErrorMessage(result.error || 'Invalid username/email or password');
      }
    } catch (err) {
      setErrorMessage('An error occurred during login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRoleConfig = ROLES.find(r => r.key === selectedRole);

  // ---- ROLE SELECTION SCREEN ----
  if (!selectedRole) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f9f8f6]">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="frame-box mx-auto text-xs mb-4">F</div>
            <p className="font-script-accent text-2xl text-neutral-500">Welcome to</p>
            <h1 className="font-serif text-4xl font-bold tracking-[0.2em] uppercase text-neutral-900 mt-1">
              FIXMYROAD
            </h1>
            <div className="line-divider max-w-xs mx-auto mt-4">❖</div>
            <p className="text-sm text-neutral-500 font-light mt-4">
              Select your portal to sign in
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ROLES.map((role) => {
              const IconComponent = role.icon;
              return (
                <button
                  key={role.key}
                  id={`btn-role-${role.key}`}
                  onClick={() => handleRoleSelect(role.key)}
                  className="group relative bg-white border-2 border-[#e5e5e0] hover:border-neutral-900 p-6 text-left transition-all duration-300 cursor-pointer"
                  style={{
                    '--role-color': role.color,
                  }}
                >
                  {/* Icon */}
                  <div 
                    className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-all duration-300"
                    style={{ 
                      background: role.bgLight,
                      border: `1px solid ${role.borderColor}`,
                    }}
                  >
                    <IconComponent 
                      className="w-7 h-7 transition-transform duration-300 group-hover:scale-110" 
                      style={{ color: role.color }} 
                    />
                  </div>

                  {/* Text */}
                  <h3 className="font-serif text-sm font-bold tracking-[0.15em] uppercase text-neutral-900 mb-1">
                    {role.label}
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-light leading-relaxed">
                    {role.subtitle}
                  </p>

                  {/* Arrow */}
                  <div className="absolute top-6 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ChevronRight className="w-5 h-5 text-neutral-400" />
                  </div>

                  {/* Bottom accent bar */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: role.bgGradient }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---- LOGIN FORM SCREEN (after role selection) ----
  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f9f8f6]">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-[#e5e5e0] shadow-sm">
        
        {/* Left Side: Role-specific Banner */}
        <div 
          className="lg:col-span-5 p-10 flex flex-col justify-between text-white space-y-8"
          style={{ background: currentRoleConfig.bgGradient.replace('135deg', '180deg').replace('0%', '0%').replace('100%', '100%'), backgroundColor: currentRoleConfig.color }}
        >
          <div className="space-y-4">
            <div className="frame-box border-white text-white">F</div>
            <p className="font-script-accent text-3xl text-white/70">
              {selectedRole === 'citizen' && 'Citizen Portal'}
              {selectedRole === 'govt' && 'Official Portal'}
              {selectedRole === 'admin' && 'Admin Portal'}
            </p>
            <h2 className="font-serif text-3xl font-bold tracking-[0.2em] uppercase text-white">
              {selectedRole === 'citizen' && 'CIVIC ACCESS'}
              {selectedRole === 'govt' && 'AUTHORITY HUB'}
              {selectedRole === 'admin' && 'SYSTEM CONTROL'}
            </h2>
            <div className="line-divider border-white/20 my-4 text-white/40">❖</div>
            <p className="text-xs text-white/70 font-light leading-relaxed">
              {selectedRole === 'citizen' && 'Report road damage, potholes, and civic issues. Track your complaints in real-time and get AI-powered severity assessments.'}
              {selectedRole === 'govt' && 'Review and manage citizen complaints. Take action, assign teams, and update resolution status within SLA deadlines.'}
              {selectedRole === 'admin' && 'Monitor government officials, track system health, view analytics dashboards, and manage escalation protocols.'}
            </p>
          </div>

          <div className="space-y-4 border-t border-white/20 pt-6">
            {selectedRole === 'citizen' && (
              <>
                <div className="flex items-start space-x-3 text-xs text-white/80 font-light">
                  <Cpu className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                  <span>AI-Powered Damage Assessment</span>
                </div>
                <div className="flex items-start space-x-3 text-xs text-white/80 font-light">
                  <MapPin className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                  <span>GPS Location Auto-Detection</span>
                </div>
              </>
            )}
            {selectedRole === 'govt' && (
              <>
                <div className="flex items-start space-x-3 text-xs text-white/80 font-light">
                  <Building2 className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                  <span>Jurisdiction-Based Routing</span>
                </div>
                <div className="flex items-start space-x-3 text-xs text-white/80 font-light">
                  <ShieldCheck className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                  <span>SLA Deadline Tracking</span>
                </div>
              </>
            )}
            {selectedRole === 'admin' && (
              <>
                <div className="flex items-start space-x-3 text-xs text-white/80 font-light">
                  <ShieldCheck className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                  <span>Officer Performance Monitoring</span>
                </div>
                <div className="flex items-start space-x-3 text-xs text-white/80 font-light">
                  <Cpu className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                  <span>System Health & Analytics</span>
                </div>
              </>
            )}
          </div>

          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">
            FixMyRoad Engine v1.0
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-7 bg-white p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-6">
            
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-xs text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Change Portal</span>
            </button>

            <div>
              <p className="font-script-accent text-2xl text-neutral-500">
                {selectedRole === 'citizen' && 'Welcome, Citizen'}
                {selectedRole === 'govt' && 'Official Access'}
                {selectedRole === 'admin' && 'Admin Access'}
              </p>
              <h2 className="font-serif text-3xl font-bold tracking-[0.2em] uppercase text-neutral-900">
                SIGN IN
              </h2>
            </div>

            {/* Role Badge */}
            <div 
              className="inline-flex items-center space-x-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded-sm"
              style={{ 
                background: currentRoleConfig.bgLight, 
                color: currentRoleConfig.color,
                border: `1px solid ${currentRoleConfig.borderColor}`,
              }}
            >
              {React.createElement(currentRoleConfig.icon, { className: 'w-3.5 h-3.5' })}
              <span>{currentRoleConfig.label} Portal</span>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-1.5">
                  {selectedRole === 'citizen' ? 'Email Address' : 'Official Username / Email'}
                </label>
                <div className="relative">
                  {selectedRole === 'citizen' ? (
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  ) : (
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  )}
                  <input
                    id="login-email"
                    type={selectedRole === 'citizen' ? 'email' : 'text'}
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={selectedRole === 'citizen' ? 'email@example.com' : 'e.g., muniadmin or officer1'}
                    required
                    className="w-full bg-[#f9f8f6] border border-[#e5e5e0] focus:bg-white focus:border-neutral-900 py-2.5 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 underline font-light"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    id="login-password"
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
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full editorial-btn text-white py-3.5 text-xs font-bold tracking-[0.2em] mt-2 cursor-pointer disabled:opacity-50 transition-colors"
                style={{ 
                  backgroundColor: currentRoleConfig.color,
                }}
              >
                {isSubmitting ? 'Authenticating...' : `SIGN IN AS ${currentRoleConfig.label.toUpperCase()}`}
              </button>
            </form>

            {/* Only Citizens can register themselves */}
            {selectedRole === 'citizen' && (
              <div className="text-center pt-4 border-t border-[#e5e5e0] space-y-2">
                <p className="text-xs text-neutral-500 font-light">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-semibold text-neutral-900 hover:underline ml-1">
                    Create Account →
                  </Link>
                </p>
                <p className="text-[11px] text-neutral-500 font-light">
                  Trouble signing in?{' '}
                  <Link to="/forgot-password" className="font-semibold text-neutral-800 hover:underline">
                    Reset Password
                  </Link>
                </p>
              </div>
            )}

            {/* For Govt/Admin — no self-registration */}
            {selectedRole !== 'citizen' && (
              <div className="text-center pt-4 border-t border-[#e5e5e0]">
                <p className="text-[11px] text-neutral-400 font-light">
                  {selectedRole === 'govt' 
                    ? 'Government official accounts are pre-registered by the system administrator.' 
                    : 'Admin accounts are provisioned by the system. Contact IT support if you need access.'}
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
