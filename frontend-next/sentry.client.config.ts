import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Only enable in production to avoid noise during development
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
});
