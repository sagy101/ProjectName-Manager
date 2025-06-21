jest.mock('../../src/project-config/config/configurationSidebarSections.json', () => {
  const fs = require('fs');
  const path = require('path');
  const file = fs.readFileSync(path.join(__dirname, '../mock-data/mockConfigurationSidebarSections.json'), 'utf-8');
  return JSON.parse(file);
});

import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectConfig } from '../../src/project-config/hooks/useProjectConfig';

const noop = () => {};

describe('useProjectConfig', () => {
  test('initializes config and attach state', async () => {
    const { result } = renderHook(() => useProjectConfig({}, false, noop));
    await waitFor(() => expect(result.current.initialized).toBe(true));
    expect(result.current.configState).toHaveProperty('generic-section-1');
    expect(result.current.attachState).toHaveProperty('generic-section-1', false);
  });

  test('toggleSectionEnabled updates state with globals', async () => {
    const globals = { 'mock-dropdown-1': 'option1' };
    const { result } = renderHook(() => useProjectConfig(globals, false, noop));
    await waitFor(() => result.current.initialized);
    act(() => {
      result.current.toggleSectionEnabled('section-with-dropdowns', true);
    });
    const section = result.current.configState['section-with-dropdowns'];
    expect(section.enabled).toBe(true);
    expect(section['mock-dropdown-1']).toBe('option1');
  });

  test('setMode updates modes for sections and sub sections', async () => {
    const { result } = renderHook(() => useProjectConfig({}, false, noop));
    await waitFor(() => result.current.initialized);
    act(() => {
      result.current.setMode('generic-section-1', 'run');
      result.current.setMode('generic-section-1', 'dev', 'generic-subsection-1');
    });
    expect(result.current.configState['generic-section-1'].mode).toBe('run');
    const sub = result.current.configState['generic-section-1']['generic-subsection-1Config'];
    expect(sub.mode).toBe('dev');
    expect(sub.deploymentType).toBe('dev');
  });

  test('setSectionDropdownValue marks dropdown as selected', async () => {
    const { result } = renderHook(() => useProjectConfig({}, false, noop));
    await waitFor(() => result.current.initialized);
    act(() => {
      result.current.setSectionDropdownValue('section-with-dropdowns', 'mock-dropdown-1', 'choice');
    });
    const section = result.current.configState['section-with-dropdowns'];
    expect(section['mock-dropdown-1']).toBe('choice');
    expect(section['mock-dropdown-1Selected']).toBe(true);
  });

  test('updates when global dropdowns change', async () => {
    const { result, rerender } = renderHook(({ global }) => useProjectConfig(global, false, noop), {
      initialProps: { global: {} }
    });
    await waitFor(() => result.current.initialized);
    act(() => {
      rerender({ global: { 'mock-dropdown-1': 'x' } });
    });
    await waitFor(() => result.current.configState['section-with-dropdowns']['mock-dropdown-1'] === 'x');
    expect(result.current.configState['section-with-dropdowns']['mock-dropdown-1']).toBe('x');
  });

  test('handleAttachToggle enforces mutual exclusion', async () => {
    const notify = jest.fn();
    const { result } = renderHook(() => useProjectConfig({}, false, notify));
    await waitFor(() => result.current.initialized);
    act(() => {
      result.current.setAttachState({ 'generic-section-2': true, 'generic-section-1': false });
    });
    act(() => {
      result.current.handleAttachToggle('generic-section-1', true);
    });
    expect(result.current.attachState['generic-section-1']).toBe(true);
    expect(result.current.attachState['generic-section-2']).toBe(false);
    expect(result.current.warningState['generic-section-2']).toBe(true);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
  });

  test('handleAttachToggle disables attach', async () => {
    const { result } = renderHook(() => useProjectConfig({}, false, noop));
    await waitFor(() => result.current.initialized);
    act(() => {
      result.current.setAttachState({ 'generic-section-1': true });
    });
    act(() => {
      result.current.handleAttachToggle('generic-section-1', false);
    });
    expect(result.current.attachState['generic-section-1']).toBe(false);
  });

  test('toggleSubSectionEnabled updates sub section state', async () => {
    const { result } = renderHook(() => useProjectConfig({}, false, noop));
    await waitFor(() => result.current.initialized);
    act(() => {
      result.current.toggleSubSectionEnabled('generic-section-1', 'generic-subsection-1', true);
    });
    expect(result.current.configState['generic-section-1']['generic-subsection-1Config'].enabled).toBe(true);
  });

  test('setInputFieldValue updates input value', async () => {
    const { result } = renderHook(() => useProjectConfig({}, false, noop));
    await waitFor(() => result.current.initialized);
    act(() => {
      result.current.setInputFieldValue('section-with-input', 'testField', 'abc');
    });
    expect(result.current.configState['section-with-input'].testField).toBe('abc');
  });
});
