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
    
    debugLog('Fix command started:', {
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

    // Determine if any currently *visible* statuses are invalid. If yes → set them all valid, else → set them all invalid
    const currentStatuses = appState.verificationStatuses;

    // Helper to check if a section is a hidden test section
    const isHiddenTestSection = (sectionKey) => {
      // Convert camelCase key back to kebab-case id used in JSON
      const sectionId = sectionKey.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
      const matchingSection = configurationSidebarSections.sections.find(s => s.id === sectionId);
      return matchingSection?.testSection && !appState.showTestSections;
    };

    let hasInvalid = false;

    // 1. Check general statuses
    Object.values(currentStatuses.general || {}).forEach(status => {
      if (status === STATUS.INVALID) hasInvalid = true;
    });

    // 2. Check configuration section statuses (respect test section visibility)
    Object.keys(currentStatuses).forEach(sectionKey => {
      if (sectionKey === 'general') return;
      if (isHiddenTestSection(sectionKey)) return; // skip hidden test sections
      const sectionStatuses = currentStatuses[sectionKey];
      if (typeof sectionStatuses === 'object') {
        Object.values(sectionStatuses).forEach(status => {
          if (status === STATUS.INVALID) hasInvalid = true;
        });
      }
    });

    const newStatusValue = hasInvalid ? STATUS.VALID : STATUS.INVALID;

    // Build new status object by mapping over existing keys
    const updatedStatuses = {};
    Object.keys(currentStatuses).forEach(sectionKey => {
      const sectionValue = currentStatuses[sectionKey];
      if (typeof sectionValue === 'object') {
        updatedStatuses[sectionKey] = {};
        Object.keys(sectionValue).forEach(verId => {
          updatedStatuses[sectionKey][verId] = newStatusValue;
        });
      } else {
        updatedStatuses[sectionKey] = newStatusValue;
      }
    });

    appState.setVerificationStatuses(updatedStatuses);

    eventHandlers.showAppNotification(`All verifications set to: ${newStatusValue.toUpperCase()}`, 'info', 3000);
  }, [appState.verificationStatuses, appState.showTestSections, appState.setVerificationStatuses, eventHandlers]);

  return {
    handleFixCommand,
    executePendingFixCommand,
    handleFixCommandComplete,
    handleToggleAllVerifications
  };
};
