const { evaluateCondition, generateCommandList } = require('../src/utils/evalUtils');

describe('evaluateCondition', () => {
  test('evaluates boolean expression with config and globals', () => {
    const config = {
      sectionA: { enabled: true },
    };
    const attachState = { sectionA: true };
    const globals = { project: 'test' };

    expect(
      evaluateCondition('enabled && attachState.sectionA && project === "test"', config, 'sectionA', attachState, globals)
    ).toBe(true);
  });

  test('evaluates to false correctly', () => {
    const config = {
      sectionA: { enabled: false },
    };
    expect(evaluateCondition('enabled', config, 'sectionA')).toBe(false);
  });

  test('handles complex expressions', () => {
    const config = {
      sectionA: { enabled: true, mode: 'run' },
    };
    const attachState = { sectionA: false };
    const globals = { project: 'prod' };
    const expression = '(enabled && mode === "run") || (attachState.sectionA && project === "test")';
    expect(evaluateCondition(expression, config, 'sectionA', attachState, globals)).toBe(true);
  });

  test('handles missing data gracefully', () => {
    const config = {};
    expect(evaluateCondition('enabled', config, 'sectionA')).toBe(false);
  });

  test('returns false for invalid expression', () => {
    const config = { sectionA: { enabled: true } };
    expect(evaluateCondition('invalid &&', config, 'sectionA')).toBe(false);
  });
});

describe('generateCommandList', () => {
  const sections = [
    { id: 'sectionA', title: 'Section A', components: {} },
    { id: 'sectionB', title: 'Section B', components: {} },
  ];
  const commands = [
    {
      sectionId: 'sectionA',
      conditions: { enabled: true, 'attachState.sectionA': false },
      command: { base: 'cmdA', tabTitle: 'A' }
    },
    {
      sectionId: 'sectionA',
      conditions: { enabled: true, 'attachState.sectionA': true },
      command: { base: 'cmdA-debug', tabTitle: 'A debug' }
    },
    {
      sectionId: 'sectionB',
      conditions: { enabled: true, mode: 'dev' },
      command: { base: 'cmdB-dev', tabTitle: 'B dev' }
    },
    {
      sectionId: 'sectionB',
      conditions: { enabled: true, deploymentType: 'container' },
      command: { base: 'cmdB-container', tabTitle: 'B container' }
    }
  ];

  test('chooses command based on attach state false', () => {
    const config = { sectionA: { enabled: true } };
    const list = generateCommandList(config, {}, {
      attachState: { sectionA: false },
      configSidebarCommands: commands,
      configSidebarSectionsActual: sections
    });
    expect(list).toHaveLength(1);
    expect(list[0].command).toBe('cmdA');
  });

  test('chooses command based on attach state true', () => {
    const config = { sectionA: { enabled: true } };
    const list = generateCommandList(config, {}, {
      attachState: { sectionA: true },
      configSidebarCommands: commands,
      configSidebarSectionsActual: sections
    });
    expect(list).toHaveLength(1);
    expect(list[0].command).toBe('cmdA-debug');
  });

  test('generates commands for multiple sections', () => {
    const config = {
      sectionA: { enabled: true },
      sectionB: { enabled: true, mode: 'dev' }
    };
    const list = generateCommandList(config, {}, {
      attachState: { sectionA: false },
      configSidebarCommands: commands,
      configSidebarSectionsActual: sections
    });
    expect(list).toHaveLength(2);
    expect(list.find(c => c.sectionId === 'sectionA').command).toBe('cmdA');
    expect(list.find(c => c.sectionId === 'sectionB').command).toBe('cmdB-dev');
  });

  test('respects deploymentType and mode', () => {
    const config = {
      sectionB: { enabled: true, deploymentType: 'container', mode: 'prod' }
    };
    const list = generateCommandList(config, {}, {
      attachState: {},
      configSidebarCommands: commands,
      configSidebarSectionsActual: sections
    });
    expect(list).toHaveLength(1);
    expect(list[0].command).toBe('cmdB-container');
  });

  test('returns empty list when no commands match', () => {
    const config = {
      sectionA: { enabled: false },
      sectionB: { enabled: true, mode: 'unmatched' }
    };
    const list = generateCommandList(config, {}, {
      attachState: {},
      configSidebarCommands: commands,
      configSidebarSectionsActual: sections
    });
    expect(list).toHaveLength(1);
    expect(list[0]).toHaveProperty('type', 'error');
    expect(list[0]).toHaveProperty('sectionId', 'sectionB');
  });
});
