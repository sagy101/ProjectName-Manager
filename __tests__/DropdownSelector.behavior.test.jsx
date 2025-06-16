/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import DropdownSelector from '../src/components/DropdownSelector.jsx';

beforeEach(() => {
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  window.electron = { getDropdownOptions: jest.fn() };
});

afterEach(() => {
  delete window.electron;
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
