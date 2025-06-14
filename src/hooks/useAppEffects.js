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
  setIsLoading,
  setAppNotification,
  terminalRef
}) => {
  const triggerGitRefresh = useCallback(async () => {
    console.log('App: Triggering targeted git status refresh...');
    if (window.electron && window.electron.refreshGitStatuses) {
      try {
        const newGitStatuses = await window.electron.refreshGitStatuses();
        console.log('App: Received new git statuses:', newGitStatuses);
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
      console.log('App: Received environment-verification-complete event:', results);
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
      console.log('App: Received stop-all-containers-before-quit event');
      if (terminalRef.current && terminalRef.current.stopAllContainers) {
        await terminalRef.current.stopAllContainers();
      }
    });
    
    // Handle container cleanup before reload
    const removeReloadListener = window.electron.onStopAllContainersBeforeReload(async () => {
      console.log('App: Received stop-all-containers-before-reload event');
      if (terminalRef.current && terminalRef.current.stopAllContainers) {
        await terminalRef.current.stopAllContainers();
      }
    });
    
    return () => {
      if (removeVerificationListener) removeVerificationListener();
      if (removeProgressListener) removeProgressListener();
      if (removeQuitListener) removeQuitListener();
      if (removeReloadListener) removeReloadListener();
    };
  }, []); // Setup listener once

  // Handle loading process with real progress tracking
  useEffect(() => {
    if (isLoading && window.electron) {
      let verificationComplete = false;
      let projectsLoaded = false;
      let progress = 0;
      
      const updateProgress = () => {
        // Base progress on actual completion
        if (!verificationComplete) {
          progress = Math.min(progress + 2, 40); // Cap at 40% until verification done
          setLoadingStatus('Verifying environment tools and dependencies...');
        } else if (!projectsLoaded) {
          progress = Math.min(progress + 3, 85); // Cap at 85% until projects loaded
          setLoadingStatus('Loading cloud projects and contexts...');
        } else {
          progress = Math.min(progress + 5, 100);
          setLoadingStatus('Finalizing setup...');
        }
        
        setLoadingProgress(Math.round(progress));
        
        if (progress >= 100) {
          setTimeout(() => setIsLoading(false), 300);
        } else {
          setTimeout(updateProgress, 100);
        }
      };
      
      // Start progress updates
      updateProgress();
      
      // Fetch initial verification data and precache dropdowns
      const fetchInitialData = async () => {
        try {
          console.log('App: Fetching initial environment verification data...');
          const initialResults = await window.electron.getEnvironmentVerification();
          console.log('App: Received initial environment verification data:', initialResults);
          
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
        } finally {
          verificationComplete = true;
        }
        
        // Now, precache the global dropdowns
        try {
          console.log('App: Pre-caching global dropdowns...');
          await window.electron.precacheGlobalDropdowns();
          console.log('App: Global dropdowns pre-cached successfully.');
        } catch (error) {
          console.error('App: Error pre-caching global dropdowns:', error);
        } finally {
          projectsLoaded = true;
        }
      };
            
      fetchInitialData();
    }
  }, [isLoading, setLoadingStatus, setLoadingProgress, setIsLoading, setVerificationStatuses, setGeneralVerificationConfig, setGeneralHeaderConfig]);

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