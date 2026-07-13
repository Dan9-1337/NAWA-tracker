import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { takeRecoveryTokenFromFragment } from './lib/recovery-fragment';

export function bootstrapApplication(rootElement: HTMLElement) {
  const initialRecoveryToken = takeRecoveryTokenFromFragment();
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App initialRecoveryToken={initialRecoveryToken} />
    </React.StrictMode>,
  );
  return root;
}
