import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n/context';
import { initializeTelegramWebApp } from './lib/telegram';

export function bootstrapApplication(rootElement: HTMLElement) {
  initializeTelegramWebApp();
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </React.StrictMode>,
  );
  return root;
}
