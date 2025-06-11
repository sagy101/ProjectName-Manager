import React, { useState, useEffect, useCallback, useRef } from 'react';
import IsoConfiguration from './components/IsoConfiguration';
import TerminalContainer from './components/TerminalContainer';
import EnvironmentVerification from './components/EnvironmentVerification';
import LoadingScreen from './components/LoadingScreen';
import Notification from './components/Notification';
import FloatingTerminal from './components/FloatingTerminal'; // Import FloatingTerminal
import AppControlSidebar from './components/AppControlSidebar'; // Renamed import
import TabInfoPanel from './components/TabInfoPanel'; // Add TabInfoPanel import
import ImportStatusScreen from './components/ImportStatusScreen'; // Import ImportStatusScreen
import './styles/app.css';
import { STATUS } from './constants/verificationConstants';
import appConfig from './configurationSidebarSections.json';
import configSidebarAbout from './configurationSidebarAbout.json'; // Import about config


// Destructure after import
const { displaySettings, sections: configSidebarSections } = appConfig;

// Constants for terminal and sidebar dimensions
const FLOATING_TERMINAL_AVG_WIDTH = 500; // Approximate width
const FLOATING_TERMINAL_AVG_HEIGHT = 300; // Approximate height
const SIDEBAR_EXPANDED_WIDTH = 280; // From app-control-sidebar.css
const SIDEBAR_COLLAPSED_WIDTH = 50; // From app-control-sidebar.css

const App = () => {
  // Project Name state
  const [projectName, setProjectName] = useState(displaySettings?.projectName || 'App');

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  // State for general verification configuration from verifications.json
  const [generalVerificationConfig, setGeneralVerificationConfig] = useState([]);
  const [generalHeaderConfig, setGeneralHeaderConfig] = useState({});
  
  // State for showing/hiding test sections
  const [showTestSections, setShowTestSections] = useState(false);

  // State for no-run mode
  const [noRunMode, setNoRunMode] = useState(false);
  
  // State for ISO running status from IsoConfiguration
  const [appIsIsoRunning, setAppIsIsoRunning] = useState(false);
  
  // State for app-level notifications
  const [appNotification, setAppNotification] = useState({
    isVisible: false,
    message: '',
    type: 'info',
    autoCloseTime: 3000
  });
  
  // State for configuration from IsoConfiguration
  const [configState, setConfigState] = useState({});

  // State for floating terminals
  const [floatingTerminals, setFloatingTerminals] = useState([]);
  const [activeFloatingTerminalId, setActiveFloatingTerminalId] = useState(null);

  // State for the "About" box for floating terminals - REPLACED
  const [infoPanelState, setInfoPanelState] = useState({
    isVisible: false,
    terminalData: null,
    position: { x: 0, y: 0 },
    detailsOpen: false // For the "More Details" popup within TabInfoPanel
  });

  // State for FloatingTerminalSidebar expansion
  const [isFloatingSidebarExpanded, setIsFloatingSidebarExpanded] = useState(false);

  // State for import status screen
  const [showImportStatusScreen, setShowImportStatusScreen] = useState(false);
  const [importGitBranches, setImportGitBranches] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [isPerformingImport, setIsPerformingImport] = useState(false);

  // Z-index and position management for floating terminals
  const [nextZIndex, setNextZIndex] = useState(1001); // Start above default elements
  const lastPosition = useRef({ x: 50, y: 50 }); // Initial spawn position
  const positionOffset = 30; // Pixels to offset new windows

  // State for main terminal writability (default to read-only)
  const [isMainTerminalWritable, setIsMainTerminalWritable] = useState(false);

  // Initialize verification statuses dynamically from JSON
  const initializeVerificationStatuses = () => {
    const statuses = {
      general: {}
    };
    
    // Initialize each section from JSON
    configSidebarSections.forEach(section => {
      const sectionKey = section.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      statuses[sectionKey] = { [sectionKey]: STATUS.WAITING, gitBranch: STATUS.WAITING };
    });
    
    return statuses;
  };

  // Track status of each indicator group
  const [verificationStatuses, setVerificationStatuses] = useState(initializeVerificationStatuses());

  // Global state for dropdown values (generic, not specific to any tool)
  const [globalDropdownValues, setGlobalDropdownValues] = useState({});

  const terminalRef = useRef(null);
  const isoConfigRef = useRef(null);

  // Floating Terminal Manager Functions

  // Define showFloatingTerminal first
  const showFloatingTerminal = useCallback((terminalId) => {
    setFloatingTerminals(prevTerminals =>
      prevTerminals.map(t =>
        t.id === terminalId
          ? { ...t, isVisible: true, isMinimized: false }
          : t
      )
    );
    setActiveFloatingTerminalId(terminalId); // Set as active
  }, []); // Ensure its own dependencies are correct (empty if none from App scope)

  // Define focusFloatingTerminal next
  const focusFloatingTerminal = useCallback((terminalId) => {
    setActiveFloatingTerminalId(terminalId);
    setFloatingTerminals(prevTerminals =>
      prevTerminals.map(t =>
        t.id === terminalId
          ? { ...t, zIndex: nextZIndex } // Bring to front
          : t
      )
    );
    setNextZIndex(prevZ => prevZ + 1); // Increment for the next focus action
  }, [nextZIndex]); // Depends on nextZIndex

  // Now define openFloatingTerminal, which depends on the two above
  const openFloatingTerminal = useCallback((commandId, title, command) => {
    setFloatingTerminals(prevTerminals => {
      const newTerminalId = `ft-${Date.now()}-${commandId}`;
      const existingTerminal = prevTerminals.find(t => t.commandId === commandId && t.title === title);

      if (existingTerminal) {
        // If terminal exists, show and focus it.
        // If it was minimized, ensure it un-minimizes and becomes visible.
        setFloatingTerminals(currentTerminals =>
          currentTerminals.map(t =>
            t.id === existingTerminal.id
              ? { ...t, isVisible: true, isMinimized: false, zIndex: nextZIndex } // Bring to front, ensure visible & not minimized
              : t
          )
        );
        setActiveFloatingTerminalId(existingTerminal.id);
        setNextZIndex(prevZ => prevZ + 1);
        return prevTerminals.map(t => t.id === existingTerminal.id ? { ...t, isVisible: true, isMinimized: false } : t); // This return might be redundant due to setFloatingTerminals above
      }

      // Calculate centered position for new terminals
      const sidebarCurrentWidth = isFloatingSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
      const availableWidth = window.innerWidth - sidebarCurrentWidth;
      
      let centeredX = (availableWidth - FLOATING_TERMINAL_AVG_WIDTH) / 2;
      // Ensure it's not positioned too far left or behind the sidebar
      centeredX = Math.max(10, centeredX);
 
      let centeredY = (window.innerHeight - FLOATING_TERMINAL_AVG_HEIGHT) / 2;
      centeredY = Math.max(10, centeredY);

      // Apply simple staggering for new terminals to avoid exact overlap
      const staggerOffset = (prevTerminals.filter(t => t.isVisible).length % 5) * positionOffset; // Stagger based on visible terminals
      const finalX = centeredX + staggerOffset;
      const finalY = centeredY + staggerOffset;

      const newTerminal = {
        id: newTerminalId,
        commandId,
        title,
        command,
        isVisible: true,
        isMinimized: false,
        position: { x: finalX, y: finalY }, // Use calculated and staggered position
        zIndex: nextZIndex
      };
      setNextZIndex(prevZ => prevZ + 1);
      setActiveFloatingTerminalId(newTerminalId);
      return [...prevTerminals, newTerminal];
    });
  }, [nextZIndex, focusFloatingTerminal, showFloatingTerminal, positionOffset, isFloatingSidebarExpanded]); // Added isFloatingSidebarExpanded

  const closeFloatingTerminal = useCallback((terminalId) => {
    setFloatingTerminals(prevTerminals =>
      prevTerminals.filter(t => t.id !== terminalId)
    );
    if (activeFloatingTerminalId === terminalId) {
      setActiveFloatingTerminalId(null);
    }
  }, [activeFloatingTerminalId]);

  const toggleMinimizeFloatingTerminal = useCallback((terminalId) => {
    setFloatingTerminals(prevTerminals =>
      prevTerminals.map(t =>
        t.id === terminalId
          ? { ...t, isMinimized: !t.isMinimized, isVisible: t.isMinimized } // If un-minimizing, make visible
          : t
      )
    );
  }, []);

  const hideFloatingTerminal = useCallback((terminalId) => {
    setFloatingTerminals(prevTerminals =>
      prevTerminals.map(t =>
        t.id === terminalId
          ? { ...t, isVisible: false }
          : t
      )
    );
  }, []);

  // Manages showing the TabInfoPanel for floating terminals
  const showFloatingTerminalInfoPanel = useCallback((terminalId) => {
    const terminal = floatingTerminals.find(t => t.id === terminalId);
    if (!terminal) {
      console.warn(`showFloatingTerminalInfoPanel: Terminal not found for ID: ${terminalId}`);
      return;
    }

    const aboutConfig = configSidebarAbout.find(info => info.sectionId === terminal.commandId);
    const description = aboutConfig?.description || "No specific description available.";
    // const verifications = aboutConfig?.verifications || []; // Not directly used by TabInfoPanel yet

    let commandWithDetails = terminal.command;
    if (description) {
      commandWithDetails = `About: ${description}\n\nCommand:\n${terminal.command}`;
    }

    const terminalDataForPanel = {
      id: terminal.id,
      title: terminal.title,
      command: commandWithDetails,
      originalCommand: terminal.command,
      status: terminal.isMinimized ? 'minimized' : (terminal.isVisible ? 'active' : 'hidden'),
      sectionId: terminal.commandId,
      startTime: parseInt(terminal.id.split('-')[1], 10) || Date.now(),
      associatedContainers: [],
    };

    const panelX = window.innerWidth - SIDEBAR_EXPANDED_WIDTH - 420;
    const panelY = 100;

    setInfoPanelState({
      isVisible: true,
      terminalData: terminalDataForPanel,
      position: { x: Math.max(10, panelX), y: panelY },
      detailsOpen: false
    });
  }, [floatingTerminals, configState, noRunMode, SIDEBAR_EXPANDED_WIDTH]);

  const closeFloatingTerminalInfoPanel = useCallback(() => {
    setInfoPanelState(prev => ({ ...prev, isVisible: false, detailsOpen: false }));
  }, []);

  const openInfoPanelDetails = useCallback(() => {
    setInfoPanelState(prev => ({ ...prev, detailsOpen: true }));
  }, []);

  const closeInfoPanelDetails = useCallback(() => {
    setInfoPanelState(prev => ({ ...prev, detailsOpen: false }));
  }, []);

  const toggleFloatingSidebarExpand = useCallback((expandedState) => {
    // If an explicit state is passed (true/false), use it. Otherwise, toggle.
    if (typeof expandedState === 'boolean') {
      setIsFloatingSidebarExpanded(expandedState);
    } else {
      setIsFloatingSidebarExpanded(prev => !prev);
    }
  }, []);

  const triggerGlobalRefresh = async () => {
    console.log('App: Triggering global environment verification refresh...');
    if (window.electron && window.electron.refreshEnvironmentVerification) {
      try {
        handleInitiateRefresh(); 
        await window.electron.refreshEnvironmentVerification(); 
      } catch (error) {
        console.error('App: Error during triggered global refresh:', error);
      }
    }
  };

  // Set up process-related event listeners
  useEffect(() => {
    if (!window.electron) return;
    
    // Listener for ongoing updates (e.g., after manual refresh)
    const removeVerificationListener = window.electron.onEnvironmentVerificationComplete((results) => {
      console.log('App: Received environment-verification-complete event:', results);
      if (results) {
        const newStatuses = { ...verificationStatuses };
        
        // Update general statuses
        if (results.general) {
          newStatuses.general = results.general.statuses || {};
          setGeneralVerificationConfig(results.general.config || []);
          setGeneralHeaderConfig(results.general.header || {});
        }
        
        // Update all other sections dynamically
        Object.keys(results).forEach(key => {
          if (key !== 'general') {
            newStatuses[key] = results[key] || newStatuses[key];
          }
        });
        
        setVerificationStatuses(newStatuses);
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

  // The initial dropdown values will be handled by the DropdownSelector components themselves
  // based on the JSON configuration

  // Callback to handle dropdown value changes from any global selector
  const handleGlobalDropdownChange = useCallback((dropdownId, value) => {
    console.log(`App: Global dropdown '${dropdownId}' changed to:`, value);
    setGlobalDropdownValues(prev => ({ ...prev, [dropdownId]: value }));
    
    // Notify backend about dropdown value change for cache management
    if (window.electron && window.electron.dropdownValueChanged) {
      window.electron.dropdownValueChanged(dropdownId, value);
    }
  }, []);

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
            const newStatuses = { ...verificationStatuses };
            if (initialResults.general) {
              newStatuses.general = initialResults.general.statuses || {};
              setGeneralVerificationConfig(initialResults.general.config || []);
              setGeneralHeaderConfig(initialResults.general.header || {});
            }
            Object.keys(initialResults).forEach(key => {
              if (key !== 'general') {
                newStatuses[key] = initialResults[key] || newStatuses[key];
              }
            });
            setVerificationStatuses(newStatuses);
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
  }, [isLoading]);

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
  const handleToggleTestSections = () => {
    setShowTestSections(prev => !prev);
  };
  
  // Toggle no-run mode
  const handleToggleNoRunMode = () => {
    setNoRunMode(prev => !prev);
  };

  // Handle config state changes from IsoConfiguration
  const handleConfigStateChange = (newConfigState) => {
    setConfigState(newConfigState);
  };

  // Callback for IsoConfiguration to update App's isRunning state
  const handleIsoRunStateChange = (isRunning) => {
    console.log('App: ISO running state changed to:', isRunning);
    setAppIsIsoRunning(isRunning);
  };

  // Function to show an app-level notification
  const showAppNotification = (message, type = 'info', autoCloseTime = 3000) => {
    console.log('App: showAppNotification called with:', { message, type, autoCloseTime });
    setAppNotification({
      isVisible: true,
      message,
      type,
      autoCloseTime
    });
  };

  // Function to hide the app-level notification
  const hideAppNotification = () => {
    setAppNotification(prev => ({ ...prev, isVisible: false }));
  };

  // Function to reset verification statuses and config to waiting/empty
  const handleInitiateRefresh = useCallback(() => {
    console.log('App: Initiating refresh, setting statuses to waiting and config to empty.');
    const resetStatuses = initializeVerificationStatuses();
    setVerificationStatuses(resetStatuses);
    setGeneralVerificationConfig([]); // Clear the config so child component shows loading/empty
  }, []);

  // Toggle main terminal writability
  const toggleMainTerminalWritable = useCallback(() => {
    setIsMainTerminalWritable(prev => !prev);
  }, []);

  const handleExportConfig = useCallback(async () => {
    if (window.electron && isoConfigRef.current?.getCurrentState) {
      const state = isoConfigRef.current.getCurrentState();
      
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
        
        console.log('Exporting git branches:', gitBranches);
      } catch (error) {
        console.warn('Error collecting git branches for export:', error);
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
        console.error('Export config error', err);
        showAppNotification('Export failed', 'error');
      }
    }
  }, [globalDropdownValues, showAppNotification, verificationStatuses, configSidebarSections]);

  const handleImportConfig = useCallback(async () => {
    if (window.electron && isoConfigRef.current?.setStateFromImport) {
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
        console.error('Import config error', err);
        showAppNotification('Import failed', 'error');
      }
    }
  }, [showAppNotification]);

  // Function to handle the actual import process (called by ImportStatusScreen)
  const performImport = useCallback(async (updateGitBranchStatus, updateConfigStatus) => {
    // Prevent multiple simultaneous imports
    if (isPerformingImport) {
      console.log('Import already in progress, skipping...');
      return;
    }

    try {
      setIsPerformingImport(true);
      console.log('Starting import process...');
      
      // Use the stored import result instead of calling importConfig again
      const result = importResult;
      if (!result?.success || !result.configState) {
        updateConfigStatus('error', 'Failed to load configuration');
        return;
      }

      // Import configuration
      updateConfigStatus('importing', 'Importing configuration...');
      
      // Set configuration state
      isoConfigRef.current.setStateFromImport({
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
        console.log('Switching to exported git branches:', result.gitBranches);
        
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
          console.warn('Error getting about config for git branch switching:', error);
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
        console.log('Import: Triggering environment refresh...');
        if (window.electron?.refreshEnvironmentVerification) {
          try {
            await window.electron.refreshEnvironmentVerification();
            console.log('Import: Environment refresh completed');
          } catch (error) {
            console.warn('Import: Environment refresh failed:', error);
          }
        }
        
        // Wait for UI to update and then verify
        console.log('Import: Waiting for UI to update...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify branches after a delay to allow React state to update
        setTimeout(() => {
          console.log('Import: Verifying branch switches after delay...');
          for (const [sectionId, switchResult] of Object.entries(branchSwitchResults)) {
            if (switchResult.skipped || !switchResult.success) {
              continue;
            }
            
            // Just mark as success since the git command succeeded
            // The UI will update when it's ready
            updateGitBranchStatus(sectionId, 'success', `Switched to ${switchResult.targetBranch}`);
            console.log(`Import: Marked ${sectionId} as switched to ${switchResult.targetBranch}`);
          }
        }, 100);
      }
      
    } catch (error) {
      console.error('Import process failed:', error);
      updateConfigStatus('error', error.message || 'Import failed');
    } finally {
      setIsPerformingImport(false);
    }
  }, [isPerformingImport, importResult, verificationStatuses, setGlobalDropdownValues, setConfigState]);

  // Close import status screen
  const closeImportStatusScreen = useCallback(() => {
    setShowImportStatusScreen(false);
    setImportGitBranches({});
    setImportResult(null);
    setIsPerformingImport(false);
  }, []);

  // Update document title with projectName
  useEffect(() => {
    document.title = `${projectName} Manager`;
  }, [projectName]);

  // Log appNotification state changes
  useEffect(() => {
    console.log('App: appNotification state updated:', appNotification);
  }, [appNotification]);

  // Show loading screen while loading
  if (isLoading) {
    return (
      <LoadingScreen 
        progress={loadingProgress} 
        statusMessage={loadingStatus} 
        projectName={displaySettings?.projectName || 'Project'}
      />
    );
  }

  return (
    <>
      {/* Main application content */}
      <div style={{ height: '100vh', position: 'relative', display: 'flex' }}>
        {/* app-content-wrapper now correctly receives padding for the collapsed sidebar */}
        <div
          className="app-content-wrapper"
          style={{
            flexGrow: 1,
            paddingRight: isFloatingSidebarExpanded ? `${SIDEBAR_EXPANDED_WIDTH}px` : `${SIDEBAR_COLLAPSED_WIDTH}px`,
            transition: 'padding-right 0.3s ease-in-out',
            height: '100%', // Use 100% to fill parent flex item
            display: 'flex', // For its children .sidebar and .main-content
            overflow: 'hidden',
          }}
        >
          <div className="sidebar"> {/* IsoConfiguration's wrapper */}
            <IsoConfiguration
              ref={isoConfigRef}
              projectName={projectName}
              globalDropdownValues={globalDropdownValues}
              terminalRef={terminalRef}
              verificationStatuses={verificationStatuses}
              onTriggerRefresh={triggerGlobalRefresh}
              showTestSections={showTestSections}
              onConfigStateChange={handleConfigStateChange}
              onIsRunningChange={handleIsoRunStateChange}
              openFloatingTerminal={openFloatingTerminal} // Pass down the function
            />
          </div>
          <div className="main-content"> {/* TerminalContainer etc. */}
            <EnvironmentVerification
              projectName={projectName}
              statusMap={verificationStatuses.general}
              verificationConfig={generalVerificationConfig}
              headerConfig={generalHeaderConfig}
              globalDropdownValues={globalDropdownValues}
              onGlobalDropdownChange={handleGlobalDropdownChange}
              onInitiateRefresh={handleInitiateRefresh}
            />
            <TerminalContainer 
              ref={terminalRef} 
              noRunMode={noRunMode} 
              configState={configState} 
              projectName={projectName} 
              isReadOnly={!isMainTerminalWritable} // Pass inverse for isReadOnly prop
            />
          </div>
        </div> {/* End of app-content-wrapper */}

        {/* FloatingTerminalSidebar is a direct child of the outer flex container,
            allowing it to be fixed to the right without being affected by app-content-wrapper's padding. */}
        {!isLoading && (
          <AppControlSidebar
            floatingTerminals={floatingTerminals}
            onShowTerminal={showFloatingTerminal}
            onCloseTerminal={closeFloatingTerminal}
            onToggleMinimize={toggleMinimizeFloatingTerminal}
            onOpenAbout={showFloatingTerminalInfoPanel}
            activeFloatingTerminalId={activeFloatingTerminalId}
            isExpanded={isFloatingSidebarExpanded}
            onToggleExpand={toggleFloatingSidebarExpand}
            showTestSections={showTestSections}
            noRunMode={noRunMode}
            isIsoRunning={appIsIsoRunning}
            onToggleTestSections={handleToggleTestSections}
            onToggleNoRunMode={handleToggleNoRunMode}
            showAppNotification={showAppNotification}
            isMainTerminalWritable={isMainTerminalWritable}
            onToggleMainTerminalWritable={toggleMainTerminalWritable}
            onExportConfig={handleExportConfig}
            onImportConfig={handleImportConfig}
          />
        )}
      </div> {/* End of the main flex container for isLoading=false case */}

      {/* Global Modals & Notifications: These render on top of everything, outside the main layout flow. */}
      <Notification
        isVisible={appNotification.isVisible}
        message={appNotification.message}
        type={appNotification.type}
        onClose={hideAppNotification}
        autoCloseTime={appNotification.autoCloseTime}
      />
      {/* Import Status Screen */}
      <ImportStatusScreen
        isVisible={showImportStatusScreen}
        projectName={projectName}
        onClose={closeImportStatusScreen}
        gitBranches={importGitBranches}
        onImportComplete={performImport}
      />
      {/* Render FloatingTerminals */}
      {floatingTerminals.map(terminal => (
        <FloatingTerminal
          key={terminal.id}
          id={terminal.id}
          title={terminal.title}
          command={terminal.command}
          isVisible={terminal.isVisible}
          isMinimized={terminal.isMinimized}
          onClose={closeFloatingTerminal}
          onFocus={focusFloatingTerminal}
          zIndex={terminal.zIndex}
          initialPosition={terminal.position}
          onMinimize={toggleMinimizeFloatingTerminal}
          isReadOnly={false}
          noRunMode={noRunMode}
        />
      ))}
      {/* Render TabInfoPanel for Floating Terminals */}
      {infoPanelState.isVisible && infoPanelState.terminalData && (
        <TabInfoPanel
          terminal={infoPanelState.terminalData}
          position={infoPanelState.position}
          onClose={closeFloatingTerminalInfoPanel}
          onRefresh={() => console.log("Refresh clicked for floating term info - no-op")} // No-op for now
          configState={configState} // Pass from App's state
          noRunMode={noRunMode}     // Pass from App's state
          detailsPopupOpen={infoPanelState.detailsOpen}
          onOpenDetailsPopup={openInfoPanelDetails}
          onCloseDetailsPopup={closeInfoPanelDetails}
        />
      )}
    </>
  );
};

export default App;
