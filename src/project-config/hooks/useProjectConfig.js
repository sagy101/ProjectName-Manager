import { useState, useEffect, useCallback } from 'react';
import { projectSelectorFallbacks } from '../../environment-verification/constants/selectors';
import configSidebarSections from '../config/configurationSidebarSections.json';

const configSidebarSectionsActual = configSidebarSections.sections;

export const useProjectConfig = (globalDropdownValues, showTestSections, setNotification) => {
  const [configState, setConfigState] = useState({});
  const [attachState, setAttachState] = useState({});
  const [warningState, setWarningState] = useState({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      const initialConfig = {};
      const initialAttachState = {};
      
      configSidebarSectionsActual.forEach(section => {
        initialConfig[section.id] = { enabled: false };
        if (section.components.deploymentOptions) {
          initialConfig[section.id].deploymentType = section.components.deploymentOptions[0] || 'container';
        }
        if (section.components.modeSelector) {
          initialConfig[section.id].mode = section.components.modeSelector.default || section.components.modeSelector.options[0];
        }
        if (section.components.attachToggle?.enabled || section.components.attachToggle === true) {
          initialAttachState[section.id] = false;
        }
        if (section.components.dropdownSelectors) {
          section.components.dropdownSelectors.forEach(dd => {
            initialConfig[section.id][dd.id] = dd.placeholder || '';
            initialConfig[section.id][`${dd.id}Selected`] = false;
          });
        }
        if (section.components.subSections) {
          section.components.subSections.forEach(subSection => {
            const configKey = `${subSection.id.replace(/-sub$/, '')}Config`;
            initialConfig[section.id][configKey] = { enabled: false };
            if (subSection.components.deploymentOptions) {
              const defaultType = subSection.components.deploymentOptions[0];
              initialConfig[section.id][configKey].deploymentType = defaultType;
            }
            if (subSection.components.modeSelector) {
              initialConfig[section.id][configKey].mode = subSection.components.modeSelector.default || subSection.components.modeSelector.options[0];
            }
            if (subSection.components.dropdownSelectors) {
              subSection.components.dropdownSelectors.forEach(dd => {
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

  useEffect(() => {
    if (initialized && globalDropdownValues && Object.keys(globalDropdownValues).length > 0) {
      setConfigState(prevState => {
        const newState = { ...prevState };
        let changed = false;
        
        configSidebarSectionsActual.forEach(section => {
          if (newState[section.id]) {
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

  useEffect(() => {
    const hasWarnings = Object.values(warningState).some(w => w);
    if (hasWarnings) {
      const timer = setTimeout(() => setWarningState({}), 2000);
      return () => clearTimeout(timer);
    }
  }, [warningState]);

  const toggleSectionEnabled = (sectionId, enabled) => {
    const section = configSidebarSectionsActual.find(s => s.id === sectionId);
    if (enabled && section?.components?.mainToggle?.validationRequired) {
      const validation = section.components.mainToggle.validationRequired;
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
          ...Object.keys(globalDropdownValues || {}).reduce((acc, key) => ({
            ...acc,
            [key]: prevState[sectionId]?.[key] || globalDropdownValues[key]
          }), {}),
        }
      };
      
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

  const toggleSubSectionEnabled = (sectionId, subSectionId, enabled) => {
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

  const setMode = (sectionId, mode, subSectionId = null) => {
    if (subSectionId) {
      const configKey = `${subSectionId.replace(/-sub$/, '')}Config`;
      setConfigState(prevState => ({
        ...prevState,
        [sectionId]: {
          ...prevState[sectionId],
          [configKey]: {
            ...prevState[sectionId][configKey],
            mode,
            deploymentType: mode,
          },
        },
      }));
    } else {
      setConfigState(prevState => ({
        ...prevState,
        [sectionId]: {
          ...prevState[sectionId],
          mode,
          deploymentType: mode,
        }
      }));
    }
  };

  const handleAttachToggle = (sectionId, shouldAttach) => {
    if (shouldAttach) {
      const section = configSidebarSectionsActual.find(s => s.id === sectionId);
      const attachToggle = section?.components?.attachToggle;
      const mutuallyExclusive = (typeof attachToggle === 'object' ? attachToggle.mutuallyExclusiveWith : []) || [];
      
      const attachedExclusive = Object.entries(attachState)
        .find(([id, attached]) => attached && mutuallyExclusive.includes(id));
      
      if (attachedExclusive) {
        const [otherSectionId] = attachedExclusive;
        const otherSection = configSidebarSectionsActual.find(s => s.id === otherSectionId);
        
        setWarningState(prev => ({ ...prev, [otherSectionId]: true }));
        
        setNotification({
          message: `Disabled attach on ${otherSection?.title || otherSectionId} - only one can have attach enabled at a time.`,
          type: 'warning',
          isVisible: true
        });
        
        setAttachState(prev => ({
          ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
          [sectionId]: true
        }));
      } else {
        setAttachState(prev => ({ ...prev, [sectionId]: true }));
      }
    } else {
      setAttachState(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  const setSectionDropdownValue = useCallback((sectionId, dropdownId, value) => {
    setConfigState(prevState => {
      let placeholder = 'Select...';
      const mainSectionDef = configSidebarSectionsActual.find(s => s.id === sectionId);
      let dropdownDef = mainSectionDef?.components?.dropdownSelectors?.find(dd => dd.id === dropdownId);

      if (!dropdownDef) {
        mainSectionDef?.components?.subSections?.forEach(sub => {
          const subDropdownDef = sub.components?.dropdownSelectors?.find(dd => dd.id === dropdownId);
          if (subDropdownDef) dropdownDef = subDropdownDef;
        });
      }
      if (dropdownDef?.placeholder) placeholder = dropdownDef.placeholder;

      const isSelected = value && value !== placeholder;

      return {
        ...prevState,
        [sectionId]: {
          ...prevState[sectionId],
          [dropdownId]: value,
          [`${dropdownId}Selected`]: isSelected
        }
      };
    });
  }, []);

  return {
    configState,
    attachState,
    warningState,
    initialized,
    setConfigState,
    setAttachState,
    toggleSectionEnabled,
    toggleSubSectionEnabled,
    setMode,
    handleAttachToggle,
    setSectionDropdownValue,
  };
}; 