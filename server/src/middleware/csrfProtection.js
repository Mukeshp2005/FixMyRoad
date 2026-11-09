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

  // 1. Bypass CSRF for public login/register/logout/password recovery routes
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-otp',
    '/api/auth/resend-otp',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/logout',
    '/api/health',
    '/api/uploads',
  ];
  if (publicPaths.some((p) => req.path.startsWith(p))) {
    return next();
  }

  // 2. Bearer Token Authentication Immunity:
  // When an Authorization: Bearer token is provided in HTTP headers, cross-site forgery (CSRF)
  // is mathematically impossible because browsers never automatically attach custom Authorization headers.
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'] || req.body?._csrf;

  // 3. If cookie-only authentication is being used (without Bearer header), verify CSRF double-submit token
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
