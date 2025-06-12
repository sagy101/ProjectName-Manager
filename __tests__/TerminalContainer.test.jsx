/** @jest-environment jsdom */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TerminalContainer from '../src/components/TerminalContainer';

// Mock child components and dependencies
jest.mock('../src/components/TerminalTab', () => ({ id, title, active }) => <div data-testid={`terminal-tab-${id}`} data-active={active}>{title}</div>);
jest.mock('../src/components/Terminal', () => (props) => <div data-testid={`terminal-component-${props.id}`} data-active={props.active}>{props.initialCommand}</div>);
jest.mock('../src/components/TabInfoPanel', () => () => <div data-testid="tab-info-panel"></div>);
jest.mock('../src/components/TerminalPlaceholder', () => ({ projectName }) => <div data-testid="terminal-placeholder">Waiting to Run {projectName}</div>);
jest.mock('../src/components/OverflowTabsDropdown', () => () => <div data-testid="overflow-dropdown"></div>);


describe('TerminalContainer', () => {
    let mockTerminalManager;

    beforeEach(() => {
        mockTerminalManager = {
            writeToTerminal: jest.fn(),
            getActiveTerminalId: jest.fn(),
            setActiveTerminalId: jest.fn(),
            createTerminal: jest.fn(),
            runInTerminal: jest.fn(),
            killProcess: jest.fn(),
            stopContainers: jest.fn().mockResolvedValue(true),
        };

        // Mock global window properties
        global.window.terminalManager = mockTerminalManager;
        global.window.runInTerminal = mockTerminalManager.runInTerminal;
        global.window.electron = {
            onCommandOutput: jest.fn(() => jest.fn()),
            setDirectOutputHandler: jest.fn(() => jest.fn()),
            onProcessExited: jest.fn(() => jest.fn()),
            onProcessEnded: jest.fn(() => jest.fn()),
            killProcess: mockTerminalManager.killProcess,
            stopContainers: mockTerminalManager.stopContainers,
            isDevToolsOpen: jest.fn(() => true),
        };

        global.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    });

    test('should display placeholder when no terminals are present', () => {
        render(<TerminalContainer projectName="MyTestProject" />);
        expect(screen.getByTestId('terminal-placeholder')).toBeInTheDocument();
        expect(screen.getByText(/Waiting to Run MyTestProject/i)).toBeInTheDocument();
    });

    describe('useImperativeHandle methods', () => {
        let ref;

        beforeEach(() => {
            ref = React.createRef();
        });

        test('openTabs should create new terminals and set the first one active', () => {
            render(<TerminalContainer ref={ref} />);
            const tabConfigs = [
                { title: 'Tab 1', command: 'echo 1' },
                { title: 'Tab 2', command: 'echo 2' },
            ];
            
            act(() => {
                ref.current.openTabs(tabConfigs);
            });

            expect(screen.getAllByText(/Tab \d/)).toHaveLength(2);

            const activeTabs = screen.getAllByTestId(/terminal-tab-/).filter(tab => tab.dataset.active === 'true');
            expect(activeTabs).toHaveLength(1);
            expect(activeTabs[0]).toHaveTextContent('Tab 1');
        });

        test('clearTabs should remove all terminals', () => {
            render(<TerminalContainer ref={ref} />);
            const tabConfigs = [{ title: 'Tab 1', command: 'echo 1' }];

            act(() => {
                ref.current.openTabs(tabConfigs);
            });
            expect(screen.queryAllByTestId(/terminal-tab-/)).toHaveLength(1);

            act(() => {
                ref.current.clearTabs();
            });

            expect(screen.queryAllByTestId(/terminal-tab-/)).toHaveLength(0);
            expect(screen.getByTestId('terminal-placeholder')).toBeInTheDocument();
        });

        test('killAllTerminals should call killProcess for each terminal and stop associated containers', async () => {
            render(<TerminalContainer ref={ref} />);
            const tabConfigs = [
                { title: 'Tab A', command: 'cmd a', associatedContainers: ['container-a'] },
                { title: 'Tab B', command: 'cmd b', associatedContainers: ['container-b', 'container-c'] },
            ];
            
            act(() => {
                ref.current.openTabs(tabConfigs);
            });
            
            await act(async () => {
                await ref.current.killAllTerminals();
            });

            expect(window.electron.killProcess).toHaveBeenCalledTimes(2);
            expect(window.electron.killProcess).toHaveBeenCalledWith(expect.any(Number));
            
            expect(window.electron.stopContainers).toHaveBeenCalledTimes(1);
            // Using a Set to check for containers disregards order
            const expectedContainers = new Set(['container-a', 'container-b', 'container-c']);
            const calledWith = new Set(window.electron.stopContainers.mock.calls[0][0]);
            expect(calledWith).toEqual(expectedContainers);
        });
    });
}); 