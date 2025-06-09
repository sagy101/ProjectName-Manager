import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfigSection from '../src/components/ConfigSection.jsx';

// Mock all the imported components
jest.mock('../src/components/Toggle', () => ({ id, checked, onChange, hideLabel, disabled }) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
    disabled={disabled}
    data-testid={`toggle-${id}`}
  />
));

jest.mock('../src/components/AttachToggle', () => ({ id, isAttached, onToggle, isWarning, disabled }) => (
  <button
    id={id}
    onClick={() => onToggle(!isAttached)}
    disabled={disabled}
    data-testid={`attach-toggle-${id}`}
    className={isWarning ? 'warning' : ''}
  >
    {isAttached ? 'Attached' : 'Detached'}
  </button>
));

jest.mock('../src/components/DeploymentOptions', () => ({ sectionId, currentType, onChange, disabled }) => (
  <div data-testid={`deployment-options-${sectionId}`}>
    <button
      onClick={() => onChange('container')}
      className={currentType === 'container' ? 'active' : ''}
      disabled={disabled}
    >
      Container
    </button>
    <button
      onClick={() => onChange('process')}
      className={currentType === 'process' ? 'active' : ''}
      disabled={disabled}
    >
      Process
    </button>
  </div>
));

jest.mock('../src/components/ModeSelector', () => ({ sectionId, options, currentMode, onModeChange, disabled }) => (
  <div data-testid={`mode-selector-${sectionId}`}>
    {options.map(option => (
      <button
        key={option}
        onClick={() => !disabled && onModeChange(sectionId, option)}
        className={currentMode === option ? 'active' : ''}
        disabled={disabled}
      >
        {option.charAt(0).toUpperCase() + option.slice(1)}
      </button>
    ))}
  </div>
));

jest.mock('../src/components/DropdownSelector', () => ({ id, onChange, disabled, placeholder, dependencyValue }) => (
  <select
    data-testid={`dropdown-${id}`}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
  >
    <option value="">{placeholder}</option>
    <option value="option1">Option 1</option>
    <option value="option2">Option 2</option>
  </select>
));

jest.mock('../src/components/VerificationIndicator', () => ({ label, status }) => (
  <div data-testid={`verification-${label}`} data-status={status}>
    {label}: {status}
  </div>
));

jest.mock('../src/components/GitBranchSwitcher', () => ({ currentBranch, onBranchChangeSuccess, disabled }) => (
  <div data-testid="git-branch-switcher" data-disabled={disabled}>
    Branch: {currentBranch}
  </div>
));

// Mock the JSON imports
jest.mock('../src/configurationSidebarAbout.json', () => [
  {
    sectionId: 'testSection',
    directoryPath: './test-section',
    description: 'Test section description',
    verifications: [
      {
        id: 'testVerification',
        title: 'Test Verification',
        checkType: 'pathExists',
        pathValue: './test-path',
        pathType: 'directory'
      }
    ]
  }
]);

jest.mock('../src/configurationSidebarCommands.json', () => [
  {
    sectionId: 'testAnalyticsLogCommand',
    command: {
      base: 'tail -f logs/test.log',
      tabTitle: 'Test Analytics Logs'
    }
  }
]);

describe('ConfigSection', () => {
  const defaultProps = {
    section: {
      id: 'testSection',
      title: 'Test Section',
      components: {
        toggle: true,
        infoButton: true
      }
    },
    config: { enabled: false },
    toggleEnabled: jest.fn(),
    setDeploymentType: jest.fn(),
    setMode: jest.fn(),
    setSectionDropdownValue: jest.fn(),
    globalDropdownValues: {},
    isAttached: false,
    onAttachToggle: jest.fn(),
    isAttachWarning: false,
    isLocked: false,
    sectionPathStatus: 'valid',
    sectionGitBranch: 'main',
    onTriggerRefresh: jest.fn(),
    attachState: {},
    configState: {},
    toggleSubSectionEnabled: jest.fn(),
    setSubSectionDeploymentType: jest.fn(),
    onDropdownChange: jest.fn(),
    openFloatingTerminal: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the section title', () => {
      render(<ConfigSection {...defaultProps} />);
      expect(screen.getByText('Test Section')).toBeInTheDocument();
    });

    it('renders the main toggle', () => {
      render(<ConfigSection {...defaultProps} />);
      expect(screen.getByTestId('toggle-toggle-testSection')).toBeInTheDocument();
    });

    it('renders information button when infoButton is true', () => {
      render(<ConfigSection {...defaultProps} />);
      expect(screen.getByTitle('Show verification details')).toBeInTheDocument();
    });

    it('applies correct CSS classes based on config state', () => {
      const { container } = render(<ConfigSection {...defaultProps} />);
      const sectionDiv = container.firstChild;
      expect(sectionDiv).toHaveClass('config-section', 'collapsed');
    });
  });

  describe('Toggle Functionality', () => {
    it('calls toggleEnabled when main toggle is clicked', () => {
      render(<ConfigSection {...defaultProps} />);
      fireEvent.click(screen.getByTestId('toggle-toggle-testSection'));
      expect(defaultProps.toggleEnabled).toHaveBeenCalledWith('testSection', true);
    });

    it('disables toggle when isLocked is true', () => {
      render(<ConfigSection {...defaultProps} isLocked={true} />);
      const toggle = screen.getByTestId('toggle-toggle-testSection');
      expect(toggle).toBeDisabled();
    });
  });

  describe('Attach Toggle', () => {
    const propsWithAttachToggle = {
      ...defaultProps,
      section: {
        ...defaultProps.section,
        components: {
          ...defaultProps.section.components,
          attachToggle: { enabled: true }
        }
      }
    };

    it('renders attach toggle when enabled', () => {
      render(<ConfigSection {...propsWithAttachToggle} />);
      expect(screen.getByTestId('attach-toggle-attach-testSection')).toBeInTheDocument();
    });

    it('calls onAttachToggle when attach toggle is clicked', () => {
      const mockOnAttachToggle = jest.fn();
      const propsWithMockAttachToggle = {
        ...propsWithAttachToggle,
        onAttachToggle: mockOnAttachToggle,
        isAttached: false,
        config: { enabled: true }
      };
      const { container } = render(<ConfigSection {...propsWithMockAttachToggle} />);
      
      const button = screen.getByTestId('attach-toggle-attach-testSection');
      fireEvent.click(button);
      expect(mockOnAttachToggle).toHaveBeenCalledWith(true);
    });

    it('shows warning class when isAttachWarning is true', () => {
      render(<ConfigSection {...propsWithAttachToggle} isAttachWarning={true} />);
      const attachToggle = screen.getByTestId('attach-toggle-attach-testSection');
      expect(attachToggle).toHaveClass('warning');
    });

    it('disables attach toggle when section is disabled', () => {
      render(<ConfigSection {...propsWithAttachToggle} config={{ enabled: false }} />);
      const attachToggle = screen.getByTestId('attach-toggle-attach-testSection');
      expect(attachToggle).toBeDisabled();
    });
  });

  describe('Mode Selector', () => {
    const propsWithModeSelector = {
      ...defaultProps,
      section: {
        ...defaultProps.section,
        components: {
          ...defaultProps.section.components,
          modeSelector: {
            options: ['development', 'staging', 'production'],
            default: 'development'
          }
        }
      },
      config: { enabled: true, mode: 'development' },
      isAttached: true
    };

    it('renders mode selector when section is enabled and attached', () => {
      render(<ConfigSection {...propsWithModeSelector} />);
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Staging')).toBeInTheDocument();
      expect(screen.getByText('Production')).toBeInTheDocument();
    });

    it('does not render mode selector when section is not attached', () => {
      render(<ConfigSection {...propsWithModeSelector} isAttached={false} />);
      expect(screen.queryByText('Development')).not.toBeInTheDocument();
    });

    it('does not render mode selector when section is disabled', () => {
      render(<ConfigSection {...propsWithModeSelector} config={{ enabled: false, mode: 'development' }} />);
      expect(screen.queryByText('Development')).not.toBeInTheDocument();
    });

    it('calls setMode when mode button is clicked', () => {
      render(<ConfigSection {...propsWithModeSelector} />);
      fireEvent.click(screen.getByText('Staging'));
      expect(defaultProps.setMode).toHaveBeenCalledWith('testSection', 'staging');
    });

    it('shows active class for current mode', () => {
      render(<ConfigSection {...propsWithModeSelector} />);
      const developmentButton = screen.getByText('Development');
      expect(developmentButton).toHaveClass('active');
    });

    it('disables mode buttons when locked', () => {
      render(<ConfigSection {...propsWithModeSelector} isLocked={true} />);
      const developmentButton = screen.getByText('Development');
      expect(developmentButton).toBeDisabled();
    });

    it('capitalizes mode option labels correctly', () => {
      const propsWithLowercaseModes = {
        ...propsWithModeSelector,
        section: {
          ...propsWithModeSelector.section,
          components: {
            ...propsWithModeSelector.section.components,
            modeSelector: {
              options: ['run', 'suspend'],
              default: 'run'
            }
          }
        },
        config: { enabled: true, mode: 'run' }
      };
      render(<ConfigSection {...propsWithLowercaseModes} />);
      expect(screen.getByText('Run')).toBeInTheDocument();
      expect(screen.getByText('Suspend')).toBeInTheDocument();
    });
  });

  describe('Deployment Options', () => {
    const propsWithDeploymentOptions = {
      ...defaultProps,
      section: {
        ...defaultProps.section,
        components: {
          ...defaultProps.section.components,
          deploymentOptions: ['container', 'process']
        }
      },
      config: { enabled: true, deploymentType: 'container' }
    };

    it('renders deployment options when section is enabled', () => {
      render(<ConfigSection {...propsWithDeploymentOptions} />);
      expect(screen.getByTestId('deployment-options-testSection')).toBeInTheDocument();
    });

    it('does not render deployment options when modeSelector is present', () => {
      const propsWithBoth = {
        ...propsWithDeploymentOptions,
        section: {
          ...propsWithDeploymentOptions.section,
          components: {
            ...propsWithDeploymentOptions.section.components,
            modeSelector: {
              options: ['run', 'suspend'],
              default: 'run'
            }
          }
        }
      };
      render(<ConfigSection {...propsWithBoth} />);
      expect(screen.queryByTestId('deployment-options-testSection')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Selectors', () => {
    const propsWithDropdowns = {
      ...defaultProps,
      section: {
        ...defaultProps.section,
        components: {
          ...defaultProps.section.components,
          dropdownSelectors: [
            {
              id: 'testDropdown',
              placeholder: 'Select option...',
              command: 'echo "test"'
            }
          ]
        }
      },
      config: { enabled: true }
    };

    it('renders dropdown selectors when section is enabled', () => {
      render(<ConfigSection {...propsWithDropdowns} />);
      expect(screen.getByTestId('dropdown-testDropdown')).toBeInTheDocument();
    });

    it('calls handleDropdownChange when dropdown value changes', () => {
      render(<ConfigSection {...propsWithDropdowns} />);
      fireEvent.change(screen.getByTestId('dropdown-testDropdown'), { target: { value: 'option1' } });
      expect(defaultProps.setSectionDropdownValue).toHaveBeenCalledWith('testSection', 'testDropdown', 'option1');
    });
  });

  describe('Git Branch Switcher', () => {
    const propsWithGitBranch = {
      ...defaultProps,
      section: {
        ...defaultProps.section,
        components: {
          ...defaultProps.section.components,
          gitBranch: true
        }
      },
      config: { enabled: true },
      sectionGitBranch: 'feature-branch'
    };

    it('renders git branch switcher when section is enabled', () => {
      render(<ConfigSection {...propsWithGitBranch} />);
      expect(screen.getByTestId('git-branch-switcher')).toBeInTheDocument();
      expect(screen.getByText('Branch: feature-branch')).toBeInTheDocument();
    });

    it('does not render git branch switcher when branch is N/A', () => {
      render(<ConfigSection {...propsWithGitBranch} sectionGitBranch="N/A" />);
      expect(screen.queryByTestId('git-branch-switcher')).not.toBeInTheDocument();
    });
  });

  describe('Sub-sections', () => {
    const propsWithSubSections = {
      ...defaultProps,
      section: {
        ...defaultProps.section,
        components: {
          ...defaultProps.section.components,
          subSections: [
            {
              id: 'frontend-sub',
              title: 'Frontend',
              components: {
                toggle: true,
                deploymentOptions: ['normal', 'dev']
              }
            }
          ]
        }
      },
      config: {
        enabled: true,
        frontendConfig: { enabled: false, deploymentType: 'normal' }
      }
    };

    it('renders sub-sections when parent section is enabled', () => {
      render(<ConfigSection {...propsWithSubSections} />);
      expect(screen.getByText('Frontend')).toBeInTheDocument();
    });

    it('calls toggleSubSectionEnabled when sub-section toggle is clicked', () => {
      render(<ConfigSection {...propsWithSubSections} />);
      fireEvent.click(screen.getByTestId('toggle-toggle-testSection-frontend-sub'));
      expect(defaultProps.toggleSubSectionEnabled).toHaveBeenCalledWith('testSection', 'frontend-sub', true);
    });
  });

  describe('Custom Button', () => {
    const propsWithCustomButton = {
      ...defaultProps,
      section: {
        ...defaultProps.section,
        components: {
          ...defaultProps.section.components,
          customButton: {
            id: 'testAnalyticsLogs',
            label: 'View Logs',
            commandId: 'testAnalyticsLogCommand'
          }
        }
      },
      config: { enabled: true }
    };

    it('renders custom button when section is enabled', () => {
      render(<ConfigSection {...propsWithCustomButton} />);
      expect(screen.getByText('View Logs')).toBeInTheDocument();
    });

    it('calls openFloatingTerminal when custom button is clicked', () => {
      render(<ConfigSection {...propsWithCustomButton} />);
      fireEvent.click(screen.getByText('View Logs'));
      expect(defaultProps.openFloatingTerminal).toHaveBeenCalledWith(
        'testAnalyticsLogCommand',
        'Test Analytics Logs',
        'tail -f logs/test.log'
      );
    });

    it('does not render custom button when section is disabled', () => {
      render(<ConfigSection {...propsWithCustomButton} config={{ enabled: false }} />);
      expect(screen.queryByText('View Logs')).not.toBeInTheDocument();
    });
  });

  describe('Verification Popover', () => {
    it('opens verification popover when info button is clicked', async () => {
      render(<ConfigSection {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Show verification details'));
      
      await waitFor(() => {
        expect(screen.getByText('Test section description')).toBeInTheDocument();
      });
    });

    it('shows verification indicators in popover', async () => {
      render(<ConfigSection {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Show verification details'));
      
      await waitFor(() => {
        expect(screen.getByTestId('verification-Test Verification')).toBeInTheDocument();
      });
    });
  });

  describe('Conditional Rendering', () => {
    it('only renders content when section is enabled', () => {
      const { rerender } = render(
        <ConfigSection
          {...defaultProps}
          section={{
            ...defaultProps.section,
            components: {
              ...defaultProps.section.components,
              deploymentOptions: ['container', 'process']
            }
          }}
          config={{ enabled: false }}
        />
      );
      
      expect(screen.queryByTestId('deployment-options-testSection')).not.toBeInTheDocument();
      
      rerender(
        <ConfigSection
          {...defaultProps}
          section={{
            ...defaultProps.section,
            components: {
              ...defaultProps.section.components,
              deploymentOptions: ['container', 'process']
            }
          }}
          config={{ enabled: true, deploymentType: 'container' }}
        />
      );
      
      expect(screen.getByTestId('deployment-options-testSection')).toBeInTheDocument();
    });
  });

  describe('Visibility Rules', () => {
    const propsWithVisibilityRules = {
      ...defaultProps,
      section: {
        ...defaultProps.section,
        components: {
          ...defaultProps.section.components,
          dropdownSelectors: [
            {
              id: 'conditionalDropdown',
              placeholder: 'Select...',
              visibleWhen: {
                configKey: 'deploymentType',
                hasValue: 'container'
              }
            }
          ]
        }
      },
      config: { enabled: true, deploymentType: 'container' }
    };

    it('shows components that meet visibility conditions', () => {
      render(<ConfigSection {...propsWithVisibilityRules} />);
      expect(screen.getByTestId('dropdown-conditionalDropdown')).toBeInTheDocument();
    });

    it('hides components that do not meet visibility conditions', () => {
      const propsWithHiddenComponent = {
        ...propsWithVisibilityRules,
        config: { enabled: true, deploymentType: 'process' }
      };
      render(<ConfigSection {...propsWithHiddenComponent} />);
      expect(screen.queryByTestId('dropdown-conditionalDropdown')).not.toBeInTheDocument();
    });
  });
}); 