import '@testing-library/jest-dom';
import { performance } from 'perf_hooks';

process.env.DEBUG_LOGS = 'true';

global.performance = performance;
global.IS_REACT_ACT_ENVIRONMENT = true;

// Provide debugLog for tests
global.debugLog = (...args) => {
  if (process.env.DEBUG_LOGS === 'true') {
    console.log(...args);
  }
};
