import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { loggers } from './common/utils/debugUtils.js';

const log = loggers.app;

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
  log.debug('DOM loaded, initializing React UI...');
  
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
      log.debug('React UI initialization complete');
    } catch (error) {
      log.error('Error initializing React UI:', error);
    }
  }, 100); // Small 100ms delay to ensure DOM is ready
}); 