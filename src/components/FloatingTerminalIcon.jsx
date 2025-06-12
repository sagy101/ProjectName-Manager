import React from 'react';
import { ComputerDesktopIcon } from '@heroicons/react/24/outline';

const FloatingTerminalIcon = ({ terminalCount }) => {
  return (
    <div className="floating-terminal-icon-container">
      <ComputerDesktopIcon className="w-6 h-6" />
      {terminalCount > 0 && (
        <span className="floating-terminal-count-badge">
          {terminalCount}
        </span>
      )}
    </div>
  );
};

export default FloatingTerminalIcon; 