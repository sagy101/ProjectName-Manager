import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import ConfigSection from './ConfigSection';
import Notification from './Notification';
import StoppingStatusScreen from './StoppingStatusScreen';
import { projectSelectorFallbacks } from '../constants/selectors';
import { STATUS } from '../constants/verificationConstants';
import configSidebarSections from '../configurationSidebarSections.json';
import configSidebarCommands from '../configurationSidebarCommands.json';
import { evaluateCondition, generateCommandList } from '../utils/evalUtils';
import '../styles/iso-configuration.css';

// Destructure after import to get the actual sections array
const configSidebarSectionsActual = configSidebarSections.sections;

// Props now include globalDropdownValues from App.jsx and terminalRef from TerminalManager.jsx
const IsoConfiguration = forwardRef(({ projectName, globalDropdownValues, terminalRef, verificationStatuses, onTriggerRefresh, showTestSections = false, onConfigStateChange, onIsRunningChange, openFloatingTerminal }, ref) => {
  // Initialize config state with default values
  const [configState, setConfigState] = useState({});
  // Track if an ISO is currently running
  const [isRunning, setIsRunning] = useState(false);
  // Track if ISO is in the process of stopping
  const [isStopping, setIsStopping] = useState(false);
  // Track if stopping screen should be shown
  const [showStoppingScreen, setShowStoppingScreen] = useState(false);
  // Track current terminal ID
  const [currentTerminalId, setCurrentTerminalId] = useState(null);
  // Track if config has been initialized
  const [initialized, setInitialized] = useState(false);
  // Ref to track if the component has mounted
  const isMounted = useRef(false);
  // State for attach toggles
  const [attachState, setAttachState] = useState({});
  // State for warning indication on toggles
  const [warningState, setWarningState] = useState({});
  // State for notification
  const [notification, setNotification] = useState({
    message: '',
    type: 'info',
    isVisible: false
  });

  // Filter sections based on showTestSections prop
  const visibleSections = configSidebarSectionsActual.filter(section => 
    showTestSections || !section.testSection
  );

  // Initialize config state from JSON - runs only once
  useEffect(() => {
    if (!initialized) {
      const initialConfig = {};
      const initialAttachState = {};
      
      configSidebarSectionsActual.forEach(section => {
        initialConfig[section.id] = {
                  enabled: false,
        };
        
        if (section.components.deploymentOptions) {
          initialConfig[section.id].deploymentType = section.components.deploymentOptions[0] || 'container';
        }
        
        if (section.components.modeSelector) {
          initialConfig[section.id].mode = section.components.modeSelector.default || section.components.modeSelector.options[0];
        }
        
        if (section.components.attachToggle?.enabled || section.components.attachToggle === true) {
          initialAttachState[section.id] = false;
        }

        // Initialize dropdown states, including 'Selected' flags
        if (section.components.dropdownSelectors) {
          section.components.dropdownSelectors.forEach(dd => {
            initialConfig[section.id][dd.id] = dd.placeholder || ''; // Store placeholder or empty
            initialConfig[section.id][`${dd.id}Selected`] = false; // E.g., threatIntelPodSelected = false
          });
        }
        
        if (section.components.subSections) {
          section.components.subSections.forEach(subSection => {
            const configKey = `${subSection.id.replace(/-sub$/, '')}Config`;
            initialConfig[section.id][configKey] = {
              enabled: false,
            };
            if (subSection.components.deploymentOptions) {
              const defaultType = subSection.components.deploymentOptions[0];
              initialConfig[section.id][configKey].deploymentType = defaultType;
            }
            if (subSection.components.modeSelector) {
              initialConfig[section.id][configKey].mode = subSection.components.modeSelector.default || subSection.components.modeSelector.options[0];
            }
            // Initialize dropdown states for sub-sections, including 'Selected' flags
            if (subSection.components.dropdownSelectors) {
              subSection.components.dropdownSelectors.forEach(dd => {
                // Dropdown values for sub-sections are stored in the parent section's config object directly by dropdownId
                initialConfig[section.id][dd.id] = dd.placeholder || '';
                initialConfig[section.id][`${dd.id}Selected`] = false;
              });
            }
          });
        }
      });
      
      setConfigState(initialConfig);
      setAttachState(initialAttachState);
      setInitialized(true);
    }
  }, [initialized]);
  
  // Update dropdown values in configState when global dropdown values change
  useEffect(() => {
    if (initialized && globalDropdownValues && Object.keys(globalDropdownValues).length > 0) {
      setConfigState(prevState => {
        const newState = { ...prevState };
        let changed = false;
        
        // Update dropdown values for all sections
        configSidebarSectionsActual.forEach(section => {
          if (newState[section.id]) {
            // Copy all dropdown values to the section state
            Object.keys(globalDropdownValues).forEach(dropdownId => {
              if (newState[section.id][dropdownId] !== globalDropdownValues[dropdownId]) {
                newState[section.id] = { 
                  ...newState[section.id], 
                  [dropdownId]: globalDropdownValues[dropdownId]
                };
                changed = true;
              }
            });
          }
        });
        
        return changed ? newState : prevState;
      });
    }
  }, [globalDropdownValues, initialized]);
  
  // Reset warning state after a short delay
  useEffect(() => {
    const hasWarnings = Object.values(warningState).some(w => w);
    if (hasWarnings) {
      const timer = setTimeout(() => {
        setWarningState({});
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [warningState]);

  // Auto-hide notifications after a delay
  useEffect(() => {
    if (notification.isVisible) {
      const timer = setTimeout(() => {
        hideNotification();
      }, 5000); // Auto-hide after 5 seconds

      return () => clearTimeout(timer); // Cleanup timer if component unmounts or notification changes
    }
  }, [notification.isVisible, notification.message]); // Re-run if visibility or message changes

  // Update isRunning state and notify parent
  const updateIsRunning = (runningStatus) => {
    setIsRunning(runningStatus);
    if (onIsRunningChange) {
      onIsRunningChange(runningStatus);
    }
  };

  // Component did mount effect
  useEffect(() => {
    updateIsRunning(false); // Initial state
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Set up process-related event listeners
  useEffect(() => {
    if (!isMounted.current || !currentTerminalId) return;
    
    if (window.electron) {
      const processStartedHandler = (data) => {
        if (isMounted.current) {
          updateIsRunning(true);
        }
      };
      
      const processEndedHandler = (data) => {
        if (data.terminalId === currentTerminalId && isMounted.current) {
          updateIsRunning(false);
          setCurrentTerminalId(null);
        }
      };
      
      const processKilledHandler = (data) => {
        if (data.terminalId === currentTerminalId && isMounted.current) {
          updateIsRunning(false);
          setCurrentTerminalId(null);
        }
      };
      
      // Register event handlers
      const removeStartedListener = window.electron.onProcessStarted(processStartedHandler);
      const removeEndedListener = window.electron.onProcessEnded(processEndedHandler);
      const removeKilledListener = window.electron.onProcessKilled(processKilledHandler);
      
      // Cleanup function
      return () => {
        removeStartedListener();
        removeEndedListener();
        removeKilledListener();
      };
    }
  }, [currentTerminalId]);

  // Toggle section enabled state
  const toggleSectionEnabled = (sectionId, enabled) => {
    // Check for section-specific validation requirements
    const section = configSidebarSectionsActual.find(s => s.id === sectionId);
    if (enabled && section?.components?.mainToggle?.validationRequired) {
      const validation = section.components.mainToggle.validationRequired;
      // Generic validation check for dropdown dependencies
      const conditionParts = validation.condition.match(/(\w+)\s*&&\s*!projectSelectorFallbacks\.includes\((\w+)\)/);
      if (conditionParts) {
        const dropdownId = conditionParts[1].replace('selected', '').charAt(0).toLowerCase() + conditionParts[1].replace('selected', '').slice(1);
        const dropdownValue = globalDropdownValues?.[dropdownId];
        if (!dropdownValue || projectSelectorFallbacks.includes(dropdownValue)) {
          setNotification({
            message: validation.errorMessage,
            type: 'error',
            isVisible: true
          });
          return;
        }
      }
    }

    setConfigState(prevState => {
      const newState = {
        ...prevState,
        [sectionId]: {
          ...prevState[sectionId],
          enabled,
          // Keep existing dropdown values
          ...Object.keys(globalDropdownValues || {}).reduce((acc, key) => ({
            ...acc,
            [key]: prevState[sectionId]?.[key] || globalDropdownValues[key]
          }), {}),
        }
      };
      
      // If disabling, also disable sub-sections
      if (!enabled && section?.components?.subSections) {
        section.components.subSections.forEach(subSection => {
          const configKey = `${subSection.id.replace(/-sub$/, '')}Config`;
          if (newState[sectionId][configKey]) {
            newState[sectionId][configKey] = {
              ...newState[sectionId][configKey],
          enabled: false,
        };
      }
        });
      }
      
      return newState;
    });

    if (!enabled && attachState[sectionId]) {
      handleAttachToggle(sectionId, false);
    }
  };

  // Toggle sub-section enabled state
  const toggleSubSectionEnabled = (sectionId, subSectionId, enabled) => {
    // Prevent changes if ISO is running
    if (isRunning) {
      showNotification(`Cannot change settings while ISO is running.`, 'error');
      return;
    }

    const configKey = `${subSectionId.replace(/-sub$/, '')}Config`;

    setConfigState(prevState => {
      const parentConfig = prevState[sectionId] || {};
      const subSectionConfig = parentConfig[configKey] || {};
      
      return {
        ...prevState,
        [sectionId]: {
          ...parentConfig,
          [configKey]: {
            ...subSectionConfig,
            enabled: enabled,
          },
        },
      };
    });
  };

  // Set deployment type for sections
  const setMode = (sectionId, mode, subSectionId = null) => {
    // Prevent changes if ISO is running
    if (isRunning) {
      showNotification(`Cannot change deployment type while ISO is running.`, 'error');
      return;
    }

    if (subSectionId) {
      const configKey = `${subSectionId.replace(/-sub$/, '')}Config`;
      setConfigState(prevState => ({
        ...prevState,
        [sectionId]: {
          ...prevState[sectionId],
          [configKey]: {
            ...prevState[sectionId][configKey],
            mode,
          },
        },
      }));
    } else {
      setConfigState(prevState => ({
        ...prevState,
        [sectionId]: {
          ...prevState[sectionId],
          mode
        }
      }));
    }
  };

  // Handle attach toggle with mutual exclusivity
  const handleAttachToggle = (sectionId, shouldAttach) => {
    if (shouldAttach) {
      // Find sections that are mutually exclusive
      const section = configSidebarSectionsActual.find(s => s.id === sectionId);
      const attachToggle = section?.components?.attachToggle;
      const mutuallyExclusive = (typeof attachToggle === 'object' ? attachToggle.mutuallyExclusiveWith : []) || [];
      
      // Check if any mutually exclusive section is attached
      const attachedExclusive = Object.entries(attachState)
        .find(([id, attached]) => attached && mutuallyExclusive.includes(id));
      
      if (attachedExclusive) {
        const [otherSectionId] = attachedExclusive;
        const otherSection = configSidebarSectionsActual.find(s => s.id === otherSectionId);
        
        setWarningState(prev => ({
          ...prev,
          [otherSectionId]: true
        }));
        
        setNotification({
          message: `Disabled attach on ${otherSection?.title || otherSectionId} - only one can have attach enabled at a time.`,
          type: 'warning',
          isVisible: true
        });
        
        // Update attach state
        setAttachState(prev => ({
          ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
          [sectionId]: true
        }));
      } else {
        setAttachState(prev => ({
          ...prev,
          [sectionId]: true
        }));
      }
    } else {
      setAttachState(prev => ({
        ...prev,
        [sectionId]: false
      }));
    }
  };

  // Generic dropdown value setter for sections
  const setSectionDropdownValue = useCallback((sectionId, dropdownId, value) => {
    setConfigState(prevState => {
      // Find the placeholder for this dropdown to correctly set the 'Selected' flag
      let placeholder = 'Select...'; // Default generic placeholder
      const mainSectionDef = configSidebarSectionsActual.find(s => s.id === sectionId);
      let dropdownDef = mainSectionDef?.components?.dropdownSelectors?.find(dd => dd.id === dropdownId);

      if (!dropdownDef) {
        // If not in main section dropdowns, check sub-sections of this sectionId
        mainSectionDef?.components?.subSections?.forEach(sub => {
          const subDropdownDef = sub.components?.dropdownSelectors?.find(dd => dd.id === dropdownId);
          if (subDropdownDef) {
            dropdownDef = subDropdownDef;
          }
        });
      }
      if (dropdownDef?.placeholder) {
        placeholder = dropdownDef.placeholder;
      }

      const isSelected = value && value !== placeholder;

      return {
        ...prevState,
        [sectionId]: {
          ...prevState[sectionId],
          [dropdownId]: value,
          [`${dropdownId}Selected`]: isSelected // Set the boolean flag
        }
      };
    });
  }, []);

  // Hide notification
  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  // Stop the currently running ISO
  const stopIsoExecution = async () => {
    setIsStopping(true); // Set stopping state
    setShowStoppingScreen(true); // Show the stopping screen
    
    if (terminalRef.current && terminalRef.current.killAllTerminals) {
      try {
        await terminalRef.current.killAllTerminals(); // Await completion
      } catch (error) {
      }
    }
    
    // Clear tabs after ensuring processes and containers are handled
    if (terminalRef.current && terminalRef.current.clearTabs) {
      terminalRef.current.clearTabs();
    }

    updateIsRunning(false);
    setCurrentTerminalId(null); // Clear current terminal ID as all are stopped
    setIsStopping(false); // Reset stopping state
  };

  // Handle closing the stopping screen
  const handleCloseStoppingScreen = () => {
    setShowStoppingScreen(false);
  };

  // Run ISO configuration
  const runIsoConfiguration = () => {
    if (isStopping) return; // Prevent action if already stopping

    if (isRunning) {
      // If running, call stopIsoExecution instead of just toggling state
      stopIsoExecution(); 
    } else {
      const commandList = generateCommandList(
        configState,
        globalDropdownValues,
        {
          attachState,
          configSidebarCommands,
          configSidebarSectionsActual,
          showTestSections
        }
      );
      if (terminalRef && terminalRef.current) {
        updateIsRunning(true);
        terminalRef.current.openTabs(commandList);
      }
    }
  };
  
  
  // Helper function to get the correct path verification status for a section
  const getSectionPathStatus = (sectionId, statuses) => {
    if (!statuses) return STATUS.WAITING;
    
    const cacheKey = sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const sectionStatus = statuses[cacheKey];
    
    if (!sectionStatus) return STATUS.WAITING;
    
    // Handle sections with no specific checks
    if (sectionStatus.status === 'no_specific_checks') {
      return STATUS.VALID;
    }
    
    // Return the full status object so ConfigSection can access individual verification statuses
    return sectionStatus;
  };

  // Helper function to get the Git branch for a section
  const getSectionGitBranch = (sectionId, statuses) => {
    if (!statuses) return 'waiting';
    
    const cacheKey = sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const sectionStatus = statuses[cacheKey];
    
    return sectionStatus?.gitBranch || 'N/A';
  };

  // Call onConfigStateChange whenever configState changes
  useEffect(() => {
    if (onConfigStateChange && initialized) {
      onConfigStateChange(configState);
    }
  }, [configState, onConfigStateChange, initialized]);

  useImperativeHandle(ref, () => ({
    getCurrentState: () => ({ configState, attachState }),
    setStateFromImport: ({ configState: newConfig, attachState: newAttach }) => {
      if (newConfig) setConfigState(newConfig);
      if (newAttach) setAttachState(newAttach);
    }
  }));

  return (
    <div className="config-container">
      <Notification 
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
      
      <StoppingStatusScreen
        terminals={terminalRef.current?.getTerminals ? terminalRef.current.getTerminals() : []}
        isVisible={showStoppingScreen}
        projectName={projectName}
        onClose={handleCloseStoppingScreen}
      />
      
      <div id="config-sections">
        {visibleSections.map(section => (
          <ConfigSection
            key={section.id}
            section={section}
            config={configState[section.id] || {}}
            toggleEnabled={toggleSectionEnabled}
            setMode={setMode}
            setSectionDropdownValue={setSectionDropdownValue}
            globalDropdownValues={globalDropdownValues}
            isAttached={attachState[section.id] || false}
            onAttachToggle={(attached) => handleAttachToggle(section.id, attached)}
            isAttachWarning={warningState[section.id] || false}
            isLocked={isRunning}
            sectionPathStatus={getSectionPathStatus(section.id, verificationStatuses)}
            sectionGitBranch={getSectionGitBranch(section.id, verificationStatuses)}
            onTriggerRefresh={onTriggerRefresh}
            attachState={attachState}
            configState={configState}
            toggleSubSectionEnabled={toggleSubSectionEnabled}
            openFloatingTerminal={openFloatingTerminal}
            configSidebarCommands={configSidebarCommands}
          />
        ))}
      </div>
      
      <div className="run-button-container">
        <button 
          id="run-configuration-button" 
          className={`run-configuration-button ${
            isStopping ? 'stopping' : isRunning ? 'stop' : ''
          }`}
          onClick={runIsoConfiguration}
          disabled={
            isStopping ||
            (!isRunning &&
              generateCommandList(
                configState,
                globalDropdownValues,
                {
                  attachState,
                  configSidebarCommands,
                  configSidebarSectionsActual,
                  showTestSections
                }
              ).length === 0)
          }
        >
          {isStopping ? (
            <>
              <svg className="stopping-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>              
              </svg>
              STOPPING {projectName.toUpperCase()}...
            </>
          ) : isRunning ? (
            <>
              <svg className="stop-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M6 6h12v12H6z" />
              </svg>
              STOP {projectName.toUpperCase()}
            </>
          ) : (
            <>
              <svg className="run-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
              RUN {projectName.toUpperCase()}
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export default IsoConfiguration;