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

test('handles associated container conditions and strings', () => {
  const sections = [{ id: 'sec', title: 'Sec', components: {} }];
  const commands = [
    {
      sectionId: 'sec',
      command: {
        base: 'run',
        tabTitle: 'T',
        associatedContainers: ['c1', { name: 'c2', condition: 'attachState.useC2' }]
      }
    }
  ];
  const list = generateCommandList(
    { sec: { enabled: true } },
    {},
    {
      attachState: { useC2: true },
      configSidebarCommands: commands,
      configSidebarSectionsActual: sections
    }
  );
  expect(list[0].associatedContainers).toEqual(['c1', 'c2']);
});

test('produces error when section enabled but no commands defined', () => {
  const sections = [{ id: 'sec', title: 'Sec', components: {} }];
  const list = generateCommandList(
    { sec: { enabled: true } },
    {},
    { attachState: {}, configSidebarCommands: [], configSidebarSectionsActual: sections }
  );
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ type: 'error', sectionId: 'sec' });
});

test('produces error for enabled sub-section when no matching command', () => {
  const sections = [{
    id: 'parent',
    title: 'Parent',
    components: { subSections: [{ id: 'child-sub', title: 'Child' }] }
  }];
  const commands = [
    {
      sectionId: 'child-sub',
      conditions: { enabled: false },
      command: { base: 'cmd', tabTitle: 'child' }
    }
  ];
  const config = { parent: { enabled: true, 'child-subConfig': { enabled: true } } };
  const list = generateCommandList(
    config,
    {},
    { attachState: {}, configSidebarCommands: commands, configSidebarSectionsActual: sections }
  );
  const parentError = list.find(e => e.sectionId === 'parent');
  expect(parentError).toBeDefined();
  expect(parentError).toHaveProperty('type', 'error');
});

test('handles prefixes, final appends and conditional tab titles', () => {
  const sections = [{ id: 'sec', title: 'Sec', components: {} }];
  const commands = [
    {
      sectionId: 'sec',
      conditions: { enabled: true },
      command: {
        base: 'run ${version} ${mode}',
        modifiers: [{ condition: 'globalVar === "yes"', append: ' A' }],
        finalAppend: ' B',
        prefix: 'pre-',
        tabTitle: { base: 'T', conditionalAppends: [{ condition: 'attachState.t', append: '-X' }] },
        associatedContainers: ['base', { name: 'cond', condition: 'attachState.t' }]
      }
    }
  ];
  const config = { sec: { enabled: true, mode: 'prod' } };
  const list = generateCommandList(
    config,
    { globalVar: 'yes' },
    {
      attachState: { t: true },
      configSidebarCommands: commands,
      configSidebarSectionsActual: sections,
      discoveredVersions: { version: '1.0' }
    }
  );
  expect(list).toHaveLength(1);
  expect(list[0].command).toBe('pre-run 1.0 prod A B');
  expect(list[0].section).toBe('T-X');
  expect(list[0].associatedContainers).toEqual(['base', 'cond']);
});

test('generateCommandList resolves placeholders from multiple sources', () => {
  const sections = [
    { id: 'parent', title: 'Parent', components: { subSections: [{ id: 'child-sub', title: 'Child' }] } }
  ];
  const commands = [
    {
      sectionId: 'child-sub',
      command: { base: 'run ${var} ${mode} ${ver} ${g}', tabTitle: 'T' }
    }
  ];
  const config = {
    parent: {
      enabled: true,
      childConfig: {
        enabled: true,
        var: 'c',
        mode: { value: 'child' }
      }
    }
  };
  const list = generateCommandList(
    config,
    { g: 'glob' },
    {
      configSidebarCommands: commands,
      configSidebarSectionsActual: sections,
      attachState: {},
      discoveredVersions: { ver: '1.0' }
    }
  );
  expect(list).toHaveLength(1);
  expect(list[0].command).toBe('run c [object Object] 1.0 glob');
});

test('evaluateCondition reads values from other sections', () => {
  const config = {
    secA: { enabled: true },
    secB: { fooConfig: { bar: 'baz' } }
  };
  expect(evaluateCondition('fooConfig.bar === "baz"', config, 'secA')).toBe(true);
});
