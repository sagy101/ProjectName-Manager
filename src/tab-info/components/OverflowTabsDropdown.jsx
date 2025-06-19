import React from 'react';
import ReactDOM from 'react-dom';

const OverflowTabsDropdown = ({
  isOpen,
  tabs,
  activeTerminalId,
  onSelectTab,
  onShowTabInfo,
  containerRef
}) => {
  if (!isOpen) return null;

  const overflowButton = containerRef.current?.querySelector('.overflow-indicator');
  if (!overflowButton) return null;

  const rect = overflowButton.getBoundingClientRect();
  const dropdownStyle = {
    position: 'fixed',
    top: rect.bottom + 2,
    right: window.innerWidth - rect.right,
    zIndex: 99999,
    backgroundColor: '#303030',
    border: '1px solid #444',
    borderRadius: '4px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
    minWidth: '220px',
    maxHeight: '350px',
    overflowY: 'auto',
    padding: '6px 0',
    animation: 'dropdown-appear 0.15s ease-out',
    transformOrigin: 'top right'
  };

  const dropdownContent = (
    <div
      style={dropdownStyle}
      onClick={e => e.stopPropagation()}
      data-testid="overflow-dropdown"
    >
      {tabs.length > 0 ? (
        tabs.map(terminal => (
          <div
            key={terminal.id}
            className={`overflow-tab ${terminal.id === activeTerminalId ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTab(terminal.id);
            }}
          >
            <span className={`tab-status status-${terminal.status}`} />
            <span className="tab-title">{terminal.title}</span>
            <button
              className="tab-info-button"
              onClick={(e) => {
                e.stopPropagation();
                onShowTabInfo(terminal.id, e);
              }}
              title="Tab Information"
            >
              ℹ
            </button>
          </div>
        ))
      ) : (
        <div className="overflow-tab">No additional tabs</div>
      )}
    </div>
  );

  return ReactDOM.createPortal(dropdownContent, document.body);
};

export default OverflowTabsDropdown; 