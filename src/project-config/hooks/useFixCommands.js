import { useCallback, useEffect, useState } from 'react';
import { STATUS } from '../../environment-verification/constants/verificationConstants';
import configurationSidebarAbout from '../config/configurationSidebarAbout.json';
import configurationSidebarSections from '../config/configurationSidebarSections.json';
import { loggers } from '../../common/utils/debugUtils.js';

const log = loggers.verification;
const logger = loggers.app;

export const useFixCommands = ({
  appState,
  eventHandlers,
  floatingTerminalHandlers
}) => {
  const [fixCommandStatuses, setFixCommandStatuses] = useState({});

  // Listen for single verification updates from backend
  useEffect(() => {
    if (!window.electron) return;

    const removeSingleVerificationListener = window.electron.onSingleVerificationUpdated?.((data) => {
      log.debug('Single verification updated:', data);
      
      const { verificationId, result, source, cacheKey } = data;
      
      // Update the appropriate verification status
      appState.setVerificationStatuses(prev => {
        const newStatuses = { ...prev };
        
        if (source === 'general') {
          // Update general environment verification
          if (newStatuses.general && typeof newStatuses.general === 'object') {
            // Handle both direct format and nested format
            if (newStatuses.general.statuses) {
              newStatuses.general = {
                ...newStatuses.general,
                statuses: {
                  ...newStatuses.general.statuses,
                  [verificationId]: result
                }
              };
            } else {
              // Direct format
              newStatuses.general = {
                ...newStatuses.general,
                [verificationId]: result
              };
            }
          } else {
            // Initialize general as direct format
            newStatuses.general = {
              [verificationId]: result
            };
          }
        } else if (cacheKey) {
          // Update specific section verification
          if (!newStatuses[cacheKey]) {
            newStatuses[cacheKey] = {};
          }
          newStatuses[cacheKey] = {
            ...newStatuses[cacheKey],
            [verificationId]: result
          };
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
    if (!verification || !verification.fixCommand) {
      // Clear pending verification even if there's no valid verification
      appState.setPendingFixVerification(null);
      return;
    }

    // Always clear the pending verification first to close the dialog
    appState.setPendingFixVerification(null);

    const terminalId = floatingTerminalHandlers.openFixCommandTerminal(
      verification.id,
      verification.title,
      verification.fixCommand
    );

    // If terminal was not created (e.g., limit reached), do not show the running fix notification
    if (!terminalId) {
      // openFloatingTerminal already showed a warning via showAppNotification
      return;
    }

    eventHandlers.showAppNotification(
      `Running fix command for: ${verification.title}`,
      'info',
      2000
    );
    
    log.debug('Fix command started:', {
      verification: verification.id,
      command: verification.fixCommand,
      terminalId
    });
  }, [appState.pendingFixVerification, floatingTerminalHandlers, eventHandlers, appState.setPendingFixVerification]);

  // Handle fix command completion and trigger verification re-run
  const handleFixCommandComplete = useCallback(async (terminalId, status, exitCode) => {
    // Find which verification this terminal was fixing
    const terminal = appState.floatingTerminals.find(t => t.id === terminalId);
    if (!terminal || !terminal.isFixCommand) return;
    
    // Extract verification ID from terminal command ID (set when creating fix terminal)
    const verificationId = terminal.commandId;
    
    log.debug('Fix command completed:', {
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
        log.debug('Verification re-run triggered for:', verificationId);
      } else {
        logger.warn('Single verification re-run not available, triggering full refresh');
        await refreshEnvironmentData();
      }
    } catch (error) {
      logger.error('Error triggering verification re-run:', error);
      eventHandlers.showAppNotification(
        `Error re-checking verification: ${error.message}`,
        'error'
      );
    }
  }, [appState.floatingTerminals, eventHandlers]);

  // Handle toggling all verification statuses for testing
  const handleToggleAllVerifications = useCallback(() => {
    log.debug('Toggling all verification statuses for testing');
    
    // Get the current general verification statuses (stored directly in general, not general.statuses)
    const currentGeneralStatuses = appState.verificationStatuses?.general || {};
    
    // Get list of test sections to exclude when showTestSections is false
    const testSectionIds = configurationSidebarSections.sections
      .filter(section => section.testSection === true)
      .map(section => section.id);
    
    // Check all verification statuses (both general and configuration)
    // but only consider visible sections and non-test verifications
    let hasInvalidStatuses = false;
    
    // For general verifications, check only non-test verifications if showTestSections is false
    if (appState.generalVerificationConfig && Array.isArray(appState.generalVerificationConfig)) {
      appState.generalVerificationConfig.forEach(categoryWrapper => {
        if (categoryWrapper.category && categoryWrapper.category.verifications) {
          categoryWrapper.category.verifications.forEach(verification => {
            // Skip test verifications if showTestSections is false
            if (verification.testVerification === true && !appState.showTestSections) {
              return;
            }
            const status = currentGeneralStatuses[verification.id];
            if (status === 'invalid') {
              hasInvalidStatuses = true;
            }
          });
        }
      });
    }
    
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
    const newStatus = hasInvalidStatuses ? STATUS.VALID : STATUS.INVALID;
    
    // Create new statuses for general environment verifications (only visible ones)
    const newGeneralStatuses = { ...currentGeneralStatuses }; // Start with current statuses
    if (appState.generalVerificationConfig && Array.isArray(appState.generalVerificationConfig)) {
      appState.generalVerificationConfig.forEach(categoryWrapper => {
        if (categoryWrapper.category && categoryWrapper.category.verifications) {
          categoryWrapper.category.verifications.forEach(verification => {
            // Only set status for visible verifications - skip test verifications if hidden
            if (verification.testVerification === true && !appState.showTestSections) {
              return; // Keep existing status for hidden test verifications
            }
            newGeneralStatuses[verification.id] = newStatus;
          });
        }
      });
    }
    
    // Create new statuses for configuration sidebar verifications (only visible sections)
    const newConfigStatuses = { ...appState.verificationStatuses };
    
    // Process configuration sidebar about data
    configurationSidebarAbout.forEach(section => {
      if (section.verifications && section.verifications.length > 0) {
        const cacheKey = section.sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        
        // Skip test sections if they're not visible
        if (!appState.showTestSections && testSectionIds.includes(section.sectionId)) {
          return; // Keep existing status for hidden test sections
        }
        
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
      `Visible verifications set to: ${newStatus.toUpperCase()}`,
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
