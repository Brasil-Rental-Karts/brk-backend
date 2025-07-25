import * as Sentry from '@sentry/node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

  if (!dsn) {
    console.warn('Sentry DSN not found. Error monitoring will be disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Before sending, add context
    beforeSend(event) {
      // Add custom context
      event.extra = {
        ...event.extra,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      };
      return event;
    },
  });
}

export { Sentry }; 