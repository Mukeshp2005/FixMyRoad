import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendOTPEmail, sendPasswordResetEmail } from './notification/emailNotificationService.js';

/**
 * Generate signed JWT token
 */
export const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret_key_fixmyroad_2026_super_secure';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(
    {
      userId,
      role,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Sanitize user object to exclude sensitive fields (like password)
 */
export const sanitizeUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username || null,
    phone: user.phone || '',
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified || false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * Helper to set HttpOnly cookie and send standardized JSON response
 */
export const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id, user.role);

  // Cookie expiration (days to milliseconds)
  const cookieDays = parseInt(process.env.COOKIE_EXPIRES_IN || '1', 10);
  const cookieOptions = {
    expires: new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      token, // Also returned in body as fallback for non-cookie HTTP clients
      data: {
        user: sanitizeUser(user),
      },
    });
};

/**
 * Register new user service function (Sends 6-digit OTP for Citizen Email Verification)
 */
export const registerUser = async ({ name, email, password, phone }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    // If user exists but is NOT yet verified, allow re-registration:
    // refresh their OTP and resend the email so they can complete verification.
    if (!existingUser.isEmailVerified) {
      const rawOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      existingUser.emailVerificationOTP = rawOTP;
      existingUser.otpExpiresAt = otpExpiresAt;
      // Update name/phone in case they changed them
      existingUser.name = name.trim();
      if (phone) existingUser.phone = phone.trim();
      await existingUser.save();

      console.log(`\n==================================================`);
      console.log(`📩 CITIZEN EMAIL VERIFICATION OTP (RE-SENT)`);
      console.log(`To: ${normalizedEmail}`);
      console.log(`OTP Code: ${rawOTP} (Valid for 10 minutes)`);
      console.log(`==================================================\n`);

      let emailDispatched = false;
      let emailError = null;
      try {
        const emailRes = await sendOTPEmail({ recipient: normalizedEmail, otp: rawOTP, name: name.trim() });
        emailDispatched = !!emailRes.success;
        if (!emailRes.success) emailError = emailRes.error || 'SMTP delivery failed';
      } catch (emailErr) {
        console.error('❌ Failed to dispatch OTP email:', emailErr.message);
        emailError = emailErr.message;
      }

      return { user: existingUser, rawOTP, emailDispatched, emailError };
    }

    // Fully verified account — cannot re-register
    const error = new Error('Email already registered');
    error.statusCode = 400;
    throw error;
  }

  // Generate 6-digit OTP
  const rawOTP = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  // FORCE role = "CITIZEN" regardless of what payload provided
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    phone: phone ? phone.trim() : '',
    role: 'CITIZEN', // STRICT REQUIREMENT: Ignore role injection
    isActive: true,
    isEmailVerified: false,
    emailVerificationOTP: rawOTP,
    otpExpiresAt,
  });

  console.log(`\n==================================================`);
  console.log(`📩 CITIZEN EMAIL VERIFICATION OTP`);
  console.log(`To: ${normalizedEmail}`);
  console.log(`OTP Code: ${rawOTP} (Valid for 10 minutes)`);
  console.log(`==================================================\n`);

  // Dispatch email via SMTP (or log in dev/mock)
  let emailDispatched = false;
  let emailError = null;

  try {
    const emailRes = await sendOTPEmail({ recipient: normalizedEmail, otp: rawOTP, name: name.trim() });
    emailDispatched = !!emailRes.success;
    if (!emailRes.success) {
      emailError = emailRes.error || 'SMTP delivery failed';
    }
  } catch (emailErr) {
    console.error('❌ Failed to dispatch OTP email:', emailErr.message);
    emailError = emailErr.message;
  }

  return { user, rawOTP, emailDispatched, emailError };
};

/**
 * Verify Citizen Email OTP
 */
export const verifyEmailOTP = async ({ email, otp }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+emailVerificationOTP +otpExpiresAt');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.isEmailVerified) {
    return user;
  }

  if (!user.emailVerificationOTP || user.emailVerificationOTP !== otp.trim()) {
    const error = new Error('Invalid OTP code. Please check your email.');
    error.statusCode = 400;
    throw error;
  }

  if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
    const error = new Error('OTP has expired. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  user.isEmailVerified = true;
  user.emailVerificationOTP = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  return user;
};

/**
 * Resend Verification OTP
 */
export const resendVerificationOTP = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.isEmailVerified) {
    const error = new Error('Email is already verified');
    error.statusCode = 400;
    throw error;
  }

  const rawOTP = Math.floor(100000 + Math.random() * 900000).toString();
  user.emailVerificationOTP = rawOTP;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  console.log(`\n==================================================`);
  console.log(`📩 RESENT CITIZEN EMAIL VERIFICATION OTP`);
  console.log(`To: ${normalizedEmail}`);
  console.log(`OTP Code: ${rawOTP} (Valid for 10 minutes)`);
  console.log(`==================================================\n`);

  // Dispatch real email via SMTP
  let emailDispatched = false;
  let emailError = null;

  try {
    const emailRes = await sendOTPEmail({ recipient: normalizedEmail, otp: rawOTP, name: user.name });
    emailDispatched = !!emailRes.success;
    if (!emailRes.success) {
      emailError = emailRes.error || 'SMTP delivery failed';
    }
  } catch (emailErr) {
    console.error('❌ Failed to dispatch OTP email:', emailErr.message);
    emailError = emailErr.message;
  }

  return { success: true, rawOTP, emailDispatched, emailError };
};

/**
 * Authenticate user service function (Accepts email for Citizens or username/email for Officers/Admins)
 */
export const authenticateUser = async ({ identifier, email, username, password }) => {
  const loginKey = (identifier || email || username || '').toLowerCase().trim();

  if (!loginKey) {
    const error = new Error('Username or Email is required');
    error.statusCode = 400;
    throw error;
  }

  // Find user by either email OR username
  const user = await User.findOne({
    $or: [{ email: loginKey }, { username: loginKey }]
  }).select('+password');
  
  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  // Check if user account is active
  if (!user.isActive) {
    const error = new Error('Account is deactivated. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  // Verify password using bcrypt compare
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  // Enforce email verification check for CITIZEN role
  if (user.role === 'CITIZEN' && !user.isEmailVerified) {
    const error = new Error('Email verification required. Please enter the OTP sent to your email.');
    error.statusCode = 403;
    error.requiresVerification = true;
    error.email = user.email;
    throw error;
  }

  return user;
};

/**
 * Initiate Forgot Password Flow: generates 6-digit OTP and sends email
 */
export const requestPasswordReset = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const error = new Error('No account found with this email address.');
    error.statusCode = 404;
    throw error;
  }

  // Generate 6-digit OTP
  const rawOTP = Math.floor(100000 + Math.random() * 900000).toString();
  const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  user.passwordResetOTP = rawOTP;
  user.passwordResetExpires = resetExpiresAt;
  await user.save();

  console.log(`\n==================================================`);
  console.log(`🔑 PASSWORD RESET REQUEST`);
  console.log(`To: ${normalizedEmail}`);
  console.log(`OTP Code: ${rawOTP} (Valid for 10 minutes)`);
  console.log(`==================================================\n`);

  let emailDispatched = false;
  let emailError = null;

  try {
    const emailRes = await sendPasswordResetEmail({ recipient: normalizedEmail, otp: rawOTP, name: user.name });
    emailDispatched = !!emailRes.success;
    if (!emailRes.success) {
      emailError = emailRes.error || 'SMTP delivery failed';
    }
  } catch (emailErr) {
    console.error('❌ Failed to dispatch password reset email:', emailErr.message);
    emailError = emailErr.message;
  }

  return {
    success: true,
    email: normalizedEmail,
    rawOTP,
    emailDispatched,
    emailError,
  };
};

/**
 * Change Password for an authenticated existing user
 */
export const changeUserPassword = async ({ userId, currentPassword, newPassword, confirmPassword }) => {
  if (!currentPassword || !newPassword) {
    const error = new Error('Current password and new password are required.');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error('New password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    const error = new Error('New passwords do not match.');
    error.statusCode = 400;
    throw error;
  }

  if (currentPassword === newPassword) {
    const error = new Error('New password must be different from your current password.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    const error = new Error('Incorrect current password.');
    error.statusCode = 401;
    throw error;
  }

  // Update password (pre-save hook will hash with bcrypt)
  user.password = newPassword;
  await user.save();

  console.log(`✅ [PASSWORD CHANGE] User ${user.email} successfully changed password.`);

  return {
    success: true,
    message: 'Your password has been changed successfully.',
  };
};

/**
 * Reset User Password with verified OTP
 */
export const resetUserPassword = async ({ email, otp, newPassword, confirmPassword }) => {
  const normalizedEmail = email.toLowerCase().trim();

  if (!newPassword || newPassword.length < 6) {
    const error = new Error('Password must be at least 6 characters long.');
    error.statusCode = 400;
    throw error;
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    const error = new Error('Passwords do not match.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordResetOTP +passwordResetExpires');

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!user.passwordResetOTP || user.passwordResetOTP !== otp.trim()) {
    const error = new Error('Invalid or expired OTP code.');
    error.statusCode = 400;
    throw error;
  }

  if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
    const error = new Error('Password reset code has expired. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  // Update password — Mongoose pre('save') hook will hash with bcrypt automatically
  user.password = newPassword;
  user.passwordResetOTP = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  console.log(`✅ [PASSWORD RESET] Password successfully updated for ${normalizedEmail}`);

  return {
    success: true,
    message: 'Password has been reset successfully. You can now login with your new password.',
  };
};
