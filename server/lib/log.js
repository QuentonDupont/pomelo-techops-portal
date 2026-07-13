// server/lib/log.js
// One-line JSON structured logging shared by the BFF entrypoint and route
// modules. Sentry capture piggybacks on error-level logs when SENTRY_DSN is
// set (Sentry.init happens once in server/index.js).

import * as Sentry from '@sentry/node';

export const log = (level, msg, fields = {}) => {
  const entry = { ts: new Date().toISOString(), level, msg, ...fields };
  // Use console for stdout — wrapped here so future changes (file sink, OTLP)
  // don't fan out across the codebase.
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
  if (level === 'error' && process.env.SENTRY_DSN) {
    Sentry.captureMessage(msg, { level: 'error', extra: fields });
  }
};
