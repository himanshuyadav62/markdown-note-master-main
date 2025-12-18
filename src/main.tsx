import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AppRoutes } from './Routes.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { AuthProvider } from './providers/AuthProvider.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Register Service Worker for background notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
        
        // Request periodic background sync if supported
        if ('periodicSync' in registration) {
          registration.periodicSync.register('check-overdue-todos', {
            minInterval: 60 * 1000 // 1 minute
          }).catch(err => console.log('Periodic sync registration failed:', err));
        }
      })
      .catch(err => console.log('Service Worker registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
   </ErrorBoundary>
)
