import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AppRoutes } from './Routes.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="bottom-right" />
    </BrowserRouter>
   </ErrorBoundary>
)
