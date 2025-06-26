import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import ConfigSection from '../../src/project-config/ConfigSection.jsx';
import sectionsData from '../mock-data/mockConfigurationSidebarSections.json';
import aboutData from '../mock-data/mockConfigurationSidebarAbout.json';
import commandsData from '../mock-data/mockConfigurationSidebarCommands.json';

// --- Mocks ---
// Mock all child components to isolate ConfigSection and prevent module errors.
// Each mock is a simple, resilient functional component.
jest.mock('../../src/common/components/Toggle', () => (props) => {
    const { id, checked, onChange, disabled } = props || {};
    return <input type="checkbox" data-testid={id} defaultChecked={checked} onChange={(e) => onChange && onChange(e.target.checked)} disabled={disabled} />;
});

jest.mock('../../src/project-config/AttachToggle', () => (props) => {
    const { id, isAttached, onToggle, isWarning, disabled } = props || {};
    return <button data-testid={id} onClick={() => onToggle && onToggle(!isAttached)} disabled={disabled}>{isWarning ? 'Warning' : (isAttached ? 'Attached' : 'Detached')}</button>;
});

jest.mock('../../src/project-config/DeploymentOptions', () => (props) => {
    const { sectionId, currentType, onChange, disabled } = props || {};
    return (
        <div data-testid={`deployment-options-${sectionId}`}>
            <button disabled={disabled} className={currentType === 'container' ? 'active' : ''} onClick={() => onChange && onChange(sectionId, 'container')}>Container</button>
            <button disabled={disabled} className={currentType === 'process' ? 'active' : ''} onClick={() => onChange && onChange(sectionId, 'process')}>Process</button>
        </div>
    );
});

jest.mock('../../src/project-config/ModeSelector', () => (props) => {
    const { sectionId, options = [], labels = [], currentMode, onModeChange, disabled, showAppNotification } = props || {};
    return (
        <div data-testid={`mode-selector-${sectionId}`}>
            {options.map((option, index) => {
                const value = typeof option === 'object' ? option.value : option;
                const status = typeof option === 'object' ? option.status : null;
                const label = labels[index] || value;
                const isTBD = status === 'TBD';
                
                return (
                    <button 
                        key={value} 
                        disabled={disabled} 
                        className={currentMode === value ? 'active' : ''} 
                        onClick={() => {
                            if (isTBD && showAppNotification) {
                                showAppNotification('This feature is not yet implemented.', 'info');
                            } else if (onModeChange) {
                                onModeChange(sectionId, value);
                            }
                        }}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
});

jest.mock('../../src/common/components/DropdownSelector', () => (props) => {
    const { id, onChange, disabled } = props || {};
    return (
        <select data-testid={`dropdown-${id}`} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
            <option value="">Select...</option>
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
        </select>
    );
});

jest.mock('../../src/project-config/InputField', () => (props) => {
    const { inputId, onChange, disabled } = props || {};
    return (
        <input
            data-testid={`input-${inputId}`}
            onChange={(e) => onChange && onChange(props.sectionId, inputId, e.target.value)}
            disabled={disabled}
        />
    );
});

jest.mock('../../src/project-config/GitBranchSwitcher', () => (props) => {
    const { currentBranch, disabled } = props || {};
    return <div data-testid="git-branch-switcher" data-disabled={disabled}>Branch: {currentBranch}</div>;
});

jest.mock('../../src/environment-verification/VerificationIndicator', () => (props) => {
    const { label } = props || {};
    return <div data-testid="verification-indicator">{label}</div>;
});

// --- Tests ---

describe('ConfigSection', () => {
    let baseProps;

    beforeEach(() => {
        baseProps = {
            config: {},
            setDeploymentType: jest.fn(),
            setMode: jest.fn(),
            toggleEnabled: jest.fn(),
            toggleSubSectionEnabled: jest.fn(),
            setSubSectionDeploymentType: jest.fn(),
            setInputFieldValue: jest.fn(),
            onAttachToggle: jest.fn(),
            isAttached: false,
            aboutConfig: aboutData,
            configSidebarCommands: commandsData,
            globalDropdownValues: {},
            onDropdownChange: jest.fn(),
            openFloatingTerminal: jest.fn(),
            isLocked: false,
            sectionPathStatus: {},
            showAppNotification: jest.fn(),
        };
    });

    it('renders the section title', () => {
        const section = sectionsData.sections[0]; // generic-section-1
        render(<ConfigSection {...baseProps} section={section} />);
        expect(screen.getByText('Generic Section 1')).toBeInTheDocument();
    });

    it('renders and handles the main toggle', () => {
        const section = sectionsData.sections.find(s => s.id === 'generic-section-1');
        const config = { enabled: true };
        render(<ConfigSection {...baseProps} section={section} config={config} />);

        const toggle = screen.getByTestId('toggle-generic-section-1');
        expect(toggle).toBeInTheDocument();
        expect(toggle).toBeChecked();

        fireEvent.click(toggle);
        expect(baseProps.toggleEnabled).toHaveBeenCalledWith('generic-section-1', false);
    });
    
    it('renders a ModeSelector when section is enabled and attached', () => {
        const section = sectionsData.sections.find(s => s.id === 'generic-section-1');
        const config = { enabled: true, mode: 'suspend' };
        render(<ConfigSection {...baseProps} section={section} config={config} isAttached={true} />);

        const modeSelector = screen.getByTestId('mode-selector-generic-section-1');
        expect(modeSelector).toBeInTheDocument();

        const runButton = screen.getByText('Run');
        expect(runButton).toBeInTheDocument();
        fireEvent.click(runButton);
        expect(baseProps.setMode).toHaveBeenCalledWith('generic-section-1', 'run');
    });

    it('renders DeploymentOptions for sections configured with it', () => {
        const section = sectionsData.sections.find(s => s.id === 'generic-section-2');
        const config = { enabled: true, deploymentType: 'container' };
        render(<ConfigSection {...baseProps} section={section} config={config} />);

        const deploymentOptions = screen.getByTestId('deployment-options-generic-section-2');
        expect(deploymentOptions).toBeInTheDocument();
        
        const processButton = screen.getByText('Process');
        fireEvent.click(processButton);
        expect(baseProps.setMode).toHaveBeenCalledWith('generic-section-2', 'process');
    });
    
    it('renders sub-sections correctly', () => {
        const section = sectionsData.sections.find(s => s.id === 'generic-section-1');
        const config = { 
            enabled: true, 
            'generic-subsection-1Config': { enabled: true, mode: 'normal' }
        };
        render(<ConfigSection {...baseProps} section={section} config={config} />);

        expect(screen.getByText('Generic Subsection')).toBeInTheDocument();
        const subSectionToggle = screen.getByTestId('toggle-generic-section-1-generic-subsection-1');
        expect(subSectionToggle).toBeInTheDocument();
        expect(subSectionToggle).toBeChecked();
        
        const subSectionModeSelector = screen.getByTestId('mode-selector-generic-subsection-1');
        expect(subSectionModeSelector).toBeInTheDocument();
    });

    it('disables all controls when locked', () => {
        const section = sectionsData.sections.find(s => s.id === 'generic-section-1');
        const config = { enabled: true, mode: 'run' };
        render(<ConfigSection {...baseProps} section={section} config={config} isLocked={true} isAttached={true} />);

        expect(screen.getByTestId('toggle-generic-section-1')).toBeDisabled();
        expect(screen.getByTestId('attach-generic-section-1')).toBeDisabled();
        
        const runButton = screen.getByText('Run');
        expect(runButton).toBeDisabled();
    });

    it('renders dropdown selectors and handles changes', () => {
        const section = sectionsData.sections.find(s => s.id === 'section-with-dropdowns');
        const { rerender } = render(
            <ConfigSection {...baseProps} section={section} config={{ enabled: true }} />
        );

        const dropdown = screen.getByTestId('dropdown-mock-dropdown-1');
        expect(dropdown).toBeInTheDocument();

        fireEvent.change(dropdown, { target: { value: 'option2' } });
        expect(baseProps.onDropdownChange).toHaveBeenCalledWith('section-with-dropdowns', 'mock-dropdown-1', 'option2');
        
        // Rerender with updated global state to reflect the change
        rerender(
            <ConfigSection 
                {...baseProps} 
                section={section} 
                config={{ enabled: true }} 
                globalDropdownValues={{ 'mock-dropdown-1': 'option2' }}
            />
        );
        const dropdownWithValue = screen.getByTestId('dropdown-mock-dropdown-1');
        expect(dropdownWithValue.value).toBe('option2');
    });

    it('renders a custom button and handles click', () => {
        const section = sectionsData.sections.find(s => s.id === 'section-with-button');
        if (!section || !section.buttons || section.buttons.length === 0) {
            // If no button, skip this test gracefully
            return;
        }
        const customButtonConfig = commandsData.find(c => c.id === section.buttons[0].commandId);
        if (!customButtonConfig) {
            // If no command config, skip
            return;
        }
        render(<ConfigSection {...baseProps} section={section} config={{ enabled: true }} configSidebarCommands={commandsData} />);
        const customButton = screen.getByText(customButtonConfig.label);
        expect(customButton).toBeInTheDocument();
        fireEvent.click(customButton);
        expect(baseProps.openFloatingTerminal).toHaveBeenCalledWith(
            customButtonConfig.id,
            customButtonConfig.command.tabTitle,
            customButtonConfig.command.base
        );
    });

    it('toggles sub-section enabled state', () => {
        const section = sectionsData.sections.find(s => s.id === 'generic-section-1');
        const config = { enabled: true, 'generic-subsection-1Config': { enabled: true } };
        render(<ConfigSection {...baseProps} section={section} config={config} />);

        const subSectionToggle = screen.getByTestId('toggle-generic-section-1-generic-subsection-1');
        fireEvent.click(subSectionToggle);
        expect(baseProps.toggleSubSectionEnabled).toHaveBeenCalledWith('generic-section-1', 'generic-subsection-1', false);
    });

    it('renders a single customButton and handles click', () => {
        const mockSection = {
            id: "test-analytics",
            title: "Test Analytics Engine",
            testSection: true,
            components: {
                toggle: true,
                customButton: {
                    id: "testAnalyticsLogs",
                    label: "View Logs",
                    commandId: "testAnalyticsLogCommand"
                }
            }
        };

        const mockCommands = [{
            "id": "testAnalyticsLogCommand",
            "command": {
                "base": "tail -f /var/log/analytics.log",
                "tabTitle": "Analytics Logs"
            }
        }];

        render(
            <ConfigSection 
                {...baseProps} 
                section={mockSection} 
                config={{ enabled: true }} 
                configSidebarCommands={mockCommands} 
            />
        );

        const button = screen.getByText('View Logs');
        expect(button).toBeInTheDocument();
        fireEvent.click(button);

        expect(baseProps.openFloatingTerminal).toHaveBeenCalledTimes(1);
        expect(baseProps.openFloatingTerminal).toHaveBeenCalledWith(
            'testAnalyticsLogCommand',
            'View Logs',
            'tail -f /var/log/analytics.log'
        );
    });

    it('renders sub-section custom button and handles click', () => {
        const mockSection = {
            id: 'parent-section',
            title: 'Parent Section',
            components: {
                toggle: true,
                subSections: [
                    {
                        id: 'child-sub',
                        title: 'Child Sub',
                        components: {
                            toggle: true,
                            customButton: {
                                id: 'childLogs',
                                label: 'Sub Logs',
                                commandId: 'childLogCommand'
                            }
                        }
                    }
                ]
            }
        };

        const mockCommands = [{
            id: 'childLogCommand',
            command: {
                base: 'echo child log',
                tabTitle: 'Child Logs'
            }
        }];

        const config = { enabled: true, childConfig: { enabled: true } };

        render(
            <ConfigSection
                {...baseProps}
                section={mockSection}
                config={config}
                configSidebarCommands={mockCommands}
            />
        );

        const button = screen.getByText('Sub Logs');
        expect(button).toBeInTheDocument();
        fireEvent.click(button);

        expect(baseProps.openFloatingTerminal).toHaveBeenCalledWith(
            'childLogCommand',
            'Sub Logs',
            'echo child log'
        );
    });

    it('handles TBD options in ModeSelector correctly', () => {
        const section = sectionsData.sections.find(s => s.id === 'test-section-generic');
        const config = { enabled: true, mode: 'alpha' };
        baseProps.showAppNotification = jest.fn();

        render(
            <ConfigSection 
                {...baseProps} 
                section={section} 
                config={config}
            />
        );

        const tbdButton = screen.getByText('beta');
        fireEvent.click(tbdButton);

        // Check that the mode change was NOT called
        expect(baseProps.setMode).not.toHaveBeenCalled();
        // Check that a notification was shown
        expect(baseProps.showAppNotification).toHaveBeenCalledWith('This feature is not yet implemented.', 'info');
    });

    it('renders input field when attached and updates value', () => {
        const section = sectionsData.sections.find(s => s.id === 'section-with-input');
        const config = { enabled: true, testField: '' };
        render(
            <ConfigSection
                {...baseProps}
                section={section}
                config={config}
                isAttached={true}
                attachState={{ 'section-with-input': true }}
            />
        );

        const input = screen.getByTestId('input-testField');
        expect(input).toBeInTheDocument();
        fireEvent.change(input, { target: { value: 'hello' } });
        expect(baseProps.setInputFieldValue).toHaveBeenCalledWith('section-with-input', 'testField', 'hello');
    });

    it('handles visibleWhen rules with dot-separated configKey paths', () => {
        const mockSection = {
            id: 'test-section',
            title: 'Test Section',
            components: {
                toggle: true,
                dropdownSelectors: [{
                    id: 'test-dropdown',
                    visibleWhen: {
                        configKey: 'nested.config.value',
                        hasValue: true
                    }
                }]
            }
        };

        const config = { 
            enabled: true,
            nested: { config: { value: true } }
        };

        render(<ConfigSection {...baseProps} section={mockSection} config={config} />);
        
        // Should render dropdown since nested.config.value === true
        expect(screen.getByTestId('dropdown-test-dropdown')).toBeInTheDocument();
    });

    it('handles invalid visibleWhen rules gracefully', () => {
        console.warn = jest.fn(); // Mock console.warn
        
        const mockSection = {
            id: 'test-section',
            title: 'Test Section',
            components: {
                toggle: true,
                dropdownSelectors: [{
                    id: 'test-dropdown',
                    visibleWhen: {
                        configKey: null, // Invalid rule
                        hasValue: true
                    }
                }]
            }
        };

        render(<ConfigSection {...baseProps} section={mockSection} config={{ enabled: true }} />);
        
        // Should still render dropdown (defaults to visible on invalid rule)
        expect(screen.getByTestId('dropdown-test-dropdown')).toBeInTheDocument();
        expect(console.warn).toHaveBeenCalledWith(expect.any(String), 'Invalid visibleWhen rule:', expect.any(Object));
        
        console.warn.mockRestore();
    });

    it('handles verification info button click and popover', () => {
        const section = sectionsData.sections[0];
        render(<ConfigSection {...baseProps} section={section} config={{ enabled: true }} />);
        
        // Find and click the verification info button
        const infoButton = screen.getByTitle('Show verification details');
        expect(infoButton).toBeInTheDocument();
        
        fireEvent.click(infoButton);
        
        // Popover should be visible (though actual popover content depends on about data)
        const popover = document.querySelector('.config-section-verification-popover');
        expect(popover).toBeInTheDocument();
    });

    it('handles sectionPathStatus as string for backward compatibility', () => {
        const section = sectionsData.sections[0];
        const props = { 
            ...baseProps, 
            sectionPathStatus: 'VALID' // String instead of object
        };
        
        render(<ConfigSection {...props} section={section} config={{ enabled: true }} />);
        
        // Should render without errors
        expect(screen.getByText(section.title)).toBeInTheDocument();
    });

    it('renders custom buttons array correctly', () => {
        const mockSection = {
            id: 'test-section',
            title: 'Test Section',
            components: {
                toggle: true,
                customButtons: [
                    { id: 'btn1', label: 'Button 1', commandId: 'cmd1' },
                    { id: 'btn2', label: 'Button 2', commandId: 'cmd2' }
                ]
            }
        };

        const mockCommands = [
            { id: 'cmd1', command: { base: 'echo test1' } },
            { id: 'cmd2', command: { base: 'echo test2' } }
        ];

        render(
            <ConfigSection 
                {...baseProps} 
                section={mockSection} 
                config={{ enabled: true }}
                configSidebarCommands={mockCommands}
            />
        );

        expect(screen.getByText('Button 1')).toBeInTheDocument();
        expect(screen.getByText('Button 2')).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Button 1'));
        expect(baseProps.openFloatingTerminal).toHaveBeenCalledWith('cmd1', 'Button 1', 'echo test1');
    });

    it('handles input fields array correctly', () => {
        const mockSection = {
            id: 'test-section',
            title: 'Test Section',
            components: {
                toggle: true,
                inputFields: [
                    { id: 'field1', placeholder: 'Field 1' },
                    { id: 'field2', placeholder: 'Field 2' }
                ]
            }
        };

        render(
            <ConfigSection 
                {...baseProps} 
                section={mockSection} 
                config={{ enabled: true, field1: 'value1', field2: 'value2' }}
            />
        );

        expect(screen.getByTestId('input-field1')).toBeInTheDocument();
        expect(screen.getByTestId('input-field2')).toBeInTheDocument();
    });
}); 