import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import {I18nProvider} from './i18n';
import {ThemeProvider} from './theme';
import {ToastProvider} from './components/Toast.tsx';
import './index.css';

// Lets anyone — the CI smoke test, or you with devtools open — confirm which
// commit the live page is actually running.
document.documentElement.dataset.build = process.env.BUILD_REF || 'dev';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
);
