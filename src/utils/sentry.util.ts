import * as Sentry from '@sentry/node';

export function setupSentryErrorHandlers() {
  // Capture unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    Sentry.captureException(reason);
  });

  // Capture uncaught exceptions
  process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
    Sentry.captureException(error);
    // Give Sentry time to send the error before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

export function captureSentryError(
  error: Error,
  context?: Record<string, unknown>
) {
  if (context) {
    Sentry.setContext('error_context', context);
  }
  Sentry.captureException(error);
}

export function captureSentryMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.captureMessage(message, level);
} 