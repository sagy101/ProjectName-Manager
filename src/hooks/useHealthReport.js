import { useEffect, useCallback } from 'react';

const useHealthReport = ({
  terminals = [],
  isHealthReportVisible,
  setIsHealthReportVisible,
  onFocusTerminal,
  onRefreshTerminal
}) => {
  // Main terminals from TerminalContainer (floating terminals are separate)
  const mainTerminals = terminals;

  // Calculate overall health status based on terminal statuses
  const calculateHealthStatus = useCallback(() => {
    if (mainTerminals.length === 0) {
      return 'green';
    }

    const hasError = mainTerminals.some(terminal => 
      ['error', 'terminated'].includes(terminal.status)
    );
    
    const hasWarning = mainTerminals.some(terminal => 
      ['sleeping', 'waiting', 'paused'].includes(terminal.status)
    );

    if (hasError) {
      return 'red';
    } else if (hasWarning) {
      return 'blue';
    } else {
      return 'green';
    }
  }, [mainTerminals]);

  // Calculate health status
  const healthStatus = calculateHealthStatus();

  // Handle opening health report
  const handleOpenHealthReport = useCallback(() => {
    setIsHealthReportVisible(true);
  }, [setIsHealthReportVisible]);

  // Handle closing health report
  const handleCloseHealthReport = useCallback(() => {
    setIsHealthReportVisible(false);
  }, [setIsHealthReportVisible]);

  // Handle focusing a terminal tab
  const handleFocusTerminal = useCallback((terminalId) => {
    if (onFocusTerminal) {
      onFocusTerminal(terminalId);
    }
  }, [onFocusTerminal]);

  // Handle refreshing a terminal
  const handleRefreshTerminal = useCallback((terminalId) => {
    if (onRefreshTerminal) {
      onRefreshTerminal(terminalId);
    }
  }, [onRefreshTerminal]);

  return {
    // State
    isHealthReportVisible,
    healthStatus,
    
    // Actions
    handleOpenHealthReport,
    handleCloseHealthReport,
    handleFocusTerminal,
    handleRefreshTerminal,
    
    // Data
    mainTerminals
  };
};

export default useHealthReport; 