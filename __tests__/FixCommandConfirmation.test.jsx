/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import FixCommandConfirmation from '../src/project-config/FixCommandConfirmation.jsx';

describe('FixCommandConfirmation Component', () => {
  const verification = { id: 'test', title: 'Test', fixCommand: 'echo hello' };

  it('renders command and handles confirm/cancel', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByText } = render(
      <FixCommandConfirmation verification={verification} onConfirm={onConfirm} onCancel={onCancel} />
    );

    expect(getByText('Command:')).toBeInTheDocument();
    expect(getByText('echo hello')).toBeInTheDocument();

    fireEvent.click(getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalled();

    fireEvent.click(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('returns null when no verification provided', () => {
    const { container } = render(
      <FixCommandConfirmation verification={null} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });
});
