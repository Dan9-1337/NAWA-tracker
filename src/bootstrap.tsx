import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n/context';
import { takeRecoveryTokenFromFragment } from './lib/recovery-fragment';

export function bootstrapApplication(rootElement: HTMLElement) {
  const initialRecoveryToken = takeRecoveryTokenFromFragment();
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <I18nProvider>
        <App initialRecoveryToken={initialRecoveryToken} />
      </I18nProvider>
    </React.StrictMode>,
  );
  return root;
}
