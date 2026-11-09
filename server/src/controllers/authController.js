import { 
  registerUser, 
  authenticateUser, 
  verifyEmailOTP, 
  resendVerificationOTP, 
  sendTokenResponse, 
  sanitizeUser,
  requestPasswordReset,
  resetUserPassword,
  changeUserPassword
} from '../services/authService.js';
import { 
  validateRegisterInput, 
  validateLoginInput 
} from '../validators/authValidators.js';

/**
 * @desc    Register a new user (Strictly forces CITIZEN role & dispatches OTP)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;

    // Validate inputs
    const { isValid, errors } = validateRegisterInput({ name, email, password, confirmPassword });
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
        errors,
      });
    }

    // Register user service (Forces role = CITIZEN and generates OTP)
    const { user, rawOTP, emailDispatched, emailError } = await registerUser({ name, email, password, phone });

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: emailDispatched
        ? 'Registration successful! A 6-digit OTP has been dispatched to your email.'
        : 'Registration successful! Verification code generated.',
      email: user.email,
      emailDispatched,
      emailError,
      devOTP: process.env.NODE_ENV !== 'production' ? rawOTP : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Citizen Email OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit OTP code are required.',
      });
    }

    const user = await verifyEmailOTP({ email, otp });
    sendTokenResponse(user, 200, res, 'Email verified successfully! You are now logged in.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend Email Verification OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    const result = await resendVerificationOTP(email);
    res.status(200).json({
      success: true,
      message: result.emailDispatched
        ? 'A new 6-digit OTP has been sent to your email.'
        : 'A new 6-digit OTP has been generated.',
      emailDispatched: result.emailDispatched,
      emailError: result.emailError,
      devOTP: process.env.NODE_ENV !== 'production' ? result.rawOTP : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password Request — sends 6-digit OTP to user's email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const result = await requestPasswordReset(email);
    res.status(200).json({
      success: true,
      message: result.emailDispatched
        ? 'A 6-digit password reset code has been sent to your email.'
        : 'A 6-digit password reset code has been generated.',
      email: result.email,
      emailDispatched: result.emailDispatched,
      emailError: result.emailError,
      devOTP: process.env.NODE_ENV !== 'production' ? result.rawOTP : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password with verified 6-digit OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP code, and new password are required.',
      });
    }

    const result = await resetUserPassword({ email, otp, newPassword, confirmPassword });
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password for authenticated user
 * @route   POST /api/auth/change-password
 * @access  Private (Authenticated)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const result = await changeUserPassword({
      userId: req.user._id,
      currentPassword,
      newPassword,
      confirmPassword,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token via HttpOnly cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, email, username, password } = req.body;

    // Validate inputs
    const { isValid, errors } = validateLoginInput({ identifier, email, username, password });
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
        errors,
      });
    }

    // Authenticate user
    const user = await authenticateUser({ identifier, email, username, password });

    // Return token and sanitized user
    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    if (error.requiresVerification) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: error.email,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Logout user & clear HttpOnly cookie
 * @route   POST /api/auth/logout
 * @access  Public / Authenticated
 */
export const logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Development test protected route
 * @route   GET /api/auth/protected-test
 * @access  Private
 */
export const protectedTest = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authenticated request successful',
    user: {
      id: req.user._id,
      role: req.user.role,
    },
  });
};

/**
 * @desc    Development test citizen role route
 * @route   GET /api/auth/citizen-test
 * @access  Private (CITIZEN)
 */
export const citizenTest = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Citizen access authorized',
    user: {
      id: req.user._id,
      role: req.user.role,
    },
  });
};

/**
 * @desc    Development test municipality admin role route
 * @route   GET /api/auth/municipality-test
 * @access  Private (MUNICIPALITY_ADMIN, SUPER_ADMIN)
 */
export const municipalityTest = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Municipality Admin access authorized',
    user: {
      id: req.user._id,
      role: req.user.role,
    },
  });
};

/**
 * @desc    Development test super admin role route
 * @route   GET /api/auth/admin-test
 * @access  Private (SUPER_ADMIN)
 */
export const adminTest = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Super Admin access authorized',
    user: {
      id: req.user._id,
      role: req.user.role,
    },
  });
};
