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
            const onProcessEnded = ({ terminalId, code }) => {
                setTerminals(prev =>
                    prev.map(t => (t.id === terminalId ? { ...t, status: code === 0 ? 'done' : 'error' } : t))
                );
            };

            const removeListener = window.electron.onProcessEnded(onProcessEnded);
            return () => removeListener && removeListener();
        }
    }, [setTerminals]);

}; 