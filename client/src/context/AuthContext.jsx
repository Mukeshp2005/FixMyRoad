import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  registerApi, 
  loginApi, 
  verifyOTPApi, 
  resendOTPApi, 
  forgotPasswordApi,
  resetPasswordApi,
  changePasswordApi,
  logoutApi, 
  getMeApi 
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on mount
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }
      const response = await getMeApi();
      if (response.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Login handler — accepts identifier (email or username) & password
  const login = async (identifierOrEmail, password, allowedRoles = null) => {
    setError(null);
    try {
      const credentials = typeof identifierOrEmail === 'object'
        ? identifierOrEmail
        : { identifier: identifierOrEmail, password };
        
      const response = await loginApi(credentials);
      if (response.success && response.data?.user) {
        const authenticatedUser = response.data.user;

        // Strict portal role validation: prevent setting user/token if portal role mismatches
        if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(authenticatedUser.role)) {
          const roleLabel = authenticatedUser.role.replace(/_/g, ' ');
          return {
            success: false,
            roleMismatch: true,
            userRole: authenticatedUser.role,
            error: `Access Denied: Your account (${roleLabel}) is not authorized for this portal. Please select the correct portal.`,
          };
        }

        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        setUser(authenticatedUser);
        return { success: true, user: authenticatedUser };
      }
      throw new Error(response.message || 'Login failed');
    } catch (err) {
      if (err.requiresVerification) {
        return { success: false, requiresVerification: true, email: err.email, error: err.message };
      }
      const message = err.message || 'Invalid username/email or password';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Register handler — returns verification status, email dispatch status, and devOTP snippet
  const register = async (name, email, password, confirmPassword, phone) => {
    setError(null);
    try {
      const response = await registerApi({ name, email, password, confirmPassword, phone });
      if (response.success) {
        return { 
          success: true, 
          requiresVerification: response.requiresVerification, 
          email: response.email,
          emailDispatched: response.emailDispatched,
          emailError: response.emailError,
          devOTP: response.devOTP
        };
      }
      throw new Error(response.message || 'Registration failed');
    } catch (err) {
      const message = err.message || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  // OTP Verification handler
  const verifyOTP = async (email, otp) => {
    setError(null);
    try {
      const response = await verifyOTPApi({ email, otp });
      if (response.success && response.data?.user) {
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      throw new Error(response.message || 'OTP verification failed');
    } catch (err) {
      const message = err.message || 'Invalid OTP code. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Resend OTP handler
  const resendOTP = async (email) => {
    try {
      const response = await resendOTPApi({ email });
      return { 
        success: response.success, 
        message: response.message, 
        emailDispatched: response.emailDispatched,
        emailError: response.emailError,
        devOTP: response.devOTP 
      };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to resend OTP' };
    }
  };

  // Forgot Password handler — initiates reset request
  const forgotPassword = async (email) => {
    try {
      const response = await forgotPasswordApi({ email });
      return { 
        success: response.success, 
        message: response.message, 
        email: response.email, 
        emailDispatched: response.emailDispatched,
        emailError: response.emailError,
        devOTP: response.devOTP 
      };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to request password reset' };
    }
  };

  // Reset Password handler — sets new password using OTP
  const resetPassword = async (email, otp, newPassword, confirmPassword) => {
    try {
      const response = await resetPasswordApi({ email, otp, newPassword, confirmPassword });
      return { success: response.success, message: response.message };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to reset password' };
    }
  };

  // Change Password handler for authenticated user
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await changePasswordApi({ currentPassword, newPassword, confirmPassword });
      return { success: response.success, message: response.message };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to change password' };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        error,
        login,
        register,
        verifyOTP,
        resendOTP,
        forgotPassword,
        resetPassword,
        changePassword,
        logout,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
