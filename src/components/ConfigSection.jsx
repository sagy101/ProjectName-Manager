import React, { useState, useRef, useEffect } from 'react';
import Toggle from './Toggle';
import AttachToggle from './AttachToggle';
import DeploymentOptions from './DeploymentOptions';
import DropdownSelector from './DropdownSelector';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { STATUS } from '../constants/verificationConstants';
import VerificationIndicator from './VerificationIndicator';
import GitBranchSwitcher from './GitBranchSwitcher';
import configSidebarAbout from '../configurationSidebarAbout.json';
import configSidebarCommands from '../configurationSidebarCommands.json'; // Import commands
import '../styles/config-section.css';

const ConfigSection = ({ 
  section, 
  config, 
  toggleEnabled, 
  setDeploymentType, 
  setMode,
  setSectionDropdownValue,
  globalDropdownValues,
  isAttached,
  onAttachToggle,
  isAttachWarning,
  isLocked,
  sectionPathStatus,
  sectionGitBranch,
  onTriggerRefresh,
  attachState,
  configState,
  toggleSubSectionEnabled,
  setSubSectionDeploymentType,
  onDropdownChange,
  openFloatingTerminal // Accept prop
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const verificationPopoverRef = useRef(null);
  const infoBtnRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({});
  const [dropdownValues, setDropdownValues] = useState({});

  // Helper function to determine component visibility based on config state
  const isComponentVisible = (visibleWhenRule, baseConfig) => {
    if (!visibleWhenRule || !baseConfig) {
      return true; // Default to visible if no rule or no config to check against
    }
    const { configKey, hasValue } = visibleWhenRule;
    if (!configKey || hasValue === undefined) {
      console.warn('Invalid visibleWhen rule:', visibleWhenRule);
      return true; // Invalid rule, default to visible
    }

    // Resolve the configKey. It might be a simple key or a dot-separated path.
    let actualValue;
    if (configKey.includes('.')) {
      actualValue = configKey.split('.').reduce((obj, part) => obj?.[part], baseConfig);
    } else {
      actualValue = baseConfig[configKey];
    }
    
    // console.log(`Visibility check: key=${configKey}, expected=${hasValue}, actual=${actualValue}, visible=${actualValue === hasValue}`);
    return actualValue === hasValue;
  };

  const handleDropdownChange = (dropdownId, value) => {
    setDropdownValues(prev => ({ ...prev, [dropdownId]: value }));
    
    // Notify parent component
    if (onDropdownChange) {
      onDropdownChange(section.id, dropdownId, value);
    }
    
    // Use the generic dropdown value setter
    if (setSectionDropdownValue) {
      setSectionDropdownValue(section.id, dropdownId, value);
    }
  };

  const getSectionVerificationDetails = (id) => {
    const sectionAbout = configSidebarAbout.find(item => item.sectionId === id);
    if (sectionAbout && sectionAbout.verifications && sectionAbout.verifications.length > 0) {
      return sectionAbout.verifications;
    }
    return [];
  };

  const verificationDetails = getSectionVerificationDetails(section.id);

  // Get verification status for a specific verification ID
  const getVerificationStatus = (verificationId) => {
    if (!sectionPathStatus || typeof sectionPathStatus === 'string') {
      // If sectionPathStatus is a simple string status, return it for backward compatibility
      return sectionPathStatus || STATUS.WAITING;
    }
    // If sectionPathStatus is an object with multiple verification statuses
    const cacheKey = section.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    return sectionPathStatus[verificationId] || STATUS.WAITING;
  };

  let borderClass = '';
  if (verificationDetails.length > 0) {
    // Determine border class based on all verifications
    const allStatuses = verificationDetails.map(v => getVerificationStatus(v.id));
    if (allStatuses.includes(STATUS.INVALID)) {
      borderClass = 'border-invalid';
    } else if (allStatuses.every(s => s === STATUS.VALID)) {
        borderClass = 'border-valid';
    } else {
        borderClass = 'border-waiting';
    }
  }

  const getSectionDirectoryPath = (id) => {
    const sectionAbout = configSidebarAbout.find(item => item.sectionId === id);
    return sectionAbout?.directoryPath || id;
  };

  const getSectionDescription = (id) => {
    const sectionAbout = configSidebarAbout.find(item => item.sectionId === id);
    return sectionAbout?.description || 'No description available for this section.';
  };
  
  const sectionDescription = getSectionDescription(section.id);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isDrawerOpen) return;
    function handleClickOutside(event) {
      if (
        verificationPopoverRef.current &&
        !verificationPopoverRef.current.contains(event.target) &&
        event.target.getAttribute('data-verification-btn') !== 'true'
      ) {
        setIsDrawerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDrawerOpen]);

  // Position the popover
  useEffect(() => {
    if (isDrawerOpen && infoBtnRef.current) {
      const rect = infoBtnRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: 'fixed',
        left: rect.right + 8,
        top: rect.top + 4,
        zIndex: 1000
      });
    }
  }, [isDrawerOpen]);

  // Check if logs button should be disabled
  const isLogsDisabled = () => {
    if (!config.enabled || isLocked) return true;
    
    // Check if any sub-sections are enabled
    if (section.components.subSections) {
      const anySubSectionEnabled = section.components.subSections.some(subSection => {
        const configKey = `${subSection.id.replace(/-sub$/, '')}Config`;
        return config[configKey]?.enabled;
      });
      return !anySubSectionEnabled;
    }
    
    return false;
  };

  return (
    <div className={`config-section ${borderClass} ${!config.enabled ? 'collapsed' : ''}`} id={`section-${section.id}`}>
      <div className="section-header compact">
        <div className="section-header-left">
          <button
            className={`drawer-toggle verification-info-btn${isDrawerOpen ? ' open' : ''}`}
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            title="Show verification details"
            data-verification-btn="true"
            ref={infoBtnRef}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <InformationCircleIcon style={{ width: 20, height: 20 }} />
          </button>
          <h2>{section.title}</h2>
        </div>
        <div className="section-controls compact">
          {(section.components.attachToggle?.enabled || section.components.attachToggle === true) && (
            <AttachToggle
              id={`attach-${section.id}`}
              isAttached={isAttached}
              onToggle={onAttachToggle}
              isWarning={isAttachWarning}
              disabled={!config.enabled || isLocked}
            />
          )}
          <Toggle
            id={`toggle-${section.id}`}
            checked={config.enabled || false}
            onChange={(checked) => toggleEnabled(section.id, checked)}
            hideLabel={true}
            disabled={isLocked}
          />
        </div>
      </div>

      {/* Floating Verification Popover */}
      {isDrawerOpen && (
        <div
          className="config-section-verification-popover"
          ref={verificationPopoverRef}
          style={popoverStyle}
        >
          <div className="section-description-tooltip">{sectionDescription}</div>
          <div className="section-verification-indicators">
            {verificationDetails.length > 0 ? (
              verificationDetails.map(verification => (
              <VerificationIndicator
                  key={verification.id}
                  label={verification.title}
                  status={getVerificationStatus(verification.id)}
              />
              ))
            ) : (
              <p className="no-verification-info">No specific path verification for this section.</p>
            )}
          </div>
        </div>
      )}

      {/* Only render the rest if enabled */}
      {config.enabled && (
        <>
          {/* Git Branch Info */}
          {(section.components.gitBranch || section.components.gitBranchSwitcher) && sectionGitBranch !== 'N/A' && (
            <div className="git-branch-info-header">
              <GitBranchSwitcher 
                projectPath={getSectionDirectoryPath(section.id)}
                currentBranch={sectionGitBranch}
                onBranchChangeSuccess={onTriggerRefresh}
                disabled={isLocked || !config.enabled} 
              />
            </div>
          )}

          {/* Dropdown Selectors */}
          {section.components.dropdownSelectors && config.enabled && (
            <div className="dropdown-selectors-container" style={{ padding: '8px 12px' }}>
              {section.components.dropdownSelectors
                .filter(ddConfig => isComponentVisible(ddConfig.visibleWhen, config))
                .map((dropdownConfig) => {
                  const dependencyValue = dropdownConfig.dependsOn 
                    ? (globalDropdownValues?.[dropdownConfig.dependsOn] || dropdownValues[dropdownConfig.dependsOn])
                    : null;

                  return (
                    <DropdownSelector
                      key={dropdownConfig.id}
                      {...dropdownConfig}
                      onChange={(value) => handleDropdownChange(dropdownConfig.id, value)}
                      disabled={isLocked || !config.enabled}
                      dependencyValue={dependencyValue}
                      className="section-dropdown-selector"
                      defaultValue={dropdownConfig.defaultValue} // Pass defaultValue for main section dropdowns
                    />
                  );
                })}
            </div>
          )}

          <div className="section-content compact">
            {/* Mode selector */}
            {section.components.modeSelector && config.mode && isAttached && (
              <div className="mode-selector-container" style={{ padding: '8px 12px' }}>
                <label className="mode-selector-label">Mode:</label>
                <div className="deployment-toggle-container compact">
                  {section.components.modeSelector.options.map(option => (
                    <button
                      key={option}
                      className={`deployment-toggle-btn ${config.mode === option ? 'active' : ''}`}
                      onClick={() => !isLocked && setMode(section.id, option)}
                      disabled={isLocked || !config.enabled}
                      aria-pressed={config.mode === option}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Deployment options */}
            {section.components.deploymentOptions && !section.components.modeSelector && (
              <DeploymentOptions 
                sectionId={section.id}
                currentType={config.deploymentType}
                onChange={(type) => setDeploymentType(section.id, type)}
                disabled={!config.enabled || isLocked}
              />
            )}
            
            {/* Sub-sections */}
            {section.components.subSections && config.enabled && (
              <div className="sub-sections-container compact">
                {section.components.subSections.map(subSection => {
                  const configKey = `${subSection.id.replace(/-sub$/, '')}Config`;
                  const subConfig = config[configKey] || {};
                  
                  return (
                    <div key={subSection.id} className={`config-sub-section ${subSection.id} compact`}>
                      <div className="sub-section-header compact">
                        <h4>{subSection.title}</h4>
                        <Toggle
                          id={`toggle-${section.id}-${subSection.id}`}
                          checked={subConfig.enabled || false}
                          onChange={(checked) => toggleSubSectionEnabled(section.id, subSection.id, checked)}
                          hideLabel={true}
                          disabled={isLocked || !config.enabled} 
                        />
                      </div>
                      {/* Sub-section content: deployment options and dropdowns */}
                      {(subConfig.enabled && (subSection.components.deploymentOptions || subSection.components.dropdownSelectors)) && (
                        <div className="sub-section-content compact">
                          {/* Deployment options */}
                          {subSection.components.deploymentOptions && (
                            <div className={`deployment-toggle-container compact ${subSection.components.deploymentOptions.length === 3 ? 'mode-selector-container' : ''}`}>
                              {subSection.components.deploymentOptions.map((option, index) => {
                                const label = subSection.components.labels?.[index] || 
                                             option.charAt(0).toUpperCase() + option.slice(1);
                                return (
                                  <button
                                    key={option}
                                    className={`deployment-toggle-btn ${subConfig.deploymentType === option ? 'active' : ''}`}
                                    onClick={() => !isLocked && setSubSectionDeploymentType(section.id, subSection.id, option)}
                                    disabled={isLocked || !config.enabled}
                                    aria-pressed={subConfig.deploymentType === option}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {/* Dropdown Selectors for Sub-section */}
                          {subSection.components.dropdownSelectors && (
                            <div className="sub-section-dropdown-selectors">
                              {subSection.components.dropdownSelectors
                                .filter(ddConfig => isComponentVisible(ddConfig.visibleWhen, subConfig))
                                .map((dropdownConfig) => {
                                  const dependencyValue = dropdownConfig.dependsOn 
                                    ? (globalDropdownValues?.[dropdownConfig.dependsOn] || config[dropdownConfig.dependsOn]) 
                                    : null;
                                  return (
                                    <DropdownSelector
                                      key={dropdownConfig.id}
                                      {...dropdownConfig}
                                      onChange={(value) => handleDropdownChange(dropdownConfig.id, value)}
                                      disabled={isLocked || !config.enabled || !subConfig.enabled}
                                      dependencyValue={dependencyValue}
                                      className="section-dropdown-selector"
                                      defaultValue={dropdownConfig.defaultValue} // Pass defaultValue for sub-section dropdowns
                                    />
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Custom button */}
            {section.components.customButton && config.enabled && (
              <button
                className="custom-button compact" // You might want to add specific styling for this class
                onClick={() => {
                  if (!openFloatingTerminal) {
                    console.error('openFloatingTerminal function not provided to ConfigSection');
                    return;
                  }
                  const buttonConfig = section.components.customButton;
                  const commandId = buttonConfig.commandId;
                  const commandDef = configSidebarCommands.find(cmd => cmd.sectionId === commandId);

                  if (commandDef && commandDef.command) {
                    // Use commandId from buttonConfig as the first argument,
                    // commandDef.command.tabTitle as title,
                    // and commandDef.command.base as command.
                    openFloatingTerminal(commandId, commandDef.command.tabTitle, commandDef.command.base);
                  } else {
                    console.warn(`Command not found for commandId: ${commandId} in section: ${section.id}`);
                    // Optionally, show a user-facing error or notification here
                  }
                }}
                disabled={isLocked || !config.enabled} // Basic disable logic, can be expanded
                title={section.components.customButton.label} // Use label for tooltip
              >
                <span className="custom-button-label">{section.components.customButton.label}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ConfigSection; 
