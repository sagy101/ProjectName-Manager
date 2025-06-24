import React, { useState, useEffect } from 'react';
import DropdownSelector from '../common/components/DropdownSelector';
import { projectSelectorFallbacks } from './constants/selectors';
import { STATUS } from './constants/verificationConstants';
import VerificationIndicator from './VerificationIndicator';
import './environment-verification.css';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { loggers } from '../common/utils/debugUtils.js';

const log = loggers.verification;

// Section component for grouping related indicators
const VerificationSection = ({ title, children }) => {
  return (
    <div className="verification-section">
      <h3>{title}</h3>
      <div className="verification-section-content">
        {children}
      </div>
    </div>
  );
};

const EnvironmentVerification = ({ 
  statusMap,
  verificationConfig,
  headerConfig,
  globalDropdownValues,
  onGlobalDropdownChange,
  onInitiateRefresh,
  onFixCommand,  // New prop for fix command handler
  showTestSections = false  // New prop for test sections visibility
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh of verification
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Call the initiator immediately when refresh starts
      if (onInitiateRefresh) {
        onInitiateRefresh();
      }
      const results = await window.electron.refreshEnvironmentVerification();
      log.debug('Refreshed environment verification results:', results);
    } catch (error) {
      log.error('Error refreshing environment verification:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle dropdown value changes
  const handleDropdownChange = (dropdownId, value) => {
    if (onGlobalDropdownChange) {
      onGlobalDropdownChange(dropdownId, value);
    }
  };
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Calculate overall status based on all section statuses
  const calculateOverallStatus = () => {
    // Ensure verificationConfig is available and is an array before using flatMap
    if (!Array.isArray(verificationConfig) || verificationConfig.length === 0) {
      return STATUS.WAITING; // Or some other appropriate default/loading status
    }
    const requiredStatuses = verificationConfig.flatMap(item => 
      item.category.verifications
        .filter(v => showTestSections || !v.testVerification)  // Filter out test verifications
        .map(v => statusMap[v.id] || STATUS.WAITING)
    );
    
    // Add dropdown selector statuses if they have validation
    if (headerConfig?.dropdownSelectors) {
      headerConfig.dropdownSelectors.forEach(dropdown => {
        const value = globalDropdownValues?.[dropdown.id];
        // Generic validation for any dropdown with fallback values
        if (dropdown.fallbackValues && projectSelectorFallbacks.includes(value)) {
          requiredStatuses.push(STATUS.WAITING);
        } else if (value) {
          requiredStatuses.push(STATUS.VALID);
        } else {
          requiredStatuses.push(STATUS.WAITING);
        }
      });
    }

    if (requiredStatuses.includes(STATUS.INVALID)) return STATUS.INVALID;
    if (requiredStatuses.includes(STATUS.WAITING) || requiredStatuses.includes(undefined)) return STATUS.WAITING;
    if (requiredStatuses.every(s => s === STATUS.VALID)) return STATUS.VALID;
    return 'mixed'; 
  };

  const overallStatus = calculateOverallStatus();
  const title = headerConfig?.title || 'General Environment';

  // Conditional rendering: if verificationConfig is not yet loaded or is empty, show a loading state or nothing
  if (!Array.isArray(verificationConfig) || verificationConfig.length === 0) {
    // Optionally, render a loading spinner or a placeholder message
    return (
      <div className="environment-verification-container">
        <div className={`verification-header ${STATUS.WAITING}`}>
          <div className="header-left">
            <h2>{title}</h2>
          </div>
          <div className="header-right">
            <span className="toggle-icon">▶</span>
          </div>
        </div>
        {/* You could add a loading indicator here if desired */}
      </div>
    );
  }

  return (
    <div className="environment-verification-container" data-testid="environment-verification-container">
      <div className={`verification-header ${overallStatus}`}>
        <div className="header-left" onClick={toggleExpanded}>
          <h2>{title}</h2>
        </div>
        <div className="header-right environment-header">
          {/* Render dropdown selectors from header config */}
          {headerConfig?.dropdownSelectors?.map((dropdownConfig, index) => {
            const value = globalDropdownValues?.[dropdownConfig.id];
            
            // Generic status calculation for any dropdown
            let dropdownStatus = STATUS.WAITING;
            if (dropdownConfig.fallbackValues && projectSelectorFallbacks.includes(value)) {
              dropdownStatus = STATUS.WAITING;
            } else if (value) {
              dropdownStatus = STATUS.VALID;
            }

            return (
              <div key={dropdownConfig.id} style={{ position: 'relative', zIndex: 100 - index }}>
                <VerificationIndicator status={dropdownStatus}>
                  <DropdownSelector
                    {...dropdownConfig}
                    value={value}
                    onChange={(value) => handleDropdownChange(dropdownConfig.id, value)}
                    dependencyValue={dropdownConfig.dependsOn ? globalDropdownValues?.[dropdownConfig.dependsOn] : null}
                    defaultValue={dropdownConfig.defaultValue} // Pass defaultValue from config
                  />
                </VerificationIndicator>
              </div>
            );
          })}
          
          <button 
            className={`refresh-button ${isRefreshing ? 'refreshing' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            title="Refresh environment verification"
            disabled={isRefreshing}
          >
            <ArrowPathIcon style={{ width: '18px', height: '18px' }} />
          </button>
          <span className="toggle-icon" onClick={toggleExpanded}>{expanded ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {expanded && (
        <div className="verification-content">
          <div className="verification-grid">
            {verificationConfig.map(item => (
              <VerificationSection key={item.category.title} title={item.category.title}>
                <div>
                  {item.category.verifications
                    .filter(verification => showTestSections || !verification.testVerification)  // Filter out test verifications
                    .map(verification => (
                      <VerificationIndicator 
                        key={verification.id} 
                        label={verification.title} 
                        status={statusMap[verification.id] || STATUS.WAITING}
                        verification={verification}
                        onFixCommand={onFixCommand}
                      />
                    ))}
                </div>
              </VerificationSection>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentVerification; 