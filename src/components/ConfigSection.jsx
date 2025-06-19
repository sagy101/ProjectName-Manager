import React, { useState, useRef, useEffect } from 'react';
import Toggle from './Toggle';
import AttachToggle from './AttachToggle';
import DeploymentOptions from './DeploymentOptions';
import DropdownSelector from './DropdownSelector';
import ModeSelector from './ModeSelector';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { STATUS } from '../constants/verificationConstants';
import VerificationIndicator from './VerificationIndicator';
import GitBranchSwitcher from './GitBranchSwitcher';
const configSidebarAbout = require(
  process.env.CONFIG_SIDEBAR_ABOUT || '../configurationSidebarAbout.json'
);
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
  openFloatingTerminal,
  configSidebarCommands,
  onBranchChangeError,
  showAppNotification,
  onFixCommand
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const verificationPopoverRef = useRef(null);
  const infoBtnRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({});
  const [dropdownValues, setDropdownValues] = useState({});

  let buttonsToRender = [];
  if (section.components.customButtons) {
    buttonsToRender = section.components.customButtons;
  } else if (section.components.customButton) {
    buttonsToRender = [section.components.customButton];
  }

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
    
    // debugLog(`Visibility check: key=${configKey}, expected=${hasValue}, actual=${actualValue}, visible=${actualValue === hasValue}`);
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
      {debugLog(`Rendering section: ${section.id}`, { config, isAttached })}
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
          <h2 data-testid={`section-title-${section.id}`}>{section.title}</h2>
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
                  verification={verification}
                  onFixCommand={onFixCommand}
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
        <div className="section-content compact">
          {/* Git Branch Info */}
          {(section.components.gitBranch || section.components.gitBranchSwitcher) && sectionGitBranch !== 'N/A' && (
            <div className="git-branch-info-header">
              <GitBranchSwitcher
                projectPath={getSectionDirectoryPath(section.id)}
                currentBranch={sectionGitBranch}
                onBranchChangeSuccess={onTriggerRefresh}
                onBranchChangeError={onBranchChangeError}
                disabled={isLocked || !config.enabled}
              />
            </div>
          )}

          {/* Dropdown Selectors for main section */}
          {section.components.dropdownSelectors && (
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
                      defaultValue={dropdownConfig.defaultValue}
                    />
                  );
                })}
            </div>
          )}

          {/* Deployment options for main section */}
          {section.components.deploymentOptions && (
            <DeploymentOptions
              sectionId={section.id}
              currentType={config.mode}
              onChange={(id, type) => setMode(id, type)}
              disabled={isLocked}
              options={
                Array.isArray(section.components.deploymentOptions) 
                  ? section.components.deploymentOptions 
                  : [{ value: 'container' }, { value: 'process' }]
              }
              showAppNotification={showAppNotification}
            />
          )}

          {/* Mode selector for main section */}
          {section.components.modeSelector && (!section.components.attachToggle?.enabled || isAttached) && (
            <ModeSelector
              sectionId={section.id}
              options={section.components.modeSelector.options}
              labels={section.components.modeSelector.labels}
              currentMode={config.mode}
              onModeChange={(id, mode) => setMode(id, mode)}
              disabled={isLocked}
              showAppNotification={showAppNotification}
            />
          )}

          {/* Custom buttons */}
          {buttonsToRender.length > 0 && (
            <div className="custom-buttons-container">
              {buttonsToRender.map(button => {
                const commandDef = configSidebarCommands.find(c => c.id === button.commandId);
                const commandToRun = commandDef ? (commandDef.command.base || commandDef.command) : `echo "Command not found: ${button.commandId}"`;
                
                const isDisabled = isLocked || !config.enabled || (button.id === 'viewLogs' && isLogsDisabled());

                return (
                  <button
                    key={button.id}
                    className="custom-button"
                    onClick={() => {
                        if(openFloatingTerminal) {
                            openFloatingTerminal(button.commandId, button.label, commandToRun)
                        }
                    }}
                    disabled={isDisabled}
                  >
                    {button.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sub-sections */}
          {section.components.subSections && (
            <div className="sub-sections-container compact">
              {section.components.subSections.map(subSection => {
                const subSectionConfigKey = `${subSection.id.replace(/-sub$/, '')}Config`;
                const subSectionConfig = config[subSectionConfigKey] || {};
                return (
                  <div key={subSection.id} className="config-sub-section compact">
                    <div className="sub-section-header compact">
                      <h4>{subSection.title}</h4>
                      <Toggle
                        id={`toggle-${section.id}-${subSection.id}`}
                        checked={subSectionConfig.enabled || false}
                        onChange={(checked) => toggleSubSectionEnabled(section.id, subSection.id, checked)}
                        hideLabel={true}
                        disabled={isLocked || !config.enabled}
                      />
                    </div>
                    {subSectionConfig.enabled && subSection.components && (
                      <div className="section-content compact">
                        {subSection.components.modeSelector && (
                          <div className="mode-selector-wrapper">
                            <ModeSelector
                              sectionId={subSection.id}
                              options={subSection.components.modeSelector.options}
                              labels={subSection.components.modeSelector.labels}
                              currentMode={subSectionConfig.mode}
                              onModeChange={(id, mode) => setMode(section.id, mode, subSection.id)}
                              disabled={isLocked || !subSectionConfig.enabled}
                              showAppNotification={showAppNotification}
                            />
                          </div>
                        )}
                        {subSection.components.dropdownSelectors && (
                          <div className="dropdown-selectors-container" style={{ padding: '0 0 8px 0' }}>
                            {subSection.components.dropdownSelectors
                              .filter(ddConfig => isComponentVisible(ddConfig.visibleWhen, subSectionConfig))
                              .map(dropdownConfig => {
                                const dependencyValue = dropdownConfig.dependsOn
                                  ? (globalDropdownValues?.[dropdownConfig.dependsOn] || dropdownValues[dropdownConfig.dependsOn])
                                  : null;
                                return (
                                  <DropdownSelector
                                    key={dropdownConfig.id}
                                    {...dropdownConfig}
                                    onChange={(value) => handleDropdownChange(dropdownConfig.id, value)}
                                    disabled={isLocked}
                                    dependencyValue={dependencyValue}
                                    className="section-dropdown-selector"
                                    defaultValue={dropdownConfig.defaultValue}
                                  />
                                );
                              })}
                          </div>
                        )}

                        {subSection.components.customButtons && subSection.components.customButtons.length > 0 && (
                          <div className="custom-buttons-container">
                            {subSection.components.customButtons.map(button => {
                              const commandDef = configSidebarCommands.find(c => c.id === button.commandId);
                              const commandToRun = commandDef ? (commandDef.command.base || commandDef.command) : `echo "Command not found: ${button.commandId}"`;
                              const isDisabled = isLocked || !config.enabled || !subSectionConfig.enabled;
                              return (
                                <button
                                  key={button.id}
                                  className="custom-button"
                                  onClick={() => {
                                    if (openFloatingTerminal) {
                                      openFloatingTerminal(button.commandId, button.label, commandToRun);
                                    }
                                  }}
                                  disabled={isDisabled}
                                >
                                  {button.label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {subSection.components.customButton && !subSection.components.customButtons && (
                          <div className="custom-buttons-container">
                            {(() => {
                              const button = subSection.components.customButton;
                              const commandDef = configSidebarCommands.find(c => c.id === button.commandId);
                              const commandToRun = commandDef ? (commandDef.command.base || commandDef.command) : `echo "Command not found: ${button.commandId}"`;
                              const isDisabled = isLocked || !config.enabled || !subSectionConfig.enabled;
                              return (
                                <button
                                  key={button.id}
                                  className="custom-button"
                                  onClick={() => {
                                    if (openFloatingTerminal) {
                                      openFloatingTerminal(button.commandId, button.label, commandToRun);
                                    }
                                  }}
                                  disabled={isDisabled}
                                >
                                  {button.label}
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfigSection;