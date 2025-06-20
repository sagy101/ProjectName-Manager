jest.mock('../../src/project-config/config/configurationSidebarSections.json', () => {
  const fs = require('fs');
  const path = require('path');
  const file = fs.readFileSync(path.join(__dirname, '../mock-data/mockConfigValidation.json'), 'utf-8');
  return JSON.parse(file);
});

import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectConfig } from '../../src/project-config/hooks/useProjectConfig';

describe('useProjectConfig validation', () => {
  test('does not enable section when validation fails', async () => {
    const notify = jest.fn();
    const { result } = renderHook(() => useProjectConfig({}, false, notify));
    await waitFor(() => result.current.initialized);
    act(() => {
      result.current.toggleSectionEnabled('validation-section', true);
    });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    expect(result.current.configState['validation-section'].enabled).toBe(false);
  });

  test('enables section when validation passes', async () => {
    const notify = jest.fn();
    const globals = { gcloudProject: 'my-project' };
    const { result } = renderHook(() => useProjectConfig(globals, false, notify));
    await waitFor(() => result.current.initialized);
    act(() => {
      result.current.toggleSectionEnabled('validation-section', true);
    });
    expect(notify).not.toHaveBeenCalled();
    expect(result.current.configState['validation-section'].enabled).toBe(true);
  });
});
