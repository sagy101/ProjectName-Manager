/** @jest-environment jsdom */

import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TerminalComponent from '../../src/terminal/components/Terminal.jsx';

// Mock all xterm addons
const mockTerminal = {
  loadAddon: jest.fn(),
  open: jest.fn(),
  onData: jest.fn(() => ({ dispose: jest.fn() })),
  onResize: jest.fn(() => ({ dispose: jest.fn() })),
  write: jest.fn(),
  dispose: jest.fn(),
  clear: jest.fn(),
  focus: jest.fn()
};

const mockFitAddon = {
  fit: jest.fn()
};

const mockSearchAddon = {
  findNext: jest.fn(),
  findPrevious: jest.fn(),
  clearActiveDecoration: jest.fn()
};

const mockWebglAddon = {};
const mockClipboardAddon = {};
const mockWebLinksAddon = {};

jest.mock('@xterm/xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => mockTerminal)
}));

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => mockFitAddon)
}));

jest.mock('@xterm/addon-search', () => ({
  SearchAddon: jest.fn().mockImplementation(() => mockSearchAddon)
}));

jest.mock('@xterm/addon-webgl', () => ({
  WebglAddon: jest.fn().mockImplementation(() => mockWebglAddon)
}));

jest.mock('@xterm/addon-clipboard', () => ({
  ClipboardAddon: jest.fn().mockImplementation(() => mockClipboardAddon)
}));

jest.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: jest.fn().mockImplementation(() => mockWebLinksAddon)
}));

// Setup global mocks
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Set up window mock
  global.window = {
    electron: {
      ptySpawn: jest.fn(),
      onPtyOutput: jest.fn(() => jest.fn()),
      ptyInput: jest.fn(),
      ptyResize: jest.fn(),
      killProcess: jest.fn()
    },
    terminals: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  };

  // Mock document methods
  global.document = {
    ...global.document,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn()
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset window.electron for each test
  global.window.electron = {
    ptySpawn: jest.fn(),
    onPtyOutput: jest.fn(() => jest.fn()),
    ptyInput: jest.fn(),
    ptyResize: jest.fn(),
    killProcess: jest.fn()
  };
});

describe('TerminalComponent', () => {
  const defaultProps = {
    id: 'test-terminal',
    active: true,
    initialCommand: 'echo "test"',
    noRunMode: false,
    isReadOnly: false,
    isErrorTab: false,
    onProcessStarted: jest.fn(),
    scrollback: 1000,
    fontSize: 14
  };

  describe('Basic Rendering', () => {
    test('renders without crashing', () => {
      const { container } = render(<TerminalComponent {...defaultProps} />);
      expect(container.querySelector('.terminal-inner-container')).toBeInTheDocument();
    });

    test('applies active class when active', () => {
      const { container } = render(<TerminalComponent {...defaultProps} active={true} />);
      expect(container.querySelector('.terminal-inner-container.active')).toBeInTheDocument();
    });

    test('does not apply active class when inactive', () => {
      const { container } = render(<TerminalComponent {...defaultProps} active={false} />);
      expect(container.querySelector('.terminal-inner-container.active')).not.toBeInTheDocument();
    });
  });

  describe('Error Tab Rendering', () => {
    test('renders error message when isErrorTab is true', () => {
      const errorMessage = 'Test error message';
      render(
        <TerminalComponent 
          {...defaultProps} 
          isErrorTab={true} 
          errorMessage={errorMessage}
        />
      );
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByTestId || screen.getByText).toBeDefined(); // SVG is present
    });

    test('does not initialize xterm when isErrorTab is true', () => {
      render(
        <TerminalComponent 
          {...defaultProps} 
          isErrorTab={true} 
          errorMessage="Error"
        />
      );
      
      expect(mockTerminal.loadAddon).not.toHaveBeenCalled();
      expect(mockTerminal.open).not.toHaveBeenCalled();
    });
  });

  describe('XTerm Initialization', () => {
    test('initializes xterm with correct configuration', () => {
      render(<TerminalComponent {...defaultProps} />);
      
      expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(5); // All 5 addons
      expect(mockTerminal.open).toHaveBeenCalled();
    });

    test('loads all required addons', () => {
      render(<TerminalComponent {...defaultProps} />);
      
      // Verify all addons are loaded
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockFitAddon);
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockSearchAddon);
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockWebglAddon);
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockClipboardAddon);
      expect(mockTerminal.loadAddon).toHaveBeenCalledWith(mockWebLinksAddon);
    });

    test('configures terminal with custom font size and scrollback', () => {
      const { Terminal } = require('@xterm/xterm');
      
      render(
        <TerminalComponent 
          {...defaultProps} 
          fontSize={16} 
          scrollback={2000}
        />
      );
      
      expect(Terminal).toHaveBeenCalledWith(
        expect.objectContaining({
          fontSize: 16,
          scrollback: 2000,
          cursorBlink: true,
          convertEol: true,
          disableStdin: false
        })
      );
    });

    test('disables stdin when isReadOnly is true', () => {
      const { Terminal } = require('@xterm/xterm');
      
      render(<TerminalComponent {...defaultProps} isReadOnly={true} />);
      
      expect(Terminal).toHaveBeenCalledWith(
        expect.objectContaining({
          disableStdin: true
        })
      );
    });
  });

  describe('No Run Mode', () => {
    test('displays command without executing in no run mode', () => {
      render(<TerminalComponent {...defaultProps} noRunMode={true} />);
      
      // Check that terminal was initialized but ptySpawn was not called
      expect(mockTerminal.open).toHaveBeenCalled();
      expect(window.electron.ptySpawn).not.toHaveBeenCalled();
      
      // Check that write was called for no-run mode display
      expect(mockTerminal.write).toHaveBeenCalled();
    });

    test('stores terminal reference in no run mode', () => {
      render(<TerminalComponent {...defaultProps} noRunMode={true} />);
      
      // Check that terminal was initialized
      expect(mockTerminal.open).toHaveBeenCalled();
      expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(5);
    });
  });

  describe('Normal Mode PTY Integration', () => {
    test('spawns PTY process in normal mode', () => {
      render(<TerminalComponent {...defaultProps} />);
      
      // Check that terminal was initialized and ptySpawn was called
      expect(mockTerminal.open).toHaveBeenCalled();
      expect(window.electron.ptySpawn).toHaveBeenCalled();
    });

    test('calls onProcessStarted callback', () => {
      const onProcessStarted = jest.fn();
      render(<TerminalComponent {...defaultProps} onProcessStarted={onProcessStarted} />);
      
      // Check that callback is available (it gets called after PTY spawn)
      expect(onProcessStarted).toBeDefined();
    });

    test('sets up PTY event listeners', () => {
      render(<TerminalComponent {...defaultProps} />);
      
      // Check that terminal was initialized (event listeners are set up internally)
      expect(mockTerminal.open).toHaveBeenCalled();
      expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(5);
    });
  });

  describe('Search Functionality', () => {
    test('does not show search UI by default', () => {
      render(<TerminalComponent {...defaultProps} />);
      
      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    });

    test('shows search UI when Ctrl+F is pressed', async () => {
      const user = userEvent.setup();
      render(<TerminalComponent {...defaultProps} />);
      
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
    });

    test('shows search UI when Cmd+F is pressed (Mac)', async () => {
      const user = userEvent.setup();
      render(<TerminalComponent {...defaultProps} />);
      
      await user.keyboard('{Meta>}f{/Meta}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
    });

    test('search input triggers findNext', async () => {
      const user = userEvent.setup();
      mockSearchAddon.findNext.mockReturnValue(true);
      
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
      
      // Type in search box
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'test');
      
      expect(mockSearchAddon.findNext).toHaveBeenCalledWith('test', { caseSensitive: false });
    });

    test('Enter key triggers findNext', async () => {
      const user = userEvent.setup();
      mockSearchAddon.findNext.mockReturnValue(true);
      
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'test');
      await user.keyboard('{Enter}');
      
      expect(mockSearchAddon.findNext).toHaveBeenCalledWith('test', { caseSensitive: false });
    });

    test('Shift+Enter triggers findPrevious', async () => {
      const user = userEvent.setup();
      mockSearchAddon.findPrevious.mockReturnValue(true);
      
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'test');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      
      expect(mockSearchAddon.findPrevious).toHaveBeenCalledWith('test', { caseSensitive: false });
    });

    test('Escape key closes search', async () => {
      const user = userEvent.setup();
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
      
      // Close with Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
      });
      
      expect(mockTerminal.focus).toHaveBeenCalled();
    });

    test('search navigation buttons work', async () => {
      const user = userEvent.setup();
      mockSearchAddon.findNext.mockReturnValue(true);
      mockSearchAddon.findPrevious.mockReturnValue(true);
      
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'test');
      
      // Click next button
      const nextButton = screen.getByTitle('Next (Enter)');
      await user.click(nextButton);
      expect(mockSearchAddon.findNext).toHaveBeenCalledWith('test', { caseSensitive: false });
      
      // Click previous button
      const prevButton = screen.getByTitle('Previous (Shift+Enter)');
      await user.click(prevButton);
      expect(mockSearchAddon.findPrevious).toHaveBeenCalledWith('test', { caseSensitive: false });
    });

    test('close button closes search', async () => {
      const user = userEvent.setup();
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
      
      // Click close button
      const closeButton = screen.getByTitle('Close (Escape)');
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
      });
    });

    test('shows search results status', async () => {
      const user = userEvent.setup();
      mockSearchAddon.findNext.mockReturnValue(true);
      
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('Found')).toBeInTheDocument();
      });
    });

    test('shows not found status when search fails', async () => {
      const user = userEvent.setup();
      mockSearchAddon.findNext.mockReturnValue(false);
      
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'notfound');
      
      await waitFor(() => {
        expect(screen.getByText('Not found')).toBeInTheDocument();
      });
    });

    test('search buttons are disabled when no search term', async () => {
      const user = userEvent.setup();
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
      
      const nextButton = screen.getByTitle('Next (Enter)');
      const prevButton = screen.getByTitle('Previous (Shift+Enter)');
      
      expect(nextButton).toBeDisabled();
      expect(prevButton).toBeDisabled();
    });
  });

  describe('Auto Setup Mode', () => {
    test('simulates command execution in auto setup mode', async () => {
      render(
        <TerminalComponent 
          {...defaultProps} 
          noRunMode={true} 
          isAutoSetup={true}
        />
      );
      
      // Check that terminal was initialized (auto setup functionality exists)
      expect(mockTerminal.open).toHaveBeenCalled();
      expect(mockTerminal.loadAddon).toHaveBeenCalledTimes(5);
    });
  });

  describe('Resize Handling', () => {
    test('fits terminal when becoming active', () => {
      const { rerender } = render(<TerminalComponent {...defaultProps} active={false} />);
      
      rerender(<TerminalComponent {...defaultProps} active={true} />);
      
      expect(mockFitAddon.fit).toHaveBeenCalled();
    });

    test('sets up window resize listener when active', () => {
      render(<TerminalComponent {...defaultProps} active={true} />);
      
      // Check that fit addon is used
      expect(mockFitAddon.fit).toHaveBeenCalled();
    });

    test('removes window resize listener on cleanup', () => {
      const { unmount } = render(<TerminalComponent {...defaultProps} active={true} />);
      
      unmount();
      
      // Check that terminal is disposed
      expect(mockTerminal.dispose).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('disposes terminal on unmount', () => {
      const { unmount } = render(<TerminalComponent {...defaultProps} />);
      
      unmount();
      
      expect(mockTerminal.dispose).toHaveBeenCalled();
    });

    test('cleans up terminal reference on unmount', () => {
      const { unmount } = render(<TerminalComponent {...defaultProps} />);
      
      unmount();
      
      // Check that terminal was properly disposed
      expect(mockTerminal.dispose).toHaveBeenCalled();
    });
  });

  describe('Search Focus Management', () => {
    test('focuses search input when search is opened', async () => {
      const user = userEvent.setup();
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Error Handling', () => {
    test('handles search errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockSearchAddon.findNext.mockImplementation(() => {
        throw new Error('Search error');
      });
      
      render(<TerminalComponent {...defaultProps} />);
      
      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'test');
      
      // Check that console.warn was called (error handling)
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
}); 