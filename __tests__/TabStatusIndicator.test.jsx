/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import TabStatusIndicator from '../src/tab-info/components/TabStatusIndicator';

describe('TabStatusIndicator', () => {
  const cases = [
    ['running', 'status-running', 'Running'],
    ['done', 'status-done', 'Completed'],
    ['error', 'status-error', 'Error'],
    ['idle', 'status-idle', 'Idle']
  ];

  test.each(cases)('renders %s correctly', (status, cls, title) => {
    const { container } = render(<TabStatusIndicator status={status} isError={false} />);
    const span = container.querySelector('span');
    expect(span.className).toContain(cls);
    expect(span.title).toBe(title);
  });
});
