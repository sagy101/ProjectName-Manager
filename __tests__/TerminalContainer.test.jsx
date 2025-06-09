/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import TerminalContainer from '../src/components/TerminalContainer';

// Mock child components and dependencies to isolate TerminalContainer
jest.mock('../src/components/TerminalTab', () => () => <div data-testid="terminal-tab"></div>);
jest.mock('../src/components/Terminal', () => () => <div data-testid="terminal-component"></div>);
jest.mock('../src/components/TabInfoPanel', () => () => <div data-testid="tab-info-panel"></div>);

describe('TerminalContainer', () => {
  // Set up mock for window.electron
  beforeAll(() => {
    global.window = {};
    window.electron = new Proxy({}, {
      get: (target, prop) => {
        if (!target[prop]) {
          target[prop] = jest.fn(() => jest.fn());
        }
        return target[prop];
      }
    });
    // Mock for ResizeObserver, often used in layout-dependent components
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  test('should display placeholder when no terminals are present', () => {
    render(<TerminalContainer projectName="MyTestProject" />);
    
    // Check for the heading, allowing for slight variations in whitespace
    const headingElement = screen.getByRole('heading', {
      name: /Waiting to Run\s+MYTESTPROJECT/i,
    });
    expect(headingElement).toBeInTheDocument();

    // Check for the instructional text using a function to handle the <b> tag
    const paragraphElement = screen.getByText((content, element) => {
      const hasText = (node) => node.textContent === "Press RUN MYTESTPROJECT to start your configuration and see output here.";
      const elementHasText = hasText(element);
      const childrenDontHaveText = Array.from(element.children).every(
        (child) => !hasText(child)
      );
      return elementHasText && childrenDontHaveText;
    });
    expect(paragraphElement).toBeInTheDocument();
  });
}); 