export const AUTO_SETUP_STATUS = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  STOPPED: 'stopped'
};

export const COMMAND_EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running', 
  SUCCESS: 'success',
  FAILED: 'failed',
  STOPPED: 'stopped',
  TIMEOUT: 'timeout'
};

export const SECTION_STATUS = {
  WAITING: 'waiting',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  PARTIAL: 'partial'
};

// Default priority for fix commands without explicit priority
export const DEFAULT_FIX_PRIORITY = 999;

// Auto setup terminal configuration
export const AUTO_SETUP_TERMINAL_CONFIG = {
  isAutoSetup: true,
  startMinimized: true,
  hideFromSidebar: true
}; 