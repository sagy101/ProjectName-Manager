import React from 'react';
import ModeSelector from './ModeSelector.jsx';

const DeploymentOptions = ({ sectionId, currentType, onChange, disabled = false, options, showAppNotification }) => {
  // Adapter function to convert ModeSelector's callback to DeploymentOptions' expected format
  const handleModeChange = (_, option) => {
    if (onChange) {
      onChange(sectionId, option);
    }
  };

  // Find the first available option if the current one is TBD or not set
  const availableOptions = options.filter(opt => opt.status !== 'TBD');
  let effectiveCurrentType = currentType;
  if (!effectiveCurrentType || options.find(opt => opt.value === effectiveCurrentType)?.status === 'TBD') {
    effectiveCurrentType = availableOptions.length > 0 ? availableOptions[0].value : '';
  }

  return (
    <ModeSelector
      sectionId={sectionId}
      options={options}
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