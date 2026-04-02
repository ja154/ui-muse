
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { AnimationProvider } from './AnimationContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Ignore benign Vite HMR WebSocket errors that can cause unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason.message === 'string' && 
      (event.reason.message.includes('WebSocket closed without opened') || 
       event.reason.message.includes('failed to connect to websocket'))) {
    event.preventDefault();
    console.warn('Ignored benign WebSocket rejection:', event.reason.message);
  }
});

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