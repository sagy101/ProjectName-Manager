import { useEffect, useRef } from 'react';

export const useIpcListeners = (setTerminals) => {
    const cleanupFunctions = useRef([]);

    // Direct command output listener
    useEffect(() => {
        const directCommandOutputHandler = (event) => {
            try {
                const data = JSON.parse(event.detail);
                const { stdout, stderr, terminalId } = data;

                if (window.terminals && window.terminals[terminalId]) {
                    if (stdout) window.terminals[terminalId].write(stdout);
                    if (stderr) window.terminals[terminalId].write(stderr, true);
                }
            } catch (error) {
                console.error('Error handling direct command output:', error);
            }
        };

        window.addEventListener('direct-command-output', directCommandOutputHandler);
        return () => window.removeEventListener('direct-command-output', directCommandOutputHandler);
    }, []);

    // Bridge between Electron IPC and DOM events
    useEffect(() => {
        if (window.electron) {
            const bridgeFunction = (data) => {
                const event = new CustomEvent('direct-command-output', {
                    detail: JSON.stringify(data)
                });
                window.dispatchEvent(event);
            };

            const removeCommandOutput = window.electron.onCommandOutput(bridgeFunction);
            cleanupFunctions.current.push(removeCommandOutput);
            
            let removeDirectHandler = null;
            if (window.electron.setDirectOutputHandler) {
                removeDirectHandler = window.electron.setDirectOutputHandler((data) => {
                    const { terminalId, stdout, stderr } = data;
                    if (window.terminals && window.terminals[terminalId]) {
                        if (stdout) window.terminals[terminalId].write(stdout);
                        if (stderr) window.terminals[terminalId].write(stderr, true);
                    }
                });
                cleanupFunctions.current.push(removeDirectHandler);
            }

            return () => {
                cleanupFunctions.current.forEach(cleanup => cleanup && cleanup());
                cleanupFunctions.current = [];
            };
        }
    }, []);

    // Terminal lifecycle event listeners
    useEffect(() => {
        if (window.electron) {
            const onProcessEnded = ({ terminalId, code, signal }) => {
                setTerminals(prev => {
                    return prev.map(t => {
                        if (t.id === terminalId) {
                            let status = 'done';
                            let exitStatus = 'Exited successfully';

                            if (signal) {
                                status = 'stopped';
                                exitStatus = `Terminated by signal ${signal}`;
                            } else if (code !== 0) {
                                status = 'error';
                                exitStatus = `Exited with error code ${code}`;
                            }

                            const updatedTerminal = { ...t, status, exitStatus };
                            return updatedTerminal;
                        }
                        return t;
                    });
                });
            };

            const removeListener = window.electron.onProcessEnded(onProcessEnded);
            return () => {
                removeListener && removeListener();
            };
        }
    }, [setTerminals]);

    // Command finished event listener
    useEffect(() => {
        if (window.electron && window.electron.onCommandFinished) {
            const onCommandFinished = ({ terminalId, exitCode, status, exitStatus }) => {
                setTerminals(prev => {
                    return prev.map(t => {
                        // Convert both to strings for comparison to handle type mismatches
                        if (String(t.id) === String(terminalId)) {
                            const updatedTerminal = { 
                                ...t, 
                                status: status || 'done', 
                                exitStatus: exitStatus || 'Command completed',
                                exitCode 
                            };
                            return updatedTerminal;
                        }
                        return t;
                    });
                });
            };

            const removeListener = window.electron.onCommandFinished(onCommandFinished);
            return () => {
                removeListener && removeListener();
            };
        }
    }, [setTerminals]);

    // Command started event listener
    useEffect(() => {
        if (window.electron && window.electron.onCommandStarted) {
            const onCommandStarted = ({ terminalId }) => {
                setTerminals(prev => {
                    return prev.map(t => {
                        if (t.id === terminalId) {
                            const updatedTerminal = { ...t, status: 'running' };
                            return updatedTerminal;
                        }
                        return t;
                    });
                });
            };

            const removeListener = window.electron.onCommandStarted(onCommandStarted);
            return () => {
                removeListener && removeListener();
            };
        }
    }, [setTerminals]);

    // Command status update event listener (for detailed real-time status)
    useEffect(() => {
        if (window.electron && window.electron.onCommandStatusUpdate) {
            const onCommandStatusUpdate = ({ terminalId, overallStatus, statusDescription, processStates, processCount }) => {
                setTerminals(prev => {
                    return prev.map(t => {
                        if (t.id === terminalId) {
                            const updatedTerminal = { 
                                ...t, 
                                status: overallStatus,
                                exitStatus: statusDescription,
                                processStates,
                                processCount
                            };
                            return updatedTerminal;
                        }
                        return t;
                    });
                });
            };

            const removeListener = window.electron.onCommandStatusUpdate(onCommandStatusUpdate);
            return () => {
                removeListener && removeListener();
            };
        }
    }, [setTerminals]);

}; 