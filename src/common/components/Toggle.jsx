import React from 'react';

const Toggle = ({ 
  id, 
  label, 
  checked, 
  onChange, 
  containerClass = 'toggle-container', 
  disabled = false,
  hideLabel = false
}) => {
  return (
    <div className={containerClass} style={{ opacity: disabled ? 0.6 : 1 }}>
      {!hideLabel && <label htmlFor={id}>{label}</label>}
      <input 
        type="checkbox" 
        id={id} 
        className="toggle"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </div>
  );
};

export default Toggle; 