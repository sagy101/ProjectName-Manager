const { evaluateCondition, generateCommandList, substituteCommandVariables } = require('../../../src/common/utils/evalUtils');

describe('additional evalUtils coverage', () => {
  test('evaluateCondition uses subsection context when id matches nested config', () => {
    const config = {
      parent: {
        childConfig: { id: 'child-sub', enabled: true, val: 5 }
      }
    };
    expect(evaluateCondition('val === 5', config, 'child-sub')).toBe(true);
  });

  test('generateCommandList ignores commands for unknown sections and test sections', () => {
    const sections = [
      { id: 'sec', title: 'Sec', components: {} },
      { id: 'test', title: 'Test', testSection: true, components: {} }
    ];
    const commands = [
      { id: 'missing', command: { base: 'run', tabTitle: 'M' } },
      { id: 'test', command: { base: 'run', tabTitle: 'T' } }
    ];
    const list = generateCommandList(
      { sec: { enabled: true }, test: { enabled: true } },
      {},
      {
        configSidebarCommands: commands,
        configSidebarSectionsActual: sections,
        showTestSections: false
      }
    );
    expect(list).toHaveLength(2);
    expect(list.every(c => c.type === 'error')).toBe(true);
  });

  test('generateCommandList handles replace modifiers, post modifiers and excludes', () => {
    const sections = [
      { id: 'sectionA', title: 'A', components: {} },
      { id: 'sectionB', title: 'B', components: { subSections: [{ id: 'child-sub', title: 'Child' }] } }
    ];
    const commands = [
      {
        id: 'child-sub',
        conditions: { 'fooConfig.bar': 'baz', foo: 'sub', deploymentType: 'container' },
        command: {
          base: 'base',
          modifiers: [{ condition: 'attachState.useReplace', replace: 'replaced' }],
          postModifiers: ' P',
          excludes: [{ condition: 'attachState.useExclude', append: ' X' }],
          tabTitle: 'T'
        }
      }
    ];
    const config = {
      sectionA: { fooConfig: { bar: 'baz' } },
      sectionB: {
        enabled: true,
        deploymentType: { value: 'container' },
        childConfig: { enabled: true, foo: 'sub' }
      }
    };
    const list = generateCommandList(config, {}, {
      attachState: { useReplace: true, useExclude: true },
      configSidebarCommands: commands,
      configSidebarSectionsActual: sections
    });
    expect(list).toHaveLength(1);
    expect(list[0].command).toBe('replaced P X');
  });

  test('substituteCommandVariables resolves parent and subsection values and leaves unknown placeholders', () => {
    const sections = [{ id: 'parent', title: 'P', components: { subSections: [{ id: 'child-sub', title: 'Child' }] } }];
    const config = { parent: { parentVar: 'PVAL', childConfig: { val: 'CVAL' } } };
    const result1 = substituteCommandVariables('a ${parentVar}', {}, {}, config, 'child-sub', sections);
    const result2 = substituteCommandVariables('b ${val}', {}, {}, config, 'child-sub', sections);
    const result3 = substituteCommandVariables('c ${missing}', {}, {}, config, 'child-sub', sections);
    expect(result1).toBe('a PVAL');
    expect(result2).toBe('b CVAL');
    expect(result3).toBe('c ${missing}');
  });
});
