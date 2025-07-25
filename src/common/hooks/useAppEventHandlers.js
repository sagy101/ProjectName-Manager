import { useCallback } from 'react';
import { loggers } from '../utils/debugUtils.js';

const log = loggers.app;

export const useAppEventHandlers = ({
  setVerificationStatuses,
  initializeVerificationStatuses,
  setGeneralVerificationConfig,
  setConfigState,
  setAppIsProjectRunning,
  setAppNotification,
  setIsMainTerminalWritable,
  setIsConfigCollapsed,
  setShowTestSections,
  setNoRunMode,
  triggerGitRefresh,
  setGlobalDropdownValues
}) => {
  const handleVerificationStatusChange = (sectionKey, status) => {
    log.debug(`Attempting to update ${sectionKey} to ${status}. This may need adjustment.`);
    setVerificationStatuses(prev => {
      const newStatuses = { ...prev };
      // This part needs to be careful if general is now {statuses, config}
      // Let's assume this debug toggle only affects the `statuses` part of `general`.
      if (newStatuses.general && newStatuses.general.hasOwnProperty(sectionKey)) {
        newStatuses.general = { ...newStatuses.general, [sectionKey]: status };
      }
      return newStatuses;
    });
  };

  // Toggle test sections visibility
  const handleToggleTestSections = useCallback(() => {
    setShowTestSections(prev => !prev);
  }, [setShowTestSections]);
  
  // Toggle no-run mode
  const handleToggleNoRunMode = useCallback(() => {
    setNoRunMode(prev => !prev);
  }, [setNoRunMode]);

  // Handle config state changes from ProjectConfiguration
  const handleConfigStateChange = useCallback((newConfigState) => {
    setConfigState(newConfigState);
  }, [setConfigState]);

  // Callback for ProjectConfiguration to update App's isRunning state
  const handleProjectRunStateChange = useCallback((isRunning) => {
    log.debug('Project running state changed to:', isRunning);
    setAppIsProjectRunning(isRunning);
  }, [setAppIsProjectRunning]);

  // Function to show an app-level notification
  const handleShowAppNotification = useCallback((message, type = 'info', autoCloseTime = null) => {
    log.debug('showAppNotification called with:', { message, type, autoCloseTime });
    setAppNotification({
      isVisible: true,
      message,
      type,
      autoCloseTime
    });
  }, [setAppNotification]);

  // Function to hide the app-level notification
  const hideAppNotification = useCallback(() => {
    setAppNotification(prev => ({ ...prev, isVisible: false }));
  }, [setAppNotification]);

  // Function to reset verification statuses and config to waiting/empty
  const handleRefresh = useCallback(() => {
    log.debug('Initiating refresh, setting statuses to waiting and config to empty.');
    const resetStatuses = initializeVerificationStatuses();
    setVerificationStatuses(resetStatuses);
    setGeneralVerificationConfig([]); // Clear the config so child component shows loading/empty
  }, [initializeVerificationStatuses, setVerificationStatuses, setGeneralVerificationConfig]);

  // Toggle main terminal writability
  const toggleMainTerminalWritable = useCallback(() => {
    setIsMainTerminalWritable(prev => !prev);
  }, [setIsMainTerminalWritable]);

  // Toggle configuration collapse
  const toggleConfigCollapse = useCallback(() => {
    setIsConfigCollapsed(prev => !prev);
  }, [setIsConfigCollapsed]);

  // Callback to handle dropdown value changes from any global selector
  const handleGlobalDropdownChange = useCallback((dropdownId, value) => {
    log.debug(`Global dropdown '${dropdownId}' changed to:`, value);
    
    // Update the state first to get the updated values
    setGlobalDropdownValues(prev => {
      const updatedValues = { ...prev, [dropdownId]: value };
      
      // Notify backend about dropdown value change for cache management and commandOnChange
      if (window.electron && window.electron.dropdownValueChanged) {
        window.electron.dropdownValueChanged(dropdownId, value, updatedValues);
      }
      
      return updatedValues;
    });
  }, [setGlobalDropdownValues]);

  return {
    handleVerificationStatusChange,
    handleToggleTestSections,
    handleToggleNoRunMode,
    handleConfigStateChange,
    handleProjectRunStateChange,
    showAppNotification: handleShowAppNotification,
    hideAppNotification,
    handleRefresh,
    toggleMainTerminalWritable,
    toggleConfigCollapse,
    handleGlobalDropdownChange,
    triggerGitRefresh
  };
}; 