import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import PomeloTechOpsPortal from '../PomeloTechOpsPortal.jsx';

// Sentry — opt-in via VITE_SENTRY_DSN. Skipped silently in dev when unset.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PomeloTechOpsPortal />
  </React.StrictMode>
);
