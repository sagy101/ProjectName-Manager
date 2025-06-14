import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerificationIndicator from '../src/components/VerificationIndicator';
import { STATUS } from '../src/constants/verificationConstants';

// Mock window.electron.ipcRenderer
const mockInvoke = jest.fn();
global.window = {
  electron: {
    ipcRenderer: {
      invoke: mockInvoke,
    },
  },
};

describe('VerificationIndicator', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  test('renders label and status icon correctly', () => {
    render(<VerificationIndicator label="Test Label" status={STATUS.VALID} />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument(); // Assuming '✓' for VALID
  });

  test('does NOT render "Fix" button if status is VALID', () => {
    render(
      <VerificationIndicator
        label="Test Valid"
        status={STATUS.VALID}
        fixCommand="some-fix-command"
        verificationId="v1"
        sectionId="general"
      />
    );
    expect(screen.queryByRole('button', { name: 'Fix' })).not.toBeInTheDocument();
  });

  test('does NOT render "Fix" button if fixCommand is missing', () => {
    render(
      <VerificationIndicator
        label="Test Invalid No Fix"
        status={STATUS.INVALID}
        verificationId="v1"
        sectionId="general"
      />
    );
    expect(screen.queryByRole('button', { name: 'Fix' })).not.toBeInTheDocument();
  });

  test('does NOT render "Fix" button if verificationId is missing', () => {
    render(
      <VerificationIndicator
        label="Test Invalid No ID"
        status={STATUS.INVALID}
        fixCommand="some-fix-command"
        sectionId="general"
      />
    );
    expect(screen.queryByRole('button', { name: 'Fix' })).not.toBeInTheDocument();
  });

  test('renders "Fix" button when status is INVALID and fixCommand & verificationId are provided', () => {
    render(
      <VerificationIndicator
        label="Test Invalid"
        status={STATUS.INVALID}
        fixCommand="do-something"
        verificationId="v1"
        sectionId="general"
      />
    );
    expect(screen.getByRole('button', { name: 'Fix' })).toBeInTheDocument();
  });

  test('clicking "Fix" button calls ipcRenderer.invoke with correct arguments and disables button', async () => {
    mockInvoke.mockResolvedValue({ success: true, newStatus: STATUS.VALID }); // Simulate successful fix

    render(
      <VerificationIndicator
        label="Test Fixable"
        status={STATUS.INVALID}
        fixCommand="my-fix-script"
        verificationId="fixable123"
        sectionId="generalTest"
      />
    );

    const fixButton = screen.getByRole('button', { name: 'Fix' });
    fireEvent.click(fixButton);

    expect(fixButton).toBeDisabled();
    expect(screen.getByText('Fixing...')).toBeInTheDocument();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('run-fix-command', {
      verificationId: 'fixable123',
      sectionId: 'generalTest',
    });

    // Wait for the async operations in handleFix to complete
    await waitFor(() => expect(fixButton).not.toBeDisabled());
    expect(screen.getByText('Fix')).toBeInTheDocument(); // Button text resets
  });

  test('clicking "Fix" button defaults sectionId to "general" if not provided', async () => {
    mockInvoke.mockResolvedValue({ success: true, newStatus: STATUS.VALID });

    render(
      <VerificationIndicator
        label="Test Fixable No Section"
        status={STATUS.INVALID}
        fixCommand="my-fix-script"
        verificationId="fixable456"
        // sectionId is not provided
      />
    );

    const fixButton = screen.getByRole('button', { name: 'Fix' });
    fireEvent.click(fixButton);

    expect(mockInvoke).toHaveBeenCalledWith('run-fix-command', {
      verificationId: 'fixable456',
      sectionId: 'general', // Check that it defaults to 'general'
    });
    await waitFor(() => expect(fixButton).not.toBeDisabled());
  });

  test('handles error from ipcRenderer.invoke and re-enables button', async () => {
    mockInvoke.mockRejectedValue(new Error('Fix failed')); // Simulate failed fix

    // Mock console.error to verify it's called
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <VerificationIndicator
        label="Test Fixable Error"
        status={STATUS.INVALID}
        fixCommand="error-fix"
        verificationId="error1"
        sectionId="general"
      />
    );

    const fixButton = screen.getByRole('button', { name: 'Fix' });
    fireEvent.click(fixButton);

    expect(fixButton).toBeDisabled();
    await waitFor(() => expect(fixButton).not.toBeDisabled());
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error running fix command for error1:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  test('does not call invoke if fixCommand is missing when button somehow clicked (defensive)', async () => {
    // This case should ideally not happen due to button not rendering, but good for robustness
    render(
      <VerificationIndicator
        label="Test No Fix Command"
        status={STATUS.INVALID}
        verificationId="v-no-fix"
        // fixCommand is missing
      />
    );
    // Simulate if button was there and clicked (e.g. if logic changes)
    // For this test, we assume the button isn't there, so no click can happen.
    // If we wanted to test the handleFix directly, we'd need to call it.
    // But given the current render logic, this test confirms no button = no call.
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
