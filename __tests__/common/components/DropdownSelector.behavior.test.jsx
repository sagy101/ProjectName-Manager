/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import DropdownSelector from '../../../src/common/components/DropdownSelector.jsx';

beforeEach(() => {
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  window.electron = { getDropdownOptions: jest.fn() };
});

afterEach(() => {
  delete window.electron;
  jest.clearAllMocks();
});

test('auto selects default matching value from fetched options', async () => {
  const onChange = jest.fn();
  window.electron.getDropdownOptions.mockResolvedValue({ options: ['foo', 'bar'] });
  const { getByText } = render(
    <DropdownSelector id="d" command="cmd" onChange={onChange} defaultValue={{ contains: 'bar' }} value={null} />
  );
  await waitFor(() => expect(getByText('bar')).toBeInTheDocument());
  expect(onChange).toHaveBeenCalledWith('bar');
});

test('does not fetch when dependency missing', async () => {
  window.electron.getDropdownOptions.mockResolvedValue({ options: ['x'] });
  const { findByText } = render(
    <DropdownSelector id="d" command="cmd" dependsOn="dep" dependencyValue={null} onChange={() => {}} />
  );
  await findByText('Select dep first');
  expect(window.electron.getDropdownOptions).not.toHaveBeenCalled();
});

test('filters options using search input', async () => {
  window.electron.getDropdownOptions.mockResolvedValue({ options: ['apple', 'banana', 'cherry'] });
  const { getByText, getByPlaceholderText, queryByText } = render(
    <DropdownSelector id="d" command="cmd" onChange={() => {}} value={null} />
  );
  await waitFor(() => expect(getByText('apple')).toBeInTheDocument());
  fireEvent.click(getByText('apple')); // open dropdown
  const input = getByPlaceholderText('Search...');
  fireEvent.change(input, { target: { value: 'ch' } });
  expect(queryByText('banana')).toBeNull();
  expect(getByText('cherry')).toBeInTheDocument();
});

test('displays error text when backend returns error', async () => {
  window.electron.getDropdownOptions.mockResolvedValue({ error: 'oops' });
  const { findByText } = render(
    <DropdownSelector id="d" command="cmd" onChange={() => {}} value={null} />
  );
  await findByText('Error loading options');
});

// New tests for refresh button functionality
describe('Refresh Button', () => {
  test('renders refresh button when dropdown is open', async () => {
    window.electron.getDropdownOptions.mockResolvedValue({ options: ['option1', 'option2'] });
    const { getByText, getByLabelText } = render(
      <DropdownSelector id="d" command="cmd" onChange={() => {}} value={null} />
    );
    
    // Wait for initial load
    await waitFor(() => expect(getByText('option1')).toBeInTheDocument());
    
    // Open dropdown
    fireEvent.click(getByText('option1'));
    
    // Check refresh button is present
    const refreshButton = getByLabelText('Refresh dropdown options');
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).toHaveTextContent('↻');
  });

  test('refresh button calls getDropdownOptions with forceRefresh flag', async () => {
    window.electron.getDropdownOptions
      .mockResolvedValueOnce({ options: ['option1', 'option2'] })
      .mockResolvedValueOnce({ options: ['refreshed1', 'refreshed2'] });
    
    const { getByText, getByLabelText } = render(
      <DropdownSelector id="test" command="test-cmd" onChange={() => {}} value={null} />
    );
    
    // Wait for initial load
    await waitFor(() => expect(getByText('option1')).toBeInTheDocument());
    
    // Open dropdown and click refresh
    fireEvent.click(getByText('option1'));
    const refreshButton = getByLabelText('Refresh dropdown options');
    fireEvent.click(refreshButton);
    
    // Verify API was called with forceRefresh
    await waitFor(() => {
      expect(window.electron.getDropdownOptions).toHaveBeenCalledTimes(2);
      expect(window.electron.getDropdownOptions).toHaveBeenLastCalledWith({
        id: 'test',
        command: 'test-cmd',
        args: {},
        parseResponse: undefined,
        forceRefresh: true
      });
    });
  });

  test('shows loading state on refresh button while refreshing', async () => {
    let resolveRefresh;
    const refreshPromise = new Promise(resolve => { resolveRefresh = resolve; });
    
    window.electron.getDropdownOptions
      .mockResolvedValueOnce({ options: ['option1'] })
      .mockReturnValueOnce(refreshPromise);
    
    const { getByText, getByLabelText } = render(
      <DropdownSelector id="d" command="cmd" onChange={() => {}} value={null} />
    );
    
    // Wait for initial load and open dropdown
    await waitFor(() => expect(getByText('option1')).toBeInTheDocument());
    fireEvent.click(getByText('option1'));
    
    // Click refresh
    const refreshButton = getByLabelText('Refresh dropdown options');
    fireEvent.click(refreshButton);
    
    // Check loading state
    expect(refreshButton).toHaveTextContent('↻');
    expect(refreshButton).toHaveClass('loading');
    expect(refreshButton).toBeDisabled();
    
    // Resolve refresh
    resolveRefresh({ options: ['refreshed'] });
    await waitFor(() => {
      expect(refreshButton).toHaveTextContent('↻');
      expect(refreshButton).not.toHaveClass('loading');
      expect(refreshButton).not.toBeDisabled();
    });
  });

  test('refresh clears search term and shows all options', async () => {
    window.electron.getDropdownOptions
      .mockResolvedValueOnce({ options: ['apple', 'banana', 'cherry'] })
      .mockResolvedValueOnce({ options: ['apple', 'banana', 'cherry', 'date'] });
    
    const { getByPlaceholderText, getByLabelText } = render(
      <DropdownSelector id="d" command="cmd" onChange={() => {}} value={null} />
    );
    
    // Wait for initial load
    await waitFor(() => {
      const selectedValue = document.querySelector('.selected-value span');
      expect(selectedValue).toHaveTextContent('apple');
    });
    
    // Click on the selected value to open dropdown
    const selectedValue = document.querySelector('.selected-value');
    fireEvent.click(selectedValue);
    
    // Wait for dropdown to open and verify initial options
    await waitFor(() => {
      const dropdownItems = document.querySelectorAll('.dropdown-item:not(.disabled)');
      expect(dropdownItems).toHaveLength(3);
    });
    
    // Filter options with search
    const searchInput = getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'ch' } });
    
    // Check that filtered results are correct (only cherry should be visible in dropdown)
    const dropdownItems = document.querySelectorAll('.dropdown-item:not(.disabled)');
    expect(dropdownItems).toHaveLength(1);
    expect(dropdownItems[0]).toHaveTextContent('cherry');
    
    // Click refresh
    const refreshButton = getByLabelText('Refresh dropdown options');
    fireEvent.click(refreshButton);
    
    // Wait for refresh to complete
    await waitFor(() => {
      const allItems = document.querySelectorAll('.dropdown-item:not(.disabled)');
      expect(allItems).toHaveLength(4);
    });
    
    // Check that search term was cleared and all options are visible
    expect(searchInput.value).toBe('');
    const allItems = document.querySelectorAll('.dropdown-item:not(.disabled)');
    expect(allItems).toHaveLength(4);
    expect(allItems[0]).toHaveTextContent('apple');
    expect(allItems[1]).toHaveTextContent('banana');
    expect(allItems[2]).toHaveTextContent('cherry');
    expect(allItems[3]).toHaveTextContent('date');
  });

  test('refresh button is disabled during initial loading', async () => {
    let resolveInitial;
    const initialPromise = new Promise(resolve => { resolveInitial = resolve; });
    
    window.electron.getDropdownOptions.mockReturnValue(initialPromise);
    
    const { getByText, queryByLabelText } = render(
      <DropdownSelector id="d" command="cmd" onChange={() => {}} value={null} />
    );
    
    // Wait for loading state
    await waitFor(() => expect(getByText('Loading...')).toBeInTheDocument());
    
    // Try to open dropdown during loading (this should not work)
    fireEvent.click(getByText('Loading...'));
    
    // Refresh button should not be present since dropdown can't open during loading
    expect(queryByLabelText('Refresh dropdown options')).toBeNull();
    
    // Complete initial load
    resolveInitial({ options: ['option1'] });
    
    // Wait for loading to complete and open dropdown
    await waitFor(() => expect(getByText('option1')).toBeInTheDocument());
    fireEvent.click(getByText('option1'));
    
    // Now refresh button should be available and enabled
    const refreshButton = queryByLabelText('Refresh dropdown options');
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  test('maintains existing options on refresh error', async () => {
    window.electron.getDropdownOptions
      .mockResolvedValueOnce({ options: ['option1', 'option2'] })
      .mockResolvedValueOnce({ error: 'Network error' });
    
    const { getByLabelText } = render(
      <DropdownSelector id="d" command="cmd" onChange={() => {}} value={null} />
    );
    
    // Wait for initial load
    await waitFor(() => {
      const selectedValue = document.querySelector('.selected-value span');
      expect(selectedValue).toHaveTextContent('option1');
    });
    
    // Click on the selected value to open dropdown
    const selectedValue = document.querySelector('.selected-value');
    fireEvent.click(selectedValue);
    
    // Wait for dropdown to open and verify initial options
    await waitFor(() => {
      const dropdownItems = document.querySelectorAll('.dropdown-item:not(.disabled)');
      expect(dropdownItems).toHaveLength(2);
    });
    
    // Click refresh
    const refreshButton = getByLabelText('Refresh dropdown options');
    fireEvent.click(refreshButton);
    
    // Wait for refresh to complete and verify options are maintained despite error
    await waitFor(() => {
      // The refresh should complete (isRefreshing becomes false)
      expect(refreshButton).not.toHaveClass('loading');
    });
    
    // Verify options are still there
    const dropdownItems = document.querySelectorAll('.dropdown-item:not(.disabled)');
    expect(dropdownItems).toHaveLength(2);
    expect(dropdownItems[0]).toHaveTextContent('option1');
    expect(dropdownItems[1]).toHaveTextContent('option2');
  });

  test('refresh button respects dependency constraints', async () => {
    window.electron.getDropdownOptions.mockResolvedValue({ options: ['option1'] });
    
    const { getByText, queryByLabelText } = render(
      <DropdownSelector 
        id="d" 
        command="cmd" 
        onChange={() => {}} 
        value={null}
        dependsOn="parent"
        dependencyValue={null}
      />
    );
    
    // Should show dependency message and not allow opening
    await waitFor(() => expect(getByText('Select parent first')).toBeInTheDocument());
    
    // Try to open dropdown (should not work)
    fireEvent.click(getByText('Select parent first'));
    
    // Refresh button should not be present
    expect(queryByLabelText('Refresh dropdown options')).toBeNull();
  });

  test('refresh button works with command arguments', async () => {
    const commandArgs = { arg1: 'value1', arg2: 'value2' };
    
    window.electron.getDropdownOptions
      .mockResolvedValueOnce({ options: ['initial'] })
      .mockResolvedValueOnce({ options: ['refreshed'] });
    
    const { getByText, getByLabelText } = render(
      <DropdownSelector 
        id="test" 
        command="test-cmd" 
        commandArgs={commandArgs}
        onChange={() => {}} 
        value={null}
      />
    );
    
    // Wait for initial load and open dropdown
    await waitFor(() => expect(getByText('initial')).toBeInTheDocument());
    fireEvent.click(getByText('initial'));
    
    // Click refresh
    const refreshButton = getByLabelText('Refresh dropdown options');
    fireEvent.click(refreshButton);
    
    // Verify refresh call includes command arguments
    await waitFor(() => {
      expect(window.electron.getDropdownOptions).toHaveBeenLastCalledWith({
        id: 'test',
        command: 'test-cmd',
        args: commandArgs,
        parseResponse: undefined,
        forceRefresh: true
      });
    });
  });

  test('refresh button click does not close dropdown', async () => {
    window.electron.getDropdownOptions
      .mockResolvedValueOnce({ options: ['option1'] })
      .mockResolvedValueOnce({ options: ['refreshed'] });
    
    const { getByText, getByLabelText, getByPlaceholderText } = render(
      <DropdownSelector id="d" command="cmd" onChange={() => {}} value={null} />
    );
    
    // Wait for initial load and open dropdown
    await waitFor(() => expect(getByText('option1')).toBeInTheDocument());
    fireEvent.click(getByText('option1'));
    
    // Verify dropdown is open (search input should be visible)
    expect(getByPlaceholderText('Search...')).toBeInTheDocument();
    
    // Click refresh
    const refreshButton = getByLabelText('Refresh dropdown options');
    fireEvent.click(refreshButton);
    
    // Wait for refresh to complete
    await waitFor(() => expect(getByText('refreshed')).toBeInTheDocument());
    
    // Verify dropdown is still open
    expect(getByPlaceholderText('Search...')).toBeInTheDocument();
  });
});
