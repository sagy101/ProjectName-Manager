import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Create a simple test component that mimics the collapsible sidebar structure
const TestCollapsibleSidebar = ({ isCollapsed, onToggleCollapse }) => {
  return (
    <div className="app-content-wrapper">
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="config-container">
          <div id="config-sections" className={isCollapsed ? 'hidden' : ''}>
            <div>Configuration Content</div>
          </div>
          <div className="run-button-container">
            <button>Run Button</button>
          </div>
        </div>
      </div>
      <button 
        className={`config-collapse-btn ${isCollapsed ? 'collapsed' : ''}`}
        onClick={onToggleCollapse}
        title={isCollapsed ? 'Expand Configuration' : 'Collapse Configuration'}
      >
        {isCollapsed ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        )}
      </button>
      <div className="main-content">
        <div>Main Content Area</div>
      </div>
    </div>
  );
};

describe('Collapsible Sidebar', () => {
  test('should render collapse button with correct initial state', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={false} onToggleCollapse={mockToggle} />);
    
    const collapseButton = screen.getByRole('button', { name: /collapse configuration/i });
    expect(collapseButton).toBeInTheDocument();
    expect(collapseButton).toHaveClass('config-collapse-btn');
    expect(collapseButton).not.toHaveClass('collapsed');
  });

  test('should call toggle function when button is clicked', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={false} onToggleCollapse={mockToggle} />);
    
    const collapseButton = screen.getByRole('button', { name: /collapse configuration/i });
    fireEvent.click(collapseButton);
    
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  test('should show correct icon when sidebar is expanded', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={false} onToggleCollapse={mockToggle} />);
    
    const collapseButton = screen.getByRole('button', { name: /collapse configuration/i });
    const leftArrowIcon = collapseButton.querySelector('svg polyline[points="15 18 9 12 15 6"]');
    
    expect(leftArrowIcon).toBeInTheDocument();
  });

  test('should show correct icon when sidebar is collapsed', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={true} onToggleCollapse={mockToggle} />);
    
    const expandButton = screen.getByRole('button', { name: /expand configuration/i });
    const rightArrowIcon = expandButton.querySelector('svg polyline[points="9 18 15 12 9 6"]');
    
    expect(expandButton).toHaveClass('collapsed');
    expect(rightArrowIcon).toBeInTheDocument();
  });

  test('should apply correct CSS classes to sidebar when collapsed', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={true} onToggleCollapse={mockToggle} />);
    
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).toHaveClass('collapsed');
  });

  test('should apply correct CSS classes to sidebar when expanded', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={false} onToggleCollapse={mockToggle} />);
    
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).not.toHaveClass('collapsed');
  });

  test('should have correct accessibility attributes when expanded', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={false} onToggleCollapse={mockToggle} />);
    
    const collapseButton = screen.getByRole('button', { name: /collapse configuration/i });
    expect(collapseButton).toHaveAttribute('title', 'Collapse Configuration');
  });

  test('should have correct accessibility attributes when collapsed', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={true} onToggleCollapse={mockToggle} />);
    
    const expandButton = screen.getByRole('button', { name: /expand configuration/i });
    expect(expandButton).toHaveAttribute('title', 'Expand Configuration');
  });

  test('should show configuration content when expanded', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={false} onToggleCollapse={mockToggle} />);
    
    const configSections = document.querySelector('#config-sections');
    expect(configSections).not.toHaveClass('hidden');
    expect(screen.getByText('Configuration Content')).toBeInTheDocument();
  });

  test('should hide configuration content when collapsed', () => {
    const mockToggle = jest.fn();
    render(<TestCollapsibleSidebar isCollapsed={true} onToggleCollapse={mockToggle} />);
    
    const configSections = document.querySelector('#config-sections');
    expect(configSections).toHaveClass('hidden');
  });
}); 