import { useCallback, useEffect } from 'react';
import configurationSidebarAbout from '../configurationSidebarAbout.json';
import configurationSidebarSections from '../configurationSidebarSections.json';

export const useFixCommands = ({
  appState,
  eventHandlers,
  floatingTerminalHandlers
}) => {
  // Listen for single verification updates from backend
  useEffect(() => {
    if (!window.electron) return;

    const removeSingleVerificationListener = window.electron.onSingleVerificationUpdated?.((data) => {
      debugLog('FixCommands: Single verification updated:', data);
      
      const { verificationId, result, source, cacheKey } = data;
      
      // Update the appropriate verification status
      appState.setVerificationStatuses(prev => {
        const newStatuses = { ...prev };
        
        if (source === 'general') {
          // Update general environment verification
          if (newStatuses.general && newStatuses.general.statuses) {
            newStatuses.general = {
              ...newStatuses.general,
              statuses: {
                ...newStatuses.general.statuses,
                [verificationId]: result
              }
            };
          }
        } else if (cacheKey) {
          // Update specific section verification
          if (newStatuses[cacheKey]) {
            newStatuses[cacheKey] = {
              ...newStatuses[cacheKey],
              [verificationId]: result
            };
          }
        }
        
        return newStatuses;
      });
      
      // Show notification about verification result
      if (result === 'valid') {
        eventHandlers.showAppNotification(
          `✓ Verification passed after fix!`,
          'success',
          3000
        );
      } else {
        eventHandlers.showAppNotification(
          `✗ Verification still failing. Fix may need adjustment.`,
          'warning',
          4000
        );
      }
    });

    return () => {
      removeSingleVerificationListener?.();
    };
  }, [appState.setVerificationStatuses, eventHandlers]);

  // Handle fix command click - show confirmation modal
  const handleFixCommand = useCallback((verification) => {
    if (!verification.fixCommand) return;
    appState.setPendingFixVerification(verification);
  }, [appState.setPendingFixVerification]);

  // Execute the pending fix command after confirmation
  const executePendingFixCommand = useCallback(() => {
    const verification = appState.pendingFixVerification;
    if (!verification || !verification.fixCommand) return;

    const terminalId = floatingTerminalHandlers.openFixCommandTerminal(
      verification.id,
      verification.title,
      verification.fixCommand
    );

    eventHandlers.showAppNotification(
      `Running fix command for: ${verification.title}`,
      'info',
      2000
    );
<<<<<<< codex/add-confirmation-popup-for-fix-button

    console.log('Fix command started:', {
=======
    
    debugLog('Fix command started:', {
>>>>>>> main
      verification: verification.id,
      command: verification.fixCommand,
      terminalId
    });

    appState.setPendingFixVerification(null);
  }, [appState.pendingFixVerification, floatingTerminalHandlers, eventHandlers, appState.setPendingFixVerification]);

  // Handle fix command completion and trigger verification re-run
  const handleFixCommandComplete = useCallback(async (terminalId, status, exitCode) => {
    // Find which verification this terminal was fixing
    const terminal = appState.floatingTerminals.find(t => t.id === terminalId);
    if (!terminal || !terminal.isFixCommand) return;
    
    // Extract verification ID from terminal command ID (set when creating fix terminal)
    const verificationId = terminal.commandId;
    
    debugLog('Fix command completed:', {
      terminalId,
      verificationId,
      status,
      exitCode
    });
    
    // Show notification about fix completion
    if (status === 'done' && exitCode === 0) {
      eventHandlers.showAppNotification(
        `Fix completed successfully. Re-checking verification...`,
        'success',
        3000
      );
    } else {
      eventHandlers.showAppNotification(
        `Fix command finished with issues. Re-checking verification...`,
        'warning',
        3000
      );
    }
    
    // Trigger single verification re-run
    try {
      if (window.electron?.rerunSingleVerification) {
        await window.electron.rerunSingleVerification(verificationId);
        debugLog('Verification re-run triggered for:', verificationId);
      } else {
        console.warn('Single verification re-run not available, triggering full refresh');
        // Fallback to full refresh if single verification not implemented yet
        eventHandlers.handleInitiateRefresh();
      }
    } catch (error) {
      console.error('Error triggering verification re-run:', error);
      eventHandlers.showAppNotification(
        `Error re-checking verification: ${error.message}`,
        'error'
      );
    }
  }, [appState.floatingTerminals, eventHandlers]);

  // Handle toggling all verification statuses for testing
  const handleToggleAllVerifications = useCallback(() => {
    debugLog('Toggling all verification statuses for testing');
    
    // Get the current general verification statuses (stored directly in general, not general.statuses)
    const currentGeneralStatuses = appState.verificationStatuses?.general || {};
    
    // Get list of test sections to exclude when showTestSections is false
    const testSectionIds = configurationSidebarSections.sections
      .filter(section => section.testSection === true)
      .map(section => section.id);
    
    // Check all verification statuses (both general and configuration)
    // but only consider visible sections
    let hasInvalidStatuses = Object.values(currentGeneralStatuses).includes('invalid');
    
    // Also check configuration statuses (only visible sections)
    if (!hasInvalidStatuses) {
      Object.keys(appState.verificationStatuses).forEach(key => {
        if (key !== 'general' && typeof appState.verificationStatuses[key] === 'object') {
          // Convert key back to section ID format to check if it's a test section
          const sectionId = key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
          
          // Skip test sections if they're not visible
          if (!appState.showTestSections && testSectionIds.includes(sectionId)) {
            return; // Skip this section
          }
          
          const sectionStatuses = appState.verificationStatuses[key];
          if (Object.values(sectionStatuses).includes('invalid')) {
            hasInvalidStatuses = true;
          }
        }
      });
    }
    
    // If there are any invalid statuses in visible sections, make all valid. Otherwise make all invalid.
    const newStatus = hasInvalidStatuses ? 'valid' : 'invalid';
    
    // Create new statuses for general environment verifications
    const newGeneralStatuses = {};
    if (appState.generalVerificationConfig && Array.isArray(appState.generalVerificationConfig)) {
      appState.generalVerificationConfig.forEach(categoryWrapper => {
        if (categoryWrapper.category && categoryWrapper.category.verifications) {
          categoryWrapper.category.verifications.forEach(verification => {
            newGeneralStatuses[verification.id] = newStatus;
          });
        }
      });
    }
    
    // Create new statuses for configuration sidebar verifications
    const newConfigStatuses = { ...appState.verificationStatuses };
    
    // Process configuration sidebar about data
    configurationSidebarAbout.forEach(section => {
      if (section.verifications && section.verifications.length > 0) {
        const cacheKey = section.sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        if (!newConfigStatuses[cacheKey]) {
          newConfigStatuses[cacheKey] = {};
        }
        section.verifications.forEach(verification => {
          newConfigStatuses[cacheKey][verification.id] = newStatus;
        });
      }
    });
    
    // Update all verification statuses
    appState.setVerificationStatuses(prevStatuses => ({
      ...newConfigStatuses,
      general: newGeneralStatuses  // Set general statuses directly, not nested
    }));
    
    // Show notification
    eventHandlers.showAppNotification(
      `All verifications set to: ${newStatus.toUpperCase()}`,
      'info',
      3000
    );
  }, [
    appState.verificationStatuses, 
    appState.generalVerificationConfig, 
    appState.setVerificationStatuses, 
    appState.showTestSections,
    eventHandlers
  ]);

  return {
    handleFixCommand,
    executePendingFixCommand,
    handleFixCommandComplete,
    handleToggleAllVerifications
  };
};
