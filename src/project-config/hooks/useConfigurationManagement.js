import { useCallback } from 'react';
import { loggers } from '../../common/utils/debugUtils.js';

const logger = loggers.export;

export const useConfigurationManagement = ({
  projectConfigRef,
  globalDropdownValues,
  verificationStatuses,
  configSidebarSections,
  showAppNotification,
  setImportResult,
  setImportGitBranches,
  setShowImportStatusScreen,
  setIsPerformingImport,
  setGlobalDropdownValues,
  setConfigState,
  importResult,
  isPerformingImport
}) => {
  const handleExportConfig = useCallback(async () => {
    if (window.electron && projectConfigRef.current?.getCurrentState) {
      const state = projectConfigRef.current.getCurrentState();
      
      // Collect git branches for sections that support them
      const gitBranches = {};
      try {
        // Get sections that have git branch support
        const sectionsWithGit = configSidebarSections.filter(section => 
          section.components.gitBranch || section.components.gitBranchSwitcher
        );
        
        for (const section of sectionsWithGit) {
          if (verificationStatuses) {
            const cacheKey = section.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const sectionStatus = verificationStatuses[cacheKey];
            if (sectionStatus?.gitBranch && sectionStatus.gitBranch !== 'N/A' && sectionStatus.gitBranch !== 'waiting') {
              gitBranches[section.id] = sectionStatus.gitBranch;
            }
          }
        }
        
        logger.debug('Exporting git branches:', gitBranches);
      } catch (error) {
        logger.warn('Error collecting git branches for export:', error);
      }
      
      try {
        const result = await window.electron.exportConfig({
          configState: state.configState,
          attachState: state.attachState,
          globalDropdownValues,
          gitBranches // Add git branches to export
        });
        if (result?.success) {
          showAppNotification('Configuration exported', 'info');
        } else if (result?.error) {
          showAppNotification(`Export failed: ${result.error}`, 'error');
        }
      } catch (err) {
        logger.error('Export config error', err);
        showAppNotification('Export failed', 'error');
      }
    }
  }, [globalDropdownValues, showAppNotification, verificationStatuses, configSidebarSections, projectConfigRef]);

  const handleImportConfig = useCallback(async () => {
    if (window.electron && projectConfigRef.current?.setStateFromImport) {
      try {
        const result = await window.electron.importConfig();
        if (result?.success && result.configState) {
          // Store the complete import result and show the import status screen
          setImportResult(result);
          setImportGitBranches(result.gitBranches || {});
          setShowImportStatusScreen(true);
        } else if (result?.error) {
          showAppNotification(`Import failed: ${result.error}`, 'error');
        }
      } catch (err) {
        logger.error('Import config error', err);
        showAppNotification('Import failed', 'error');
      }
    }
  }, [showAppNotification, setImportResult, setImportGitBranches, setShowImportStatusScreen, projectConfigRef]);

  // Function to handle the actual import process (called by ImportStatusScreen)
  const performImport = useCallback(async (updateGitBranchStatus, updateConfigStatus) => {
    // Prevent multiple simultaneous imports
    if (isPerformingImport) {
      logger.debug('Import already in progress, skipping...');
      return;
    }

    try {
      setIsPerformingImport(true);
      logger.debug('Starting import process...');
      
      // Use the stored import result instead of calling importConfig again
      const result = importResult;
      if (!result?.success || !result.configState) {
        updateConfigStatus('error', 'Failed to load configuration');
        return;
      }

      // Import configuration
      updateConfigStatus('importing', 'Importing configuration...');
      
      // Set configuration state
      projectConfigRef.current.setStateFromImport({
        configState: result.configState,
        attachState: result.attachState
      });
      
      if (result.globalDropdownValues) {
        setGlobalDropdownValues(result.globalDropdownValues);
      }
      setConfigState(result.configState);
      
      updateConfigStatus('success', 'Configuration imported');

      // Handle git branch switching if branches were exported
      if (result.gitBranches && Object.keys(result.gitBranches).length > 0) {
        logger.debug('Switching to exported git branches:', result.gitBranches);
        
        // Get directory paths for sections from the about config
        const sectionDirectoryMap = {};
        try {
          const aboutConfig = await window.electron.getAboutConfig();
          aboutConfig.forEach(section => {
            if (section.directoryPath) {
              sectionDirectoryMap[section.sectionId] = section.directoryPath;
            }
          });
        } catch (error) {
          logger.warn('Error getting about config for git branch switching:', error);
        }
        
        // Process each branch switch
        const branchSwitchResults = {};
        
        for (const [sectionId, branchName] of Object.entries(result.gitBranches)) {
          updateGitBranchStatus(sectionId, 'switching', 'Switching branch...');
          
          const directoryPath = sectionDirectoryMap[sectionId];
          if (!directoryPath) {
            updateGitBranchStatus(sectionId, 'error', 'No directory path found');
            branchSwitchResults[sectionId] = { success: false, error: 'No directory path found' };
            continue;
          }
          
          // Check current branch first to avoid unnecessary switches
          const cacheKey = sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          const currentBranch = verificationStatuses[cacheKey]?.gitBranch;
          
          if (currentBranch === branchName) {
            updateGitBranchStatus(sectionId, 'skipped', `Already on ${branchName}`);
            branchSwitchResults[sectionId] = { success: true, skipped: true };
            continue;
          }
          
          try {
            const branchResult = await window.electron.gitCheckoutBranch(directoryPath, branchName);
            branchSwitchResults[sectionId] = { 
              success: branchResult.success, 
              error: branchResult.error,
              targetBranch: branchName 
            };
            
            // Don't update status yet - wait for environment refresh to complete
            if (!branchResult.success) {
              updateGitBranchStatus(sectionId, 'error', branchResult.error || 'Switch failed');
            }
          } catch (error) {
            branchSwitchResults[sectionId] = { success: false, error: error.message };
            updateGitBranchStatus(sectionId, 'error', error.message || 'Switch failed');
          }
        }
        
        // Trigger refresh and wait for it to complete
        logger.debug('Import: Triggering environment refresh...');
        if (window.electron?.refreshEnvironmentVerification) {
          try {
            await window.electron.refreshEnvironmentVerification();
            logger.debug('Import: Environment refresh completed');
          } catch (error) {
            logger.warn('Import: Environment refresh failed:', error);
          }
        }
        
        // Wait for UI to update and then verify
        logger.debug('Import: Waiting for UI to update...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify branches after a delay to allow React state to update
        setTimeout(() => {
          logger.debug('Import: Verifying branch switches after delay...');
          for (const [sectionId, switchResult] of Object.entries(branchSwitchResults)) {
            if (switchResult.skipped || !switchResult.success) {
              continue;
            }
            
            // Just mark as success since the git command succeeded
            // The UI will update when it's ready
            updateGitBranchStatus(sectionId, 'success', `Switched to ${switchResult.targetBranch}`);
            logger.debug(`Import: Marked ${sectionId} as switched to ${switchResult.targetBranch}`);
          }
        }, 100);
      }
      
    } catch (error) {
      logger.error('Import process failed:', error);
      updateConfigStatus('error', error.message || 'Import failed');
    } finally {
      setIsPerformingImport(false);
    }
  }, [isPerformingImport, importResult, verificationStatuses, setGlobalDropdownValues, setConfigState, setIsPerformingImport, projectConfigRef]);

  // Close import status screen
  const closeImportStatusScreen = useCallback(() => {
    setShowImportStatusScreen(false);
    setImportGitBranches({});
    setImportResult(null);
    setIsPerformingImport(false);
  }, [setShowImportStatusScreen, setImportGitBranches, setImportResult, setIsPerformingImport]);

  return {
    handleExportConfig,
    handleImportConfig,
    performImport,
    closeImportStatusScreen
  };
}; 