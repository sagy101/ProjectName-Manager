import { useEffect, useCallback } from 'react';
import { loggers } from '../utils/debugUtils.js';

const log = loggers.app;

export const useAppEffects = ({
  projectName,
  isLoading,
  verificationStatuses,
  setVerificationStatuses,
  setGeneralVerificationConfig,
  setGeneralHeaderConfig,
  setDiscoveredVersions,
  setLoadingStatus,
  setLoadingProgress,
  setLoadingTimeoutRemaining,
  setIsLoading,
  setAppNotification,
  terminalRef,
  showAppNotification,
  settings
}) => {
  const triggerGitRefresh = useCallback(async () => {
    log.debug('Triggering targeted git status refresh...');
    if (window.electron && window.electron.refreshGitStatuses) {
      try {
        const newGitStatuses = await window.electron.refreshGitStatuses();
        log.debug('Received new git statuses:', newGitStatuses);
        setVerificationStatuses(prev => {
          const newStatuses = { ...prev };
          for (const sectionKey in newGitStatuses) {
            if (newStatuses[sectionKey]) {
              newStatuses[sectionKey] = {
                ...newStatuses[sectionKey],
                gitBranch: newGitStatuses[sectionKey].gitBranch
              };
            }
          }
          return newStatuses;
        });
      } catch (error) {
        log.error('Error during targeted git refresh:', error);
        showAppNotification?.('Failed to refresh Git statuses', 'error');
      }
    }
  }, [setVerificationStatuses, showAppNotification]);

  // Set up process-related event listeners
  useEffect(() => {
    if (!window.electron) return;
    
    // Listener for ongoing updates (e.g., after manual refresh)
    const removeVerificationListener = window.electron.onEnvironmentVerificationComplete((results) => {
      log.debug('Received environment-verification-complete event:', results);
      if (results) {
        // Update general statuses
        if (results.general) {
          setGeneralVerificationConfig(results.general.config || []);
          setGeneralHeaderConfig(results.general.header || {});
        }
        
        setVerificationStatuses(prevStatuses => {
          const newStatuses = { ...prevStatuses };
          
          if (results.general) {
            newStatuses.general = results.general.statuses || {};
          }
          
          // Update all other sections dynamically
          Object.keys(results).forEach(key => {
            if (key !== 'general') {
              newStatuses[key] = results[key] || newStatuses[key];
            }
          });
          
          return newStatuses;
        });
        
        if (results.discoveredVersions) {
          setDiscoveredVersions(results.discoveredVersions);
        }
      }
    });
    
    // Handle verification progress
    const removeProgressListener = window.electron.onVerificationProgress((progress) => {
      setLoadingStatus(`Verifying environment... ${progress.percentage}%`);
      setLoadingProgress(progress.percentage);
    });
    
    // Handle container cleanup before quit
    const removeQuitListener = window.electron.onStopAllContainersBeforeQuit(async () => {
      log.debug('Received stop-all-containers-before-quit event');
      if (terminalRef.current && terminalRef.current.stopAllContainers) {
        await terminalRef.current.stopAllContainers();
      }
    });
    
    // Handle container cleanup before reload
    const removeReloadListener = window.electron.onStopAllContainersBeforeReload(async () => {
      log.debug('Received stop-all-containers-before-reload event');
      if (terminalRef.current && terminalRef.current.stopAllContainers) {
        await terminalRef.current.stopAllContainers();
      }
    });
    
    // Handle dropdown command execution results
    const removeDropdownCommandListener = window.electron.onDropdownCommandExecuted((data) => {
      log.debug('Received dropdown-command-executed event:', data);
      const { dropdownId, value, result } = data;
      
      if (result.success) {
        if (showAppNotification) {
          showAppNotification(
            `${dropdownId} updated to "${value}"${result.stdout ? ': ' + result.stdout : ''}`,
            'success',
            4000
          );
        }
      } else {
        if (showAppNotification) {
          showAppNotification(
            `Failed to update ${dropdownId}: ${result.error || 'Unknown error'}`,
            'error',
            6000
          );
        }
      }
    });
    
    return () => {
      if (removeVerificationListener) removeVerificationListener();
      if (removeProgressListener) removeProgressListener();
      if (removeQuitListener) removeQuitListener();
      if (removeReloadListener) removeReloadListener();
      if (removeDropdownCommandListener) removeDropdownCommandListener();
    };
  }, []); // Setup listener once

  // Handle loading process with event-driven progress tracking
  useEffect(() => {
    if (isLoading && window.electron) {
      let timeoutId;
      let countdownInterval;
      let verificationProgress = 0;
      let dropdownProgress = 0;
      let totalVerifications = 0;
      let totalDropdowns = 0;
      let verificationCompleted = false;
      let dropdownCompleted = false;

      const updateProgress = () => {
        // Calculate verification progress (0-70%)
        const verificationPct = totalVerifications === 0 ? 70 : verificationProgress;
        
        // Calculate dropdown progress (70-100%)
        const dropdownPct = totalDropdowns === 0 ? 30 : dropdownProgress;
        
        const totalProgress = verificationPct + dropdownPct;
        setLoadingProgress(Math.round(totalProgress));
        
        // Update status message
        if (!verificationCompleted && totalVerifications > 0) {
          setLoadingStatus(`Verifying environment... ${Math.round(verificationPct)}%`);
        } else if (!dropdownCompleted && totalDropdowns > 0) {
          setLoadingStatus(`Caching dropdowns... ${Math.round(totalProgress)}%`);
        } else if (totalVerifications === 0 && totalDropdowns === 0) {
          setLoadingStatus('No verifications or dropdowns to process');
        } else {
          setLoadingStatus('Initialization complete');
        }
        
        // Finish loading when both are complete or when progress reaches 100%
        if (totalProgress >= 100 || (verificationCompleted && dropdownCompleted)) {
          finishLoading();
        }
      };

      const removeProgressListener = window.electron.onVerificationProgress(({ completed, total, percentage }) => {
        totalVerifications = total || 0;
        
        if (totalVerifications === 0) {
          // No verifications to run, go straight to 70%
          verificationProgress = 70;
          verificationCompleted = true;
        } else {
          // Calculate progress as (completed / total) * 70
          verificationProgress = Math.round((completed / totalVerifications) * 70);
          verificationCompleted = (completed >= totalVerifications);
        }
        
        updateProgress();
      });

      const removeDropdownListener = window.electron.onDropdownCached(({ cached, total }) => {
        totalDropdowns = total || 0;
        
        if (totalDropdowns === 0) {
          // No dropdowns to cache, add the full 30%
          dropdownProgress = 30;
          dropdownCompleted = true;
        } else {
          // Calculate progress as (cached / total) * 30
          dropdownProgress = Math.round((cached / totalDropdowns) * 30);
          dropdownCompleted = (cached >= totalDropdowns);
        }
        
        updateProgress();
      });

      const finishLoading = () => {
        clearTimeout(timeoutId);
        clearInterval(countdownInterval);
        if (removeProgressListener) removeProgressListener();
        if (removeDropdownListener) removeDropdownListener();
        setLoadingTimeoutRemaining(0);
        setIsLoading(false);
      };

      // Setup timeout countdown
      const timeoutSeconds = settings?.loadingScreenTimeoutSeconds || 15;
      setLoadingTimeoutRemaining(timeoutSeconds);
      const start = Date.now();
      countdownInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        const remaining = Math.max(0, timeoutSeconds - elapsed);
        setLoadingTimeoutRemaining(remaining);
      }, 1000);
      timeoutId = setTimeout(() => {
        finishLoading();
        if (showAppNotification) {
          showAppNotification('Initialization timed out', 'error', 6000);
        }
      }, timeoutSeconds * 1000);

      // Set initial progress to give immediate feedback
      setLoadingProgress(5);
      setLoadingStatus('Starting application...');

      const fetchInitialData = async () => {
        // Small delay to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          log.debug('Fetching initial environment verification data...');
          setLoadingProgress(10);
          setLoadingStatus('Loading environment data...');
          
          const initialResults = await window.electron.getEnvironmentVerification();
          log.debug('Received initial environment verification data:', initialResults);
          if (initialResults) {
            if (initialResults.general) {
              setGeneralVerificationConfig(initialResults.general.config || []);
              setGeneralHeaderConfig(initialResults.general.header || {});
            }
            setVerificationStatuses(prevStatuses => {
              const newStatuses = { ...prevStatuses };
              if (initialResults.general) {
                newStatuses.general = initialResults.general.statuses || {};
              }
              Object.keys(initialResults).forEach(key => {
                if (key !== 'general') {
                  newStatuses[key] = initialResults[key] || newStatuses[key];
                }
              });
              return newStatuses;
            });
          }
        } catch (error) {
          log.error('Error fetching initial environment verification data:', error);
        }

        try {
          log.debug('Pre-caching global dropdowns...');
          await window.electron.precacheGlobalDropdowns();
          log.debug('Global dropdowns pre-cached successfully.');
        } catch (error) {
          log.error('Error pre-caching global dropdowns:', error);
        }
      };

      fetchInitialData();

      return () => {
        clearTimeout(timeoutId);
        clearInterval(countdownInterval);
        if (removeProgressListener) removeProgressListener();
        if (removeDropdownListener) removeDropdownListener();
      };
    }
  }, [isLoading, setLoadingStatus, setLoadingProgress, setIsLoading, setVerificationStatuses, setGeneralVerificationConfig, setGeneralHeaderConfig, showAppNotification, setLoadingTimeoutRemaining]);

  // Update document title with projectName
  useEffect(() => {
    document.title = `${projectName} Manager`;
  }, [projectName]);

  // This effect was for logging appNotification changes, but we don't have access to the notification state here
  // The logging is handled in the main App component instead

  return {
    triggerGitRefresh
  };
}; 