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

  test('returns false for invalid expression', () => {
    const config = { sectionA: { enabled: true } };
    expect(evaluateCondition('invalid &&', config, 'sectionA')).toBe(false);
  });
});

describe('generateCommandList', () => {
  const sections = [
    { id: 'sectionA', title: 'Section A', components: {} }
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
});
