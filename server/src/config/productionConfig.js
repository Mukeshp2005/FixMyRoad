/**
 * Production environment validation and safe configuration service.
 * Ensures all required secrets are configured before launching in production without leaking secret values in logs.
 */

const REQUIRED_PRODUCTION_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
];

export const validateProductionConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingVars = [];

  REQUIRED_PRODUCTION_VARS.forEach((varName) => {
    const val = process.env[varName];
    if (!val || val.includes('your_') || val.includes('demo')) {
      missingVars.push(varName);
    }
  });

  if (isProduction && missingVars.length > 0) {
    console.error('❌ CRITICAL PRODUCTION CONFIGURATION ERROR: The following required environment variables are missing or unconfigured:');
    missingVars.forEach((varName) => {
      console.error(`  - ${varName} = MISSING`);
    });
    const error = new Error(`Production startup aborted due to missing configuration variables: ${missingVars.join(', ')}`);
    error.statusCode = 500;
    throw error;
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

export const getSafeConfigSummary = () => {
  return {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    cloudinaryConfigured: !!process.env.CLOUDINARY_CLOUD_NAME && !process.env.CLOUDINARY_CLOUD_NAME.includes('demo'),
    notificationDeliveryMode: process.env.NOTIFICATION_DELIVERY_MODE || 'MOCK',
    rateLimitingEnabled: true,
    analyticsMaxRangeDays: parseInt(process.env.ANALYTICS_MAX_RANGE_DAYS || '366', 10),
    maxExportRecords: parseInt(process.env.MAX_EXPORT_RECORDS || '10000', 10),
    slowRequestThresholdMs: parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '1000', 10),
    enableApiDocs: process.env.ENABLE_API_DOCS === 'true',
  };
};
