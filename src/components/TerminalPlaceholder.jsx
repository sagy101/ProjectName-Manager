import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

const TerminalPlaceholder = ({ projectName }) => (
  <div className="terminal-placeholder">
    <div className="placeholder-content">
      <ClockIcon style={{ width: 50, height: 50, color: 'var(--pfpt-primary-orange)', marginBottom: 20 }} />
      <h2 style={{ color: 'var(--pfpt-neutral-white)', fontSize: '24px', marginBottom: '10px' }}>
        Waiting to Run {projectName ? projectName.toUpperCase() : 'ISO'}
      </h2>
      <p style={{ color: 'var(--pfpt-neutral-300)', fontSize: '16px' }}>
        Press <b>RUN {projectName ? projectName.toUpperCase() : 'ISO'}</b> to start your configuration and see output here.
      </p>
    </div>
  </div>
);

export default TerminalPlaceholder; 