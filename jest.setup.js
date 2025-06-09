import '@testing-library/jest-dom';
import { performance } from 'perf_hooks';

global.performance = performance;
global.IS_REACT_ACT_ENVIRONMENT = true; 