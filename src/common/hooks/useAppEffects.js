import { useEffect, useCallback } from 'react';

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
  showAppNotification
}) => {
  const triggerGitRefresh = useCallback(async () => {
    debugLog('App: Triggering targeted git status refresh...');
    if (window.electron && window.electron.refreshGitStatuses) {
      try {
        const newGitStatuses = await window.electron.refreshGitStatuses();
        debugLog('App: Received new git statuses:', newGitStatuses);
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
        console.error('App: Error during targeted git refresh:', error);
      }
    }
  }, [setVerificationStatuses]);

  // Set up process-related event listeners
  useEffect(() => {
    if (!window.electron) return;
    
    // Listener for ongoing updates (e.g., after manual refresh)
    const removeVerificationListener = window.electron.onEnvironmentVerificationComplete((results) => {
      debugLog('App: Received environment-verification-complete event:', results);
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
      debugLog('App: Received stop-all-containers-before-quit event');
      if (terminalRef.current && terminalRef.current.stopAllContainers) {
        await terminalRef.current.stopAllContainers();
      }
    });
    
    // Handle container cleanup before reload
    const removeReloadListener = window.electron.onStopAllContainersBeforeReload(async () => {
      debugLog('App: Received stop-all-containers-before-reload event');
      if (terminalRef.current && terminalRef.current.stopAllContainers) {
        await terminalRef.current.stopAllContainers();
      }
    });
    
    // Handle dropdown command execution results
    const removeDropdownCommandListener = window.electron.onDropdownCommandExecuted((data) => {
      debugLog('App: Received dropdown-command-executed event:', data);
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
      let currentProgress = 0;

      const removeProgressListener = window.electron.onVerificationProgress(({ percentage }) => {
        const pct = typeof percentage === 'number' && !Number.isNaN(percentage) ? percentage : 70;
        currentProgress = Math.max(currentProgress, pct);
        setLoadingStatus(`Verifying environment... ${Math.round(pct)}%`);
        setLoadingProgress(Math.round(currentProgress));
        if (currentProgress >= 100) finishLoading();
      });

      const removeDropdownListener = window.electron.onDropdownCached(({ cached, total }) => {
        const pct = total === 0 ? 100 : 70 + (cached / total) * 30;
        currentProgress = Math.max(currentProgress, pct);
        setLoadingStatus('Caching dropdowns...');
        setLoadingProgress(Math.round(currentProgress));
        if (currentProgress >= 100) finishLoading();
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
      setLoadingTimeoutRemaining(20);
      const start = Date.now();
      countdownInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        const remaining = Math.max(0, 20 - elapsed);
        setLoadingTimeoutRemaining(remaining);
      }, 1000);
      timeoutId = setTimeout(() => {
        finishLoading();
        if (showAppNotification) {
          showAppNotification('Initialization timed out', 'error', 6000);
        }
      }, 20000);

      const fetchInitialData = async () => {
        try {
          debugLog('App: Fetching initial environment verification data...');
          const initialResults = await window.electron.getEnvironmentVerification();
          debugLog('App: Received initial environment verification data:', initialResults);

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
          console.error('App: Error fetching initial environment verification data:', error);
        }

        try {
          debugLog('App: Pre-caching global dropdowns...');
          await window.electron.precacheGlobalDropdowns();
          debugLog('App: Global dropdowns pre-cached successfully.');
        } catch (error) {
          console.error('App: Error pre-caching global dropdowns:', error);
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