
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { AnimationProvider } from './AnimationContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Ignore benign Vite HMR WebSocket errors that can cause unhandled rejections or error overlays
const isBenignWSError = (err: any) => {
  const msg = err?.message || (typeof err === 'string' ? err : '');
  return msg.includes('WebSocket closed without opened') || 
         msg.includes('failed to connect to websocket');
};

window.addEventListener('unhandledrejection', (event) => {
  if (isBenignWSError(event.reason)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

window.addEventListener('error', (event) => {
  if (isBenignWSError(event.error) || isBenignWSError(event.message)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AnimationProvider>
        <App />
      </AnimationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);