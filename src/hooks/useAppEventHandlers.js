import { useCallback } from 'react';

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
    console.log(`DebugPanel: Attempting to update ${sectionKey} to ${status}. This may need adjustment.`);
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
    console.log('App: Project running state changed to:', isRunning);
    setAppIsProjectRunning(isRunning);
  }, [setAppIsProjectRunning]);

  // Function to show an app-level notification
  const showAppNotification = useCallback((message, type = 'info', autoCloseTime = 3000) => {
    console.log('App: showAppNotification called with:', { message, type, autoCloseTime });
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
  const handleInitiateRefresh = useCallback(() => {
    console.log('App: Initiating refresh, setting statuses to waiting and config to empty.');
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
    console.log(`App: Global dropdown '${dropdownId}' changed to:`, value);
    setGlobalDropdownValues(prev => ({ ...prev, [dropdownId]: value }));
    
    // Notify backend about dropdown value change for cache management
    if (window.electron && window.electron.dropdownValueChanged) {
      window.electron.dropdownValueChanged(dropdownId, value);
    }
  }, [setGlobalDropdownValues]);

  return {
    handleVerificationStatusChange,
    handleToggleTestSections,
    handleToggleNoRunMode,
    handleConfigStateChange,
    handleProjectRunStateChange,
    showAppNotification,
    hideAppNotification,
    handleInitiateRefresh,
    toggleMainTerminalWritable,
    toggleConfigCollapse,
    handleGlobalDropdownChange,
    triggerGitRefresh
  };
}; 