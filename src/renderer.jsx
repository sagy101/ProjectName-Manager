import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Simple debug logger controlled by DEBUG_LOGS env var
window.debugLog = (...args) => {
  const debugEnv = (typeof process !== 'undefined' && process.env && process.env.DEBUG_LOGS) ||
                   (window.env && window.env.DEBUG_LOGS);
  if (debugEnv === 'true') {
    console.log(...args);
  }
};

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
  debugLog('DOM loaded, initializing React UI...');
  
  // Add a small delay to ensure the DOM is fully rendered
  setTimeout(() => {
    try {
      const container = document.getElementById('root');
      if (!container) {
        // If the root element doesn't exist, create it
        const appContainer = document.createElement('div');
        appContainer.id = 'root';
        document.body.appendChild(appContainer);
        
        const root = createRoot(appContainer);
        root.render(<App />);
      } else {
        const root = createRoot(container);
        root.render(<App />);
      }
      debugLog('React UI initialization complete');
    } catch (error) {
      console.error('Error initializing React UI:', error);
    }
  }, 100); // Small 100ms delay to ensure DOM is ready
}); 