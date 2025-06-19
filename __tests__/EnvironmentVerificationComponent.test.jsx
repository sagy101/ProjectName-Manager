/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import EnvironmentVerification from '../src/environment-verification/EnvironmentVerification.jsx';

window.electron = {
  refreshEnvironmentVerification: jest.fn().mockResolvedValue({}),
};

describe('EnvironmentVerification component', () => {
  const baseProps = {
    statusMap: { v1: 'valid' },
    verificationConfig: [
      { category: { title: 'Cat', verifications: [{ id: 'v1', title: 'V1' }] } }
    ],
    headerConfig: { title: 'Env' },
    globalDropdownValues: {},
    onGlobalDropdownChange: jest.fn(),
    onInitiateRefresh: jest.fn()
  };

  test('calls refresh function when button clicked', async () => {
    const { getByTitle } = render(<EnvironmentVerification {...baseProps} />);
    fireEvent.click(getByTitle('Refresh environment verification'));
    expect(baseProps.onInitiateRefresh).toHaveBeenCalled();
    await Promise.resolve();
    expect(window.electron.refreshEnvironmentVerification).toHaveBeenCalled();
  });

  test('toggles expanded state', () => {
    const { getByText, queryByText } = render(<EnvironmentVerification {...baseProps} />);
    const headerLeft = getByText('Env').parentElement;
    fireEvent.click(headerLeft);
    expect(queryByText('V1')).toBeInTheDocument();
    fireEvent.click(headerLeft);
    expect(queryByText('V1')).not.toBeInTheDocument();
  });
});
