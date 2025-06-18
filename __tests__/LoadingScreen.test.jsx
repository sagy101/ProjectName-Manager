/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingScreen from '../src/components/LoadingScreen.jsx';

describe('LoadingScreen', () => {
  test('shows appropriate default status based on progress', () => {
    const { getByText, rerender } = render(<LoadingScreen progress={0} />);
    expect(getByText('Starting application...')).toBeInTheDocument();

    rerender(<LoadingScreen progress={20} />);
    expect(getByText('Loading components...')).toBeInTheDocument();

    rerender(<LoadingScreen progress={40} />);
    expect(getByText('Verifying environment...')).toBeInTheDocument();

    rerender(<LoadingScreen progress={60} />);
    expect(getByText('Checking tools and dependencies...')).toBeInTheDocument();

    rerender(<LoadingScreen progress={80} />);
    expect(getByText('Fetching cloud resources...')).toBeInTheDocument();

    rerender(<LoadingScreen progress={90} />);
    expect(getByText('Finalizing setup...')).toBeInTheDocument();

    rerender(<LoadingScreen progress={99} />);
    expect(getByText('Almost ready...')).toBeInTheDocument();
  });

  test('renders progress bar width and title', () => {
    const { container, getByText } = render(
      <LoadingScreen progress={30} projectName="TestProj" />
    );
    const bar = container.querySelector('.progress-bar');
    expect(bar.style.width).toBe('30%');
    expect(getByText('TestProj Manager')).toBeInTheDocument();
  });
});
