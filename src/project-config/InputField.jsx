import React from 'react';
import './styles/input-field.css';

const InputField = ({ sectionId, inputId, value, onChange, disabled = false, placeholder = '' }) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(sectionId, inputId, e.target.value);
    }
  };

  return (
    <div className="input-field-container">
      <input
        id={`${sectionId}-${inputId}`}
        className="input-field"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        disabled={disabled}
        data-testid={`input-${inputId}`}
      />
    </div>
  );
};

export default InputField;
