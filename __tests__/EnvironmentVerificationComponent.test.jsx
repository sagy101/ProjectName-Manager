/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import EnvironmentVerification from '../src/components/EnvironmentVerification.jsx';
import VerificationIndicator from '../src/components/VerificationIndicator'; // Import the actual component

// Mock the VerificationIndicator to check its props
jest.mock('../src/components/VerificationIndicator', () => jest.fn(() => null));

// Mock window.electron for IPC calls
global.window = { // Use global.window for jsdom environment
  electron: {
    refreshEnvironmentVerification: jest.fn().mockResolvedValue({}),
    // Add other electron functions if needed by the component under test
  },
};


describe('EnvironmentVerification component', () => {
  beforeEach(() => {
    // Clear mock call history before each test
    VerificationIndicator.mockClear();
    window.electron.refreshEnvironmentVerification.mockClear();
  });

  const baseProps = {
    statusMap: { v1: 'valid', v2withFix: 'invalid' },
    verificationConfig: [
      {
        category: {
          title: 'Category 1',
          verifications: [
            { id: 'v1', title: 'Verification 1 (Valid)' },
            { id: 'v2withFix', title: 'Verification 2 (Invalid with Fix)', fixCommand: 'do-fix-it' }
          ]
        }
      }
    ],
    headerConfig: { title: 'Environment Checks' },
    globalDropdownValues: {},
    onGlobalDropdownChange: jest.fn(),
    onInitiateRefresh: jest.fn()
  };

  test('calls refresh function when button clicked', async () => {
    const { getByTitle } = render(<EnvironmentVerification {...baseProps} />);
    fireEvent.click(getByTitle('Refresh environment verification'));
    expect(baseProps.onInitiateRefresh).toHaveBeenCalled();
    // await Promise.resolve(); // Not strictly necessary if mockResolvedValue is used
    expect(window.electron.refreshEnvironmentVerification).toHaveBeenCalled();
  });

  test('toggles expanded state and renders verification indicators', () => {
    const { getByText, queryByText } = render(<EnvironmentVerification {...baseProps} />);
    const headerLeft = getByText(baseProps.headerConfig.title).parentElement; // Use dynamic title

    // Initially collapsed, so V1 and V2 should not be directly visible by label (depends on how VI renders children)
    // Let's expand it
    fireEvent.click(headerLeft);

    // Check if VerificationIndicator was called for v1
    expect(VerificationIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Verification 1 (Valid)',
        status: 'valid',
        verificationId: 'v1',
        sectionId: 'general'
        // fixCommand will be undefined here, which is correct
      }),
      expect.anything() // Second argument to React components is context/ref, usually {} or undefined in tests
    );

    // Check if VerificationIndicator was called for v2withFix
    expect(VerificationIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Verification 2 (Invalid with Fix)',
        status: 'invalid',
        fixCommand: 'do-fix-it',
        verificationId: 'v2withFix',
        sectionId: 'general'
      }),
      expect.anything()
    );

    // Collapse it again
    fireEvent.click(headerLeft);
    // Could add assertions here that indicators are no longer rendered if they unmount,
    // but checking props passed is the primary goal.
  });

  test('passes correct props to VerificationIndicator, including fixCommand', () => {
    render(<EnvironmentVerification {...baseProps} />);
    // Expand to render indicators
    const headerLeft = getByText(baseProps.headerConfig.title).parentElement;
    fireEvent.click(headerLeft);

    // Verification 1 (no fix command)
    expect(VerificationIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Verification 1 (Valid)',
        status: 'valid',
        verificationId: 'v1',
        sectionId: 'general',
        fixCommand: undefined, // Explicitly check that fixCommand is undefined
      }),
      expect.anything()
    );

    // Verification 2 (with fix command)
    expect(VerificationIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Verification 2 (Invalid with Fix)',
        status: 'invalid',
        fixCommand: 'do-fix-it',
        verificationId: 'v2withFix',
        sectionId: 'general',
      }),
      expect.anything()
    );
  });
});
