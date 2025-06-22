/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GitBranchSwitcher from '../../src/project-config/GitBranchSwitcher';

// Mock window.electron
const mockElectron = {
  gitListLocalBranches: jest.fn(),
  gitCheckoutBranch: jest.fn()
};

// Properly mock window.electron
Object.defineProperty(window, 'electron', {
  writable: true,
  value: mockElectron
});

describe('GitBranchSwitcher', () => {
  const defaultProps = {
    projectPath: '/test/project',
    currentBranch: 'main',
    onBranchChangeSuccess: jest.fn(),
    onBranchChangeError: jest.fn(),
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockElectron.gitListLocalBranches.mockResolvedValue({
      success: true,
      branches: ['main', 'develop', 'feature/test', 'hotfix/urgent']
    });
    mockElectron.gitCheckoutBranch.mockResolvedValue({ success: true });
  });

  test('renders with current branch displayed', () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByTitle('Current branch: main. Click to switch.')).toBeInTheDocument();
  });

  test('opens dropdown when display button is clicked', async () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByText('Switch branches/tags')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Find or checkout a branch...')).toBeInTheDocument();
    });

    expect(mockElectron.gitListLocalBranches).toHaveBeenCalledWith('/test/project');
  });

  test('displays loading state while fetching branches', async () => {
    // Mock delayed response
    mockElectron.gitListLocalBranches.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, branches: [] }), 100))
    );

    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByText('Loading branches...')).toBeInTheDocument();
    });
  });

  test('displays branch list after successful fetch', async () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(mockElectron.gitListLocalBranches).toHaveBeenCalledWith('/test/project');
    });

    // Wait for branches to be displayed
    await waitFor(() => {
      expect(screen.getByText('develop')).toBeInTheDocument();
      expect(screen.getByText('feature/test')).toBeInTheDocument();
      expect(screen.getByText('hotfix/urgent')).toBeInTheDocument();
    });
  });

  test('filters branches based on search term', async () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Find or checkout a branch...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Find or checkout a branch...');
    fireEvent.change(searchInput, { target: { value: 'feature' } });

    await waitFor(() => {
      expect(screen.getByText('feature/test')).toBeInTheDocument();
      // Check that other branches are not in the list (excluding the display button)
      expect(document.querySelector('.branch-list')).not.toHaveTextContent('develop');
      expect(document.querySelector('.branch-list')).not.toHaveTextContent('hotfix/urgent');
    });
  });

  test('selects and checks out a different branch', async () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByText('develop')).toBeInTheDocument();
    });

    const developBranch = screen.getByText('develop');
    fireEvent.click(developBranch);

    await waitFor(() => {
      expect(mockElectron.gitCheckoutBranch).toHaveBeenCalledWith('/test/project', 'develop');
      expect(defaultProps.onBranchChangeSuccess).toHaveBeenCalled();
    });
  });

  test('does not checkout if same branch is selected', async () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByText('develop')).toBeInTheDocument();
    });

    // Click on the main branch in the dropdown list (not the display button)
    const mainBranchInList = document.querySelector('li[title="main"]');
    fireEvent.click(mainBranchInList);

    // Should not call checkout for same branch
    expect(mockElectron.gitCheckoutBranch).not.toHaveBeenCalled();
  });

  test('handles search input Enter key press for checkout', async () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Find or checkout a branch...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Find or checkout a branch...');
    fireEvent.change(searchInput, { target: { value: 'new-branch' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockElectron.gitCheckoutBranch).toHaveBeenCalledWith('/test/project', 'new-branch');
    });
  });

  test('displays error when branch listing fails', async () => {
    mockElectron.gitListLocalBranches.mockResolvedValue({
      success: false,
      error: 'Repository not found'
    });

    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    // Wait for API call to complete first
    await waitFor(() => {
      expect(mockElectron.gitListLocalBranches).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Repository not found')).toBeInTheDocument();
    });
  });

  test('calls error callback when checkout fails', async () => {
    mockElectron.gitCheckoutBranch.mockResolvedValue({
      success: false,
      error: 'Branch does not exist'
    });

    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByText('develop')).toBeInTheDocument();
    });

    const developBranch = document.querySelector('li[title="develop"]');
    fireEvent.click(developBranch);

    // Wait for checkout to be called and error callback to be triggered
    await waitFor(() => {
      expect(mockElectron.gitCheckoutBranch).toHaveBeenCalledWith('/test/project', 'develop');
      expect(defaultProps.onBranchChangeError).toHaveBeenCalledWith(
        'Branch switch failed: Branch does not exist',
        'error'
      );
    });
  });

  test('is disabled when disabled prop is true', () => {
    render(<GitBranchSwitcher {...defaultProps} disabled={true} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    expect(displayButton).toBeDisabled();
  });

  test('closes dropdown when close button is clicked', async () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByText('Switch branches/tags')).toBeInTheDocument();
    });

    const closeButton = document.querySelector('.close-button'); // More specific selector
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Switch branches/tags')).not.toBeInTheDocument();
    });
  });

  test('closes dropdown when clicking outside', async () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByText('Switch branches/tags')).toBeInTheDocument();
    });

    // Click outside the component
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Switch branches/tags')).not.toBeInTheDocument();
    });
  });

  test('shows loading state during checkout', async () => {
    // Mock delayed checkout response
    mockElectron.gitCheckoutBranch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByText('develop')).toBeInTheDocument();
    });

    const developBranch = screen.getByText('develop');
    fireEvent.click(developBranch);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Switching...')).toBeInTheDocument();
    });
  });

  test('shows no results message when no branches match search', async () => {
    render(<GitBranchSwitcher {...defaultProps} />);
    
    const displayButton = screen.getByTitle('Current branch: main. Click to switch.');
    fireEvent.click(displayButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Find or checkout a branch...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Find or checkout a branch...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('Not a local branch. Press Enter to checkout from remote.')).toBeInTheDocument();
    });
  });
}); 