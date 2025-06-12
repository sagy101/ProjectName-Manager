import { useState, useCallback } from 'react';
import { evaluateCommandCondition } from '../utils/evalUtils';

export const useTerminals = (configState, configSidebarCommands) => {
    const [terminals, setTerminals] = useState([]);
    const [activeTerminalId, setActiveTerminalId] = useState(null);

    const openTabs = useCallback((tabConfigs) => {
        setTerminals([]);
        let firstId = null;
        const newTerminals = tabConfigs.map((tab, idx) => {
            const terminalId = Date.now() + idx;
            if (idx === 0) firstId = terminalId;

            if (tab.type === 'error') {
                return {
                    id: terminalId,
                    title: tab.title || tab.section,
                    status: 'error',
                    errorType: 'config',
                    errorMessage: tab.message,
                    sectionId: tab.sectionId,
                    commandDefinitionId: tab.commandDefinitionId,
                };
            } else {
                return {
                    id: terminalId,
                    title: tab.title || tab.section,
                    status: 'idle',
                    command: tab.command,
                    originalCommand: tab.command,
                    sectionId: tab.sectionId,
                    commandDefinitionId: tab.commandDefinitionId,
                    associatedContainers: tab.associatedContainers || [],
                    isSubSectionCommand: tab.isSubSectionCommand || false,
                    refreshConfig: tab.refreshConfig,
                    refreshCount: 0,
                };
            }
        });

        setTerminals(newTerminals);
        if (firstId) setActiveTerminalId(firstId);
    }, []);

    const clearTabs = useCallback(() => {
        setTerminals([]);
        setActiveTerminalId(null);
    }, []);

    const handleRefreshTab = useCallback(async (terminalId) => {
        const terminal = terminals.find(t => t.id === terminalId);
        if (!terminal) return;

        if (terminal.associatedContainers && terminal.associatedContainers.length > 0) {
            const containersToStop = terminal.associatedContainers.filter(c => c && typeof c === 'string');
            if (window.electron?.stopContainers) {
                await window.electron.stopContainers(containersToStop);
            }
        }

        let commandToRun = terminal.originalCommand || terminal.command;
        const { commandDefinitionId, sectionId } = terminal;

        if (commandDefinitionId !== undefined && configSidebarCommands[commandDefinitionId]) {
            const commandDef = configSidebarCommands[commandDefinitionId];
            if (commandDef.command?.refreshConfig) {
                const { refreshConfig } = commandDef.command;
                let prependedString = '';
                let appendedString = '';

                if (refreshConfig.prependCommands) {
                    refreshConfig.prependCommands.forEach(pc => {
                        if (evaluateCommandCondition(pc.condition, configState, sectionId)) {
                            prependedString += pc.command;
                        }
                    });
                }
                if (refreshConfig.appendCommands) {
                    refreshConfig.appendCommands.forEach(ac => {
                        if (evaluateCommandCondition(ac.condition, configState, sectionId)) {
                            appendedString += ac.command;
                        }
                    });
                }
                commandToRun = prependedString + commandToRun + appendedString;
            }
        }

        if (window.electron?.killProcess) {
            window.electron.killProcess(terminalId);
        }

        setTerminals(prev =>
            prev.map(t =>
                t.id === terminalId
                    ? { ...t, status: 'pending_spawn', command: commandToRun, refreshCount: (t.refreshCount || 0) + 1 }
                    : t
            )
        );
    }, [terminals, configState, configSidebarCommands]);

    const handleCloseTab = useCallback(async (terminalId) => {
        const terminalToClose = terminals.find(t => t.id === terminalId);
        if (!terminalToClose) return;

        if (terminalToClose.associatedContainers && terminalToClose.associatedContainers.length > 0) {
            if (window.electron?.stopContainers) {
                const containersToStop = terminalToClose.associatedContainers.filter(c => c && typeof c === 'string');
                await window.electron.stopContainers(containersToStop);
            }
        }

        if (window.electron?.killProcess) {
            window.electron.killProcess(terminalId);
        }

        setTerminals(prev => {
            const newTerminals = prev.filter(terminal => terminal.id !== terminalId);
            if (newTerminals.length === 0) {
                setActiveTerminalId(null);
            } else if (terminalId === activeTerminalId) {
                const currentIndex = prev.findIndex(t => t.id === terminalId);
                const newIndex = currentIndex === 0 ? 0 : currentIndex - 1;
                setActiveTerminalId(newTerminals[newIndex]?.id || null);
            }
            return newTerminals;
        });
    }, [terminals, activeTerminalId]);

    const killAllTerminals = useCallback(async () => {
        const allContainersToStop = new Set();
        terminals.forEach(terminal => {
            if (terminal.associatedContainers) {
                terminal.associatedContainers.forEach(container => {
                    if (container && typeof container === 'string') {
                        allContainersToStop.add(container);
                    }
                });
            }
            if (window.electron?.killProcess) {
                window.electron.killProcess(terminal.id);
            }
        });

        if (allContainersToStop.size > 0 && window.electron?.stopContainers) {
            await window.electron.stopContainers(Array.from(allContainersToStop));
        }
    }, [terminals]);

    return {
        terminals,
        setTerminals,
        activeTerminalId,
        setActiveTerminalId,
        openTabs,
        clearTabs,
        handleRefreshTab,
        handleCloseTab,
        killAllTerminals
    };
}; 