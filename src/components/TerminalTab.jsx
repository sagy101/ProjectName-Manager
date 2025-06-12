import React, { useRef } from 'react';
import TabStatusIndicator from './TabStatusIndicator';
import { useTitleOverflow } from '../hooks/useTitleOverflow';

const TerminalTab = ({ id, title, status, active, onSelect, onInfo, isError }) => {
  const tabRef = useRef(null);
  const titleRef = useRef(null);
  const isOverflowing = useTitleOverflow(tabRef, titleRef, active);

  const handleInfoClick = (e) => {
    e.stopPropagation();
    onInfo(id, e);
  };

  return (
    <div 
      ref={tabRef}
      className={`tab ${active ? 'active' : ''} ${isError ? 'error-tab-button' : ''}`}
      data-terminal-id={id}
      onClick={() => onSelect(id)}
      data-tab-id={id}
      data-testid={`terminal-tab-${id}`}
      title={isOverflowing ? title : ''}
    >
      <TabStatusIndicator status={status} isError={isError} />
      <span ref={titleRef} className="tab-title">{title}</span>
      <button 
        className="tab-info-button"
        onClick={handleInfoClick}
        title="Tab Information"
      >
        ℹ
      </button>
    </div>
  );
};

export default TerminalTab; 