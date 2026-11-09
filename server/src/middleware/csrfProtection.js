import { randomBytes } from 'crypto';

/**
 * Double-submit cookie CSRF protection middleware compatible with React SPA, Axios, and multipart uploads.
 */
export const csrfTokenSetter = (req, res, next) => {
  if (!req.cookies['XSRF-TOKEN']) {
    const token = randomBytes(24).toString('hex');
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Accessible by Axios frontend to include in X-XSRF-TOKEN header
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
  }
  next();
};

export const csrfProtectionMiddleware = (req, res, next) => {
  // Allow safe HTTP methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Bypass CSRF for public login/register/logout/password recovery routes
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-otp',
    '/api/auth/resend-otp',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/logout',
    '/api/health'
  ];
  if (publicPaths.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'] || req.body?._csrf;

  // If cookie authentication is being used, verify CSRF double-submit token
  if (req.cookies.token) {
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      const error = new Error('Invalid or missing CSRF token. Cross-Site Request Forgery validation failed.');
      error.statusCode = 403;
      error.code = 'CSRF_VALIDATION_FAILED';
      return next(error);
    }
  }

  next();
};
