import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConfigSection from './ConfigSection';
import Notification from './Notification';
import StoppingStatusScreen from './StoppingStatusScreen';
import { projectSelectorFallbacks } from '../constants/selectors';
import { STATUS } from '../constants/verificationConstants';
import configSidebarSections from '../configurationSidebarSections.json';
import configSidebarCommands from '../configurationSidebarCommands.json';

// Destructure after import to get the actual sections array
const { sections: configSidebarSectionsActual } = configSidebarSections;

// Props now include globalDropdownValues from App.jsx and terminalRef from TerminalManager.jsx
const IsoConfiguration = ({ projectName, globalDropdownValues, terminalRef, verificationStatuses, onTriggerRefresh, showTestSections = false, onConfigStateChange, onIsRunningChange, openFloatingTerminal }) => {
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
      
      console.log('IsoConfiguration: Initialized configState', JSON.stringify(initialConfig));
      setConfigState(initialConfig);
      setAttachState(initialAttachState);
      setInitialized(true);
    }
  }, [initialized]);
  
  // Update dropdown values in configState when global dropdown values change
  useEffect(() => {
    if (initialized && globalDropdownValues && Object.keys(globalDropdownValues).length > 0) {
      console.log('IsoConfiguration: Global dropdown values changed:', globalDropdownValues);
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
        console.log('Process started:', data);
        if (isMounted.current) {
          updateIsRunning(true);
        }
      };
      
      const processEndedHandler = (data) => {
        console.log('Process ended:', data);
        if (data.terminalId === currentTerminalId && isMounted.current) {
          updateIsRunning(false);
          setCurrentTerminalId(null);
        }
      };
      
      const processKilledHandler = (data) => {
        console.log('Process killed:', data);
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

  // Generic sub-section toggle handler
  const toggleSubSectionEnabled = (sectionId, subSectionId, enabled) => {
    const configKey = `${subSectionId.replace(/-sub$/, '')}Config`;
    setConfigState(prevState => ({
      ...prevState,
      [sectionId]: {
        ...prevState[sectionId],
        [configKey]: {
          ...prevState[sectionId][configKey],
          enabled,
        },
      },
    }));
  };

  // Generic sub-section deployment type handler
  const setSubSectionDeploymentType = (sectionId, subSectionId, deploymentType) => {
    const configKey = `${subSectionId.replace(/-sub$/, '')}Config`;
    setConfigState(prevState => ({
      ...prevState,
      [sectionId]: {
        ...prevState[sectionId],
        [configKey]: {
          ...prevState[sectionId][configKey],
          deploymentType,
        },
      },
    }));
  };

  // Set deployment type for sections
  const setDeploymentType = (sectionId, deploymentType) => {
    setConfigState(prevState => ({
      ...prevState,
      [sectionId]: {
        ...prevState[sectionId],
        deploymentType
      }
    }));
  };

  // Set mode for sections with mode selector
  const setMode = (sectionId, mode) => {
    setConfigState(prevState => ({
      ...prevState,
      [sectionId]: {
        ...prevState[sectionId],
        enabled: true,
        mode
      }
    }));
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
    console.log(`IsoConfiguration: setSectionDropdownValue called for section '${sectionId}', dropdown '${dropdownId}', value: '${value}'`);
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
    console.log('IsoConfiguration: stopIsoExecution called');
    setIsStopping(true); // Set stopping state
    setShowStoppingScreen(true); // Show the stopping screen
    
    if (terminalRef.current && terminalRef.current.killAllTerminals) {
      try {
        console.log('IsoConfiguration: Calling killAllTerminals');
        await terminalRef.current.killAllTerminals(); // Await completion
        console.log('IsoConfiguration: killAllTerminals completed');
      } catch (error) {
        console.error('IsoConfiguration: Error during killAllTerminals:', error);
      }
    }
    
    // Clear tabs after ensuring processes and containers are handled
    if (terminalRef.current && terminalRef.current.clearTabs) {
      console.log('IsoConfiguration: Calling clearTabs');
      terminalRef.current.clearTabs();
      console.log('IsoConfiguration: clearTabs completed');
    }

    updateIsRunning(false);
    setCurrentTerminalId(null); // Clear current terminal ID as all are stopped
    setIsStopping(false); // Reset stopping state
    console.log('IsoConfiguration: stopIsoExecution finished');
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
      const commandList = generateCommandList(configState, globalDropdownValues);
      if (terminalRef && terminalRef.current) {
        updateIsRunning(true);
        console.log('runIsoConfiguration: Calling openTabs with commandList:', commandList);
        terminalRef.current.openTabs(commandList);
      }
    }
  };
  
  // Helper function to evaluate conditions
  const evaluateCondition = (conditionStr, currentConfig, currentSectionId) => {
    // console.log(`  Evaluating condition: "${conditionStr}" for section "${currentSectionId}"`);
    // New strategy: Use a safer Function constructor with a well-defined context.
    // The context will include:
    // 1. All properties of the current section's config (e.g., config.alpha.*)
    // 2. All other top-level section configs, accessible via their {sectionId}Config name (e.g., betaEngineConfig.deploymentType)
    // 3. The global attachState.
    // 4. All global dropdown values.

    const context = {};

    // Add current section's direct properties
    if (currentConfig[currentSectionId]) {
      Object.assign(context, currentConfig[currentSectionId]);
    }

    // Add other sections' configs as {sectionId}Config
    // Also add their subConfigs directly for easier access like someSubConfig.property
    for (const sectionKey in currentConfig) {
      if (currentConfig.hasOwnProperty(sectionKey)) {
        // Add top-level section config, e.g., betaEngineConfig for section 'beta-engine'
        context[`${sectionKey}Config`] = currentConfig[sectionKey];

        // Add sub-section configs of this top-level section directly to context
        // e.g., if sectionKey is 'alpha' and it has 'frontendConfig', add 'frontendConfig' to context
        if (typeof currentConfig[sectionKey] === 'object' && currentConfig[sectionKey] !== null) {
          for (const subKey in currentConfig[sectionKey]) {
            if (currentConfig[sectionKey].hasOwnProperty(subKey) && subKey.endsWith('Config')) {
              context[subKey] = currentConfig[sectionKey][subKey];
            }
          }
        }
      }
    }
    
    // Add global attachState
    context.attachState = attachState || {};

    // Add global dropdown values
    if (globalDropdownValues) {
        Object.assign(context, globalDropdownValues);
    }

    // console.log(`    Context for condition "${conditionStr}":`, context);

    try {
      // Sanitize condition string to prevent direct access to 'config' or 'currentConfig'
      // and ensure it's treated as a boolean expression.
      let safeConditionStr = conditionStr;
      // Basic safety: remove direct "config." or "currentConfig." if someone tries to be clever.
      safeConditionStr = safeConditionStr.replace(/config\./g, '').replace(/currentConfig\./g, '');
      
      const conditionFunction = new Function(...Object.keys(context), `return !!(${safeConditionStr});`);
      const result = conditionFunction(...Object.values(context));
      // console.log(`    Condition "${conditionStr}" evaluated to: ${result}`);
      return result;
    } catch (e) {
      console.error(`Error evaluating condition "${conditionStr}" for section "${currentSectionId}":`, e);
      console.error("Available context keys:", Object.keys(context));
      return false;
    }
  };

  // Helper function to evaluate expressions (DEPRECATED - logic moved to evaluateCondition)
  // This function can be removed if evaluateCondition handles all cases.
  // For now, ensure it's not called or calls the new evaluateCondition for boolean results.
  const evaluateExpression = (expression, config, sectionId) => {
    // This is now a wrapper or should be deprecated.
    // For boolean results, which is what modifiers/excludes often need:
    // console.warn(`evaluateExpression is being called for "${expression}". This may need to use evaluateCondition's context.`);
    
    // If the expression is intended to resolve to a string (e.g. for replacement), this needs different handling.
    // For now, assuming it's for a boolean check as part of a condition structure.
    return evaluateCondition(expression, config, sectionId);
  };

  // Function to generate commands based on configuration
  const generateCommandList = (config, globalDropdowns) => {
    const commands = [];
    const generatedCommandSectionIds = new Set(); // Initialize Set to track generated commands
    
    console.log('generateCommandList - Full config state:', JSON.stringify(config, null, 2));
    console.log('generateCommandList - attachState:', attachState);
    console.log('generateCommandList - showTestSections prop:', showTestSections);
    
    configSidebarCommands.forEach((commandDef, index) => {
      const { sectionId: cmdSectionId, conditions, command } = commandDef; // Renamed to cmdSectionId
      const commandDefinitionId = index;
      
      // Step 1: Check if cmdSectionId corresponds to a real, displayable section or sub-section in configSidebarSectionsActual
      const isDisplayableSectionOrSubSection = configSidebarSectionsActual.some(s =>
        s.id === cmdSectionId || (s.components?.subSections?.some(sub => sub.id === cmdSectionId))
      );

      if (!isDisplayableSectionOrSubSection) {
        console.log(`Command ${cmdSectionId} (Def ID: ${commandDefinitionId}) does not match a displayable section/sub-section. Assuming it's for a custom button or other non-"Run ISO" trigger. Skipping.`);
        return; // Skip this commandDef for "Run ISO"
      }

      // Step 2: For displayable sections, determine the effective section for testSection flag checking
      // (A sub-section's test status is determined by its main parent section)
      let effectiveSectionDefForTestCheck = configSidebarSectionsActual.find(s => s.id === cmdSectionId);
      if (!effectiveSectionDefForTestCheck) { // If not a top-level section, it must be a sub-section
        const parentSection = configSidebarSectionsActual.find(s => s.components?.subSections?.some(sub => sub.id === cmdSectionId));
        if (parentSection) {
          effectiveSectionDefForTestCheck = parentSection; 
          // console.log(`Command for sub-section ${cmdSectionId}. Parent for testSection check: ${parentSection.id}`);
        }
      }

      // Now, apply the testSection logic using effectiveSectionDefForTestCheck
      if (effectiveSectionDefForTestCheck?.testSection && !showTestSections) {
        console.log(`Skipping command for section: ${cmdSectionId} (effective parent for test check: ${effectiveSectionDefForTestCheck.id}) because it's a test section and showTestSections is false.`);
        return; 
      }

      console.log(`\nProcessing command for displayable section: ${cmdSectionId} (Def ID: ${commandDefinitionId})`);
      console.log('Conditions:', conditions);
      
      let shouldInclude = true;
      let isSubSectionCommand = false;
      
      if (conditions) {
        Object.entries(conditions).forEach(([key, expectedValue]) => {
          let actualValue;
          isSubSectionCommand = key.includes('Config'); // A simple heuristic for now
          
          // Updated Condition Evaluation Logic
          if (key.includes('.')) {
            const [leftPart, propertyToAccess] = key.split('.', 2); // E.g., leftPart="alphaConfig", propertyToAccess="enabled"
            if(leftPart.endsWith('attachState')) {
              actualValue = attachState?.[propertyToAccess];
              console.log(`    Condition ${key}: looked up in global attachState`);
            } else if (leftPart.endsWith('Config')) {
              const configObjectName = leftPart; // e.g., "frontendConfig" or "alphaConfig"
              
              // Case 1: Condition is like "someSectionConfig.enabled"
              // This should refer to the main 'enabled' status of the section derived from 'someSectionConfig'
              if (propertyToAccess === 'enabled') {
                const sectionIdToEvaluate = configObjectName.replace('Config', ''); // e.g., "alpha" or "frontend"
                
                // Check if 'sectionIdToEvaluate' is a top-level section
                if (config[sectionIdToEvaluate] !== undefined) {
                  actualValue = config[sectionIdToEvaluate]?.enabled;
                  console.log(`    Condition ${key} (sectionConfig.enabled): Evaluated ${sectionIdToEvaluate}.enabled`);
                } else {
                  // If not top-level, it might be a sub-section. Find its parent and evaluate its own 'enabled' state.
                  let parentSectionIdForSub = null;
                  let subSectionActualConfigObject = null;
                  for (const topLvlId in config) {
                    if (config[topLvlId] && typeof config[topLvlId] === 'object' && configObjectName in config[topLvlId]) {
                      parentSectionIdForSub = topLvlId;
                      subSectionActualConfigObject = config[parentSectionIdForSub]?.[configObjectName];
                      break;
                    }
                  }
                  if (subSectionActualConfigObject) {
                    actualValue = subSectionActualConfigObject.enabled; // a sub-section's own enabled state
                    console.log(`    Condition ${key} (subSectionConfig.enabled): Evaluated ${parentSectionIdForSub}.${configObjectName}.enabled`);
                  } else {
                    actualValue = undefined;
                    console.warn(`    Warning: Could not resolve ${key}. Section ${sectionIdToEvaluate} not found as top-level, and ${configObjectName} not found as sub-config object.`);
                  }
                }
              } else {
                // Case 2: Condition is like "subSectionConfig.someOtherProperty" (e.g., frontendConfig.deploymentType)
                let parentSectionIdForConfigObject = null;
                for (const topLevelSectionIdInState in config) {
                  if (config[topLevelSectionIdInState] && typeof config[topLevelSectionIdInState] === 'object' && configObjectName in config[topLevelSectionIdInState]) {
                    parentSectionIdForConfigObject = topLevelSectionIdInState;
                    break;
                  }
                }
                if (parentSectionIdForConfigObject) {
                  actualValue = config[parentSectionIdForConfigObject]?.[configObjectName]?.[propertyToAccess];
                  console.log(`    Condition ${key} (subConfig.property): Evaluated ${parentSectionIdForConfigObject}.${configObjectName}.${propertyToAccess}`);
                } else {
                  actualValue = undefined;
                  console.warn(`    Warning: Could not resolve ${key}. Could not find parent for ${configObjectName}.`);
                }
              }
            } else {
              // Generic dot notation, not ending with Config before the dot.
              actualValue = key.split('.').reduce((obj, prop) => obj?.[prop], config[cmdSectionId]);
              console.log(`    Condition ${key} (generic dot): Evaluated in context of ${cmdSectionId}`);
            }
          } else {
            // Simple key (no dot), e.g., "enabled" or "threatIntelPodSelected"
            let targetObjectForSimpleKey;
            let parentOfCmdSection = null; 

            // Find parent of command's sectionId if it's a sub-section
            configSidebarSectionsActual.forEach(s => {
                if (s.components?.subSections?.some(sub => sub.id === cmdSectionId)) {
                    parentOfCmdSection = s.id;
                }
            });

            if (key.endsWith('Selected') && parentOfCmdSection) {
                // For keys like "threatIntelPodSelected", the state is on the parent section's config
                // because the dropdown's state (including its {dropdownId}Selected flag) is managed under the parent section in configState
                targetObjectForSimpleKey = config[parentOfCmdSection];
                console.log(`    Condition ${key} (Selected flag for sub-section's dropdown): Looking in parent ${parentOfCmdSection} for ${key}`);
            } else if (parentOfCmdSection) {
                // For other simple keys of a sub-section command (like its own 'enabled' state),
                // use its own config object which is nested under the parent
                const subConfigObjectName = `${cmdSectionId.replace(/-sub$/, '')}Config`;
                targetObjectForSimpleKey = config[parentOfCmdSection]?.[subConfigObjectName];
                console.log(`    Targeting sub-config: ${parentOfCmdSection}.${subConfigObjectName} for simple key '${key}'`);
            } else {
                // For simple keys of a top-level section command
                targetObjectForSimpleKey = config[cmdSectionId];
            }
            actualValue = targetObjectForSimpleKey?.[key];
            console.log(`    Condition ${key} (simple key for cmdSection ${cmdSectionId}): Evaluated. Parent: ${parentOfCmdSection}`);
          }
          
          console.log(`  FINAL CHECK: Condition: ${key} === ${expectedValue}, Actual: ${actualValue}`);
          shouldInclude = shouldInclude && actualValue === expectedValue;
        });
      }
      
      console.log(`  Should include: ${shouldInclude}, Is sub-section: ${isSubSectionCommand}`);
      
      if (!shouldInclude) return;
      
      let finalCommand = command.base;
      
      if (command.modifiers) {
        command.modifiers.forEach(modifier => {
          const conditionMet = evaluateCondition(modifier.condition, config, cmdSectionId);
          if (conditionMet) {
            if (modifier.append) {
              finalCommand += modifier.append;
            } else if (modifier.replace) {
              finalCommand = modifier.replace;
            }
          }
        });
      }
      
      if (command.postModifiers) {
        finalCommand += command.postModifiers;
      }
      
      if (command.excludes) {
        command.excludes.forEach(exclude => {
          const conditionMet = evaluateCondition(exclude.condition, config, cmdSectionId);
          if (conditionMet && exclude.append) {
            finalCommand += exclude.append;
          }
        });
      }
      
      if (command.finalAppend) {
        finalCommand += command.finalAppend;
      }
      
      if (command.prefix) {
        finalCommand = command.prefix + finalCommand;
      }
      
      // Replace variables dynamically
      finalCommand = finalCommand.replace(/\$\{(\w+)\}/g, (match, varName) => {
        let replacementValue = match; // Default to original match if not found
        let found = false;

        // Determine if the current command's sectionId is a sub-section and find its parent
        let parentSectionId = null;
        let subSectionConfigObjectName = null;
        const currentCommandSectionIsSubSection = configSidebarSectionsActual.some(s => {
            if (s.components?.subSections?.some(sub => sub.id === cmdSectionId)) {
                parentSectionId = s.id;
                subSectionConfigObjectName = `${cmdSectionId.replace(/-sub$/, '')}Config`;
                return true;
            }
            return false;
        });

        if (currentCommandSectionIsSubSection && parentSectionId) {
          // For sub-sections, first check parent section's direct properties (e.g., for dropdowns defined in parent or sibling sub-sections)
          if (config[parentSectionId]?.[varName] !== undefined) {
            replacementValue = config[parentSectionId][varName];
            found = true;
            console.log(`    Var ${varName} (for sub-section ${cmdSectionId}): Found in parent ${parentSectionId} direct properties.`);
          } else if (subSectionConfigObjectName && config[parentSectionId]?.[subSectionConfigObjectName]?.[varName] !== undefined) {
            // Then check the sub-section's own config object
            replacementValue = config[parentSectionId][subSectionConfigObjectName][varName];
            found = true;
            console.log(`    Var ${varName} (for sub-section ${cmdSectionId}): Found in own config ${parentSectionId}.${subSectionConfigObjectName}`);
          }
        } else {
          // For top-level sections, check its direct properties
          if (config[cmdSectionId]?.[varName] !== undefined) {
            replacementValue = config[cmdSectionId][varName];
            found = true;
            console.log(`    Var ${varName} (for top-level section ${cmdSectionId}): Found in section direct properties.`);
          }
        }

        // If not found yet, check global dropdown values
        if (!found && globalDropdowns?.[varName] !== undefined) {
          replacementValue = globalDropdowns[varName];
          found = true;
          console.log(`    Var ${varName}: Found in globalDropdowns.`);
        }
        
        // Special case for mode, ensuring context (top-level or sub-section)
        if (!found && varName === 'mode') {
          if (currentCommandSectionIsSubSection && parentSectionId && subSectionConfigObjectName) {
            replacementValue = config[parentSectionId]?.[subSectionConfigObjectName]?.mode || match;
            if (replacementValue !== match) found = true;
            console.log(`    Var 'mode' (for sub-section ${cmdSectionId}): Looked up in ${parentSectionId}.${subSectionConfigObjectName}`);
          } else if (config[cmdSectionId]?.mode !== undefined) {
            replacementValue = config[cmdSectionId]?.mode || match;
            if (replacementValue !== match) found = true;
            console.log(`    Var 'mode' (for top-level section ${cmdSectionId}): Looked up in section direct properties.`);
          }
        }
        
        console.log(`    Replacing \$\{${varName}\} with: ${replacementValue}`);
        return replacementValue;
      });
      
      let tabTitle = command.tabTitle;
      if (typeof tabTitle === 'object') {
        tabTitle = command.tabTitle.base;
        if (command.tabTitle.conditionalAppends) {
          command.tabTitle.conditionalAppends.forEach(append => {
            const conditionMet = evaluateCondition(append.condition, config, cmdSectionId);
            if (conditionMet) {
              tabTitle += append.append;
            }
            });
        }
      }
      
      const resolvedAssociatedContainers = [];
      if (command.associatedContainers) {
        command.associatedContainers.forEach(containerAssoc => {
          if (typeof containerAssoc === 'string') {
            resolvedAssociatedContainers.push(containerAssoc);
          } else if (typeof containerAssoc === 'object' && containerAssoc.name) {
            if (!containerAssoc.condition || evaluateCondition(containerAssoc.condition, config, cmdSectionId)) {
              resolvedAssociatedContainers.push(containerAssoc.name);
            }
          }
        });
      }
      
      commands.push({ 
        section: tabTitle,
        command: finalCommand,
        sectionId: cmdSectionId,
        commandDefinitionId: commandDefinitionId,
        isSubSectionCommand: isSubSectionCommand,
        associatedContainers: resolvedAssociatedContainers,
        refreshConfig: command.refreshConfig
      });
      generatedCommandSectionIds.add(cmdSectionId); // Add sectionId if command was added
    });

    // Add error tabs for sections/sub-sections that are enabled but have no command
    configSidebarSectionsActual.forEach(sectionDef => {
      const sectionId = sectionDef.id;
      const sectionTitle = sectionDef.title;

      // Handle Parent Sections
      if (configState[sectionId]?.enabled) {
        const hasCommandConfig = configSidebarCommands.some(cmd => cmd.sectionId === sectionId);

        if (hasCommandConfig) {
          // Scenario 1.a (Error for parent - configured but no command)
          if (!generatedCommandSectionIds.has(sectionId)) {
            commands.push({
              title: sectionTitle,
              sectionId: sectionId,
              type: 'error',
              message: 'No suitable command found for the current configuration.',
              id: `error-${sectionId}-${Date.now()}`
            });
          }
        } else {
          // Scenario 1.b (Error for parent - not configured OR no valid sub-sections)
          let sectionError = true;
          let sectionErrorMessage = 'No commands configured for this section and no active/valid sub-sections.';

          if (sectionDef.components?.subSections && sectionDef.components.subSections.length > 0) {
            for (const subSectionDef of sectionDef.components.subSections) {
              const subSectionId = subSectionDef.id;
              const subSectionConfigKey = `${subSectionId.replace(/-sub$/, '')}Config`;

              if (configState[sectionId]?.[subSectionConfigKey]?.enabled) {
                if (generatedCommandSectionIds.has(subSectionId)) {
                  // This enabled sub-section has a valid command, so parent error (1.b) is not needed.
                  sectionError = false;
                  break;
                }
                // If the sub-section is enabled but didn't generate a command,
                // it might get its own error tab (handled below).
                // The parent error (1.b) might still apply if no *other* sub-section is valid.
                // If !subHasCommandConfig for this enabled sub-section, it contributes to parent error.
                // If subHasCommandConfig for this enabled sub-section (but no generated command),
                // it will get its own error, parent error might still be shown.
              }
            }
          }

          // Add error for parent (Scenario 1.b) only if sectionError is still true
          // AND this parent section itself didn't somehow generate a command.
          if (sectionError && !generatedCommandSectionIds.has(sectionId)) {
            commands.push({
              title: sectionTitle,
              sectionId: sectionId,
              type: 'error',
              message: sectionErrorMessage,
              id: `error-${sectionId}-${Date.now()}`
            });
          }
        }
      }

      // Handle Sub-Sections Specifically (for Scenario 2.a type errors on sub-sections)
      if (sectionDef.components?.subSections) {
        sectionDef.components.subSections.forEach(subSectionDef => {
          const subSectionId = subSectionDef.id;
          const subSectionTitle = subSectionDef.title;
          const parentSectionId = sectionDef.id; // This is 'sectionId' from the outer loop
          const subSectionConfigKey = `${subSectionId.replace(/-sub$/, '')}Config`;

          if (configState[parentSectionId]?.[subSectionConfigKey]?.enabled) {
            const subHasCommandConfig = configSidebarCommands.some(cmd => cmd.sectionId === subSectionId);

            // Scenario 2.a (Error for sub-section - configured but no command)
            if (subHasCommandConfig && !generatedCommandSectionIds.has(subSectionId)) {
              commands.push({
                title: subSectionTitle,
                sectionId: subSectionId,
                type: 'error',
                message: 'No suitable command found for the current configuration.',
                id: `error-${subSectionId}-${Date.now()}`
              });
            }
          }
        });
      }
    });
    
    return commands;
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
            setDeploymentType={setDeploymentType}
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
            setSubSectionDeploymentType={setSubSectionDeploymentType}
            openFloatingTerminal={openFloatingTerminal} // Pass it down
          />
        ))}
      </div>
      
      <div className="run-button-container">
        <button 
          id="run-iso-button" 
          className={`run-iso-button ${
            isStopping ? 'stopping' : isRunning ? 'stop' : ''
          }`}
          onClick={runIsoConfiguration}
          disabled={isStopping || (!isRunning && generateCommandList(configState, globalDropdownValues).length === 0)}
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
};

export default IsoConfiguration;