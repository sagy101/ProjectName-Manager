import React from 'react';
import ModeSelector from './ModeSelector.jsx';

const DeploymentOptions = ({ sectionId, currentType, onChange, disabled = false }) => {
  // Adapter function to convert ModeSelector's callback to DeploymentOptions' expected format
  const handleModeChange = (_, option) => {
    if (onChange) {
      onChange(option);
    }
  };

  return (
    <ModeSelector
      sectionId={sectionId}
      options={['container', 'process']}
      currentMode={currentType}
      onModeChange={handleModeChange}
      disabled={disabled}
      className=""
      style={{ opacity: disabled ? 0.6 : 1 }}
    />
  );
};

export default DeploymentOptions; 