import React, { useState, useEffect, useRef } from 'react';

// New Sub-component for list items
const DropdownListItem = ({ option, isSelected, onClick }) => {
  const itemRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (itemRef.current) {
      const checkOverflow = () => {
        if (itemRef.current) {
          setIsOverflowing(itemRef.current.scrollWidth > itemRef.current.clientWidth);
        }
      };
      checkOverflow();
      // Consider ResizeObserver if item content or parent width can change dynamically
      // For now, checking on initial render and when `option` changes should cover most cases.
    }
  }, [option]); // Re-check if the option text itself changes

  return (
    <div 
      ref={itemRef}
      className={`dropdown-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={isOverflowing ? option : ''} // Tooltip for overflowing item
    >
      {option}
    </div>
  );
};

const DropdownSelector = ({ 
  id,
  label,
  command,
  commandArgs = {},
  parseResponse,
  onChange,
  disabled = false,
  placeholder = 'Select...',
  loadingText = 'Loading...',
  errorText = 'Error loading options',
  noOptionsText = 'No options available',
  dependsOn = null,
  dependencyValue = null,
  className = '',
  style = {},
  value = null, // Add value prop for controlled component
  defaultValue: defaultValueProp = null // Add defaultValue prop
}) => {
  const [options, setOptions] = useState([]);
  const [selectedValue, setSelectedValue] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const displayValueRef = useRef(null); // Ref for the display value span
  const [isDisplayValueOverflowing, setIsDisplayValueOverflowing] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // State for search term

  // Update selected value when value prop changes
  useEffect(() => {
    if (value !== null && value !== selectedValue) {
      setSelectedValue(value);
    }
  }, [value]);

  // Ref to store the latest onChange callback
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch options from backend
  const fetchOptions = async (forceRefresh = false) => {
    if (dependsOn && !dependencyValue) {
      setOptions([]);
      // Do not reset selectedValue if it's controlled
      if (value === null) {
        setSelectedValue('');
      }
      setError(null);
      return;
    }

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (window.electron && window.electron.getDropdownOptions) {
        const args = { ...commandArgs };
        if (dependsOn && dependencyValue) {
          args[dependsOn] = dependencyValue;
        }

        const result = await window.electron.getDropdownOptions({
          id,
          command,
          args,
          parseResponse,
          forceRefresh // Pass the forceRefresh flag to bypass cache
        });

        if (result.error) {
          setError(result.error);
          // Don't clear existing options on refresh error to maintain UX
          if (!forceRefresh) {
            setOptions([]);
            if (value === null) {
              setSelectedValue('');
            }
          }
        } else {
          const newOptions = result.options || [];
          setOptions(newOptions);

          // Handle default value selection
          if (newOptions.length > 0 && value === null) {
            let optionToSelect = null;
            if (defaultValueProp) {
              if (defaultValueProp.exact) {
                optionToSelect = newOptions.find(opt => opt === defaultValueProp.exact);
              }
              if (!optionToSelect && defaultValueProp.contains) {
                optionToSelect = newOptions.find(opt => typeof opt === 'string' && opt.includes(defaultValueProp.contains));
              }
            }
            
            // Auto-select first option if no default is matched and no value is selected
            if (!optionToSelect && !selectedValue) {
              optionToSelect = newOptions[0];
            }

            if (optionToSelect) {
              setSelectedValue(optionToSelect);
              if (onChangeRef.current) {
                onChangeRef.current(optionToSelect);
              }
            }
          }
        }
      } else {
        setError('Backend API not available');
        if (!forceRefresh) {
          setOptions([]);
        }
      }
    } catch (err) {
      setError(err.toString());
      if (!forceRefresh) {
        setOptions([]);
      }
    } finally {
      if (forceRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    if (isRefreshing || loading) return;
    
    // Clear search term to show all refreshed options
    setSearchTerm('');
    
    // Fetch fresh options
    fetchOptions(true);
  };

  // Fetch options when component mounts or dependency changes
  useEffect(() => {
    fetchOptions();
  }, [dependencyValue, command]); // Re-fetch if the specific dependencyValue or command changes

  // Handle dropdown toggle
  const toggleDropdown = () => {
    if (disabled || loading) return;
    // Allow opening even if there's an error or no options initially
    setIsOpen(prevIsOpen => !prevIsOpen);
  };

  // Handle option selection
  const selectOption = (option) => {
    setSelectedValue(option);
    if (onChangeRef.current) {
      onChangeRef.current(option);
    }
    setIsOpen(false);
  };

  // Determine display value
  let displayValue = placeholder;
  if (loading) {
    displayValue = loadingText;
  } else if (dependsOn && !dependencyValue) {
    displayValue = `Select ${dependsOn} first`;
  } else if (selectedValue) {
    displayValue = selectedValue;
  } else if (error) {
    displayValue = errorText;
  } else if (options.length === 0) {
    displayValue = noOptionsText;
  }

  // Only disable if explicitly disabled or loading or has dependency that's not satisfied
  const isDisabledForClick = disabled || loading || (dependsOn && !dependencyValue);
  
  // For styling, consider if it should also be disabled when there are no options or an error
  const isDisabledForStyle = isDisabledForClick || error || (!loading && options.length === 0 && !selectedValue);

  // Check for display value overflow
  useEffect(() => {
    if (displayValueRef.current) {
      const checkOverflow = () => {
        if (displayValueRef.current) {
          setIsDisplayValueOverflowing(displayValueRef.current.scrollWidth > displayValueRef.current.clientWidth);
        }
      };
      checkOverflow();
      // Optionally, re-check on resize if the component or its parent can resize
      // This might require a ResizeObserver for robustness if complex layouts are involved
    }
  }, [displayValue, isOpen]); // Re-check when displayValue changes or dropdown opens/closes (affecting layout)

  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    typeof option === 'string' && option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`dropdown-selector ${className}`} style={style} ref={dropdownRef}>
      {label && <label className="dropdown-label">{label}</label>}
      <div 
        className={`selected-value ${isDisabledForStyle ? 'disabled' : ''}`}
        onClick={!isDisabledForClick ? toggleDropdown : undefined}
      >
        <span 
          ref={displayValueRef} 
          title={isDisplayValueOverflowing ? selectedValue : ''}
        >
          {displayValue}
        </span>
        <span className="dropdown-arrow">▼</span>
      </div>
      
      {isOpen && !isDisabledForClick && (
        <div className="dropdown-menu">
          <div className="dropdown-search-container">
            <button 
              className={`dropdown-refresh-button${isRefreshing ? ' loading' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              title="Refresh options"
              aria-label="Refresh dropdown options"
            >
              <span className={`refresh-icon${isRefreshing ? ' spinning' : ''}`}>↻</span>
            </button>
            <input 
              type="text"
              className="dropdown-search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
            />
          </div>
          <div className="dropdown-item-list"> {/* Wrapper for scrollable items */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <DropdownListItem
                  key={`${option}-${index}`}
                  option={option}
                  isSelected={option === selectedValue}
                  onClick={() => selectOption(option)}
                />
              ))
            ) : (
              <div className="dropdown-item disabled">
                {error ? errorText : (searchTerm ? 'No matching options' : noOptionsText)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownSelector; 