import React, { useEffect } from 'react';
import ModeSelector from './ModeSelector.jsx';

const DeploymentOptions = ({ sectionId, currentType, onChange, disabled = false, options, showAppNotification }) => {
  // Ensure options is an array with default values if not provided
  const optionsArray = Array.isArray(options) 
    ? options 
    : [{ value: 'container' }, { value: 'process' }];

  // Adapter function to convert ModeSelector's callback to DeploymentOptions' expected format
  const handleModeChange = (_, option) => {
    if (onChange) {
      onChange(sectionId, option);
    }
  };

  // Find the first available option if the current one is TBD or not set
  const availableOptions = optionsArray.filter(opt => opt.status !== 'TBD');
  let effectiveCurrentType = currentType;
  if (!effectiveCurrentType || optionsArray.find(opt => opt.value === effectiveCurrentType)?.status === 'TBD') {
    effectiveCurrentType = availableOptions.length > 0 ? availableOptions[0].value : '';
  }

  // Update the state if the effective current type differs from the actual current type
  useEffect(() => {
    if (effectiveCurrentType && effectiveCurrentType !== currentType && onChange) {
      onChange(sectionId, effectiveCurrentType);
    }
  }, [effectiveCurrentType, currentType, sectionId, onChange]);

  return (
    <ModeSelector
      sectionId={sectionId}
      options={optionsArray}
      currentMode={effectiveCurrentType}
      onModeChange={handleModeChange}
      disabled={disabled}
      showAppNotification={showAppNotification}
      className=""
      style={{ opacity: disabled ? 0.6 : 1 }}
    />
  );
};

export default DeploymentOptions; 