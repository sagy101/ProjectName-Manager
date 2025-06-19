const { collectFixCommands, calculateGroupStatus, generateAutoSetupTerminalId, canGroupStart } = require('../src/auto-setup/utils/autoSetupUtils');
const { STATUS } = require('../src/environment-verification/constants/verificationConstants');
const { DEFAULT_FIX_PRIORITY, SECTION_STATUS } = require('../src/auto-setup/constants/autoSetupConstants');

describe('autoSetupUtils', () => {
  describe('collectFixCommands', () => {
    const generalVerificationConfig = [
      { category: { title: 'General', verifications: [
        { id: 'v1', title: 'Verify1', fixCommand: 'fix1', fixPriority: 1 },
        { id: 'v2', title: 'Verify2', fixCommand: 'fix2' }
      ] } }
    ];
    const configSidebarAbout = [
      { sectionId: 'section-one', description: 'Section One', verifications: [
        { id: 's1', title: 'Sec1', fixCommand: 'secfix1' }
      ] },
      { sectionId: 'test-section', description: 'Test Section', verifications: [
        { id: 't1', title: 'Test1', fixCommand: 'testfix1' }
      ] }
    ];
    const verificationStatuses = {
      general: { v1: STATUS.INVALID, v2: STATUS.INVALID },
      sectionOne: { s1: STATUS.INVALID },
      testSection: { t1: STATUS.INVALID }
    };

    test('collects commands excluding test sections by default', () => {
      const result = collectFixCommands(verificationStatuses, generalVerificationConfig, configSidebarAbout, false);
      expect(result).toEqual([
        {
          priority: 1,
          commands: [
            {
              id: 'v1',
              title: 'Verify1',
              fixCommand: 'fix1',
              source: 'general',
              category: 'General',
              priority: 1
            }
          ],
          status: SECTION_STATUS.WAITING
        },
        {
          priority: DEFAULT_FIX_PRIORITY,
          commands: [
            {
              id: 'v2',
              title: 'Verify2',
              fixCommand: 'fix2',
              source: 'general',
              category: 'General',
              priority: DEFAULT_FIX_PRIORITY
            },
            {
              id: 's1',
              title: 'Sec1',
              fixCommand: 'secfix1',
              source: 'section',
              sectionId: 'section-one',
              category: 'Section One',
              priority: DEFAULT_FIX_PRIORITY
            }
          ],
          status: SECTION_STATUS.WAITING
        }
      ]);
    });

    test('includes test section commands when showTestSections is true', () => {
      const result = collectFixCommands(verificationStatuses, generalVerificationConfig, configSidebarAbout, true);
      const allCommands = result.flatMap(g => g.commands.map(c => c.id));
      expect(allCommands).toContain('t1');
    });
  });

  test('generateAutoSetupTerminalId creates unique id', () => {
    const id = generateAutoSetupTerminalId('cmd');
    expect(id).toMatch(/^auto-setup-cmd-\d+$/);
  });

  describe('calculateGroupStatus', () => {
    const commands = [{ id: 'a' }, { id: 'b' }];
    test('returns RUNNING when any command running', () => {
      expect(calculateGroupStatus(commands, { a: 'running', b: 'pending' })).toBe(SECTION_STATUS.RUNNING);
    });
    test('returns SUCCESS when all commands successful', () => {
      expect(calculateGroupStatus(commands, { a: 'success', b: 'success' })).toBe(SECTION_STATUS.SUCCESS);
    });
    test('returns FAILED when any failed or timeout', () => {
      expect(calculateGroupStatus(commands, { a: 'failed', b: 'success' })).toBe(SECTION_STATUS.FAILED);
      expect(calculateGroupStatus(commands, { a: 'timeout', b: 'success' })).toBe(SECTION_STATUS.FAILED);
    });
    test('returns PARTIAL when some success and stopped', () => {
      expect(calculateGroupStatus(commands, { a: 'success', b: 'stopped' })).toBe(SECTION_STATUS.PARTIAL);
    });
    test('returns WAITING by default', () => {
      expect(calculateGroupStatus(commands, { a: 'pending', b: 'pending' })).toBe(SECTION_STATUS.WAITING);
    });
  });

  describe('canGroupStart', () => {
    const groups = [
      { commands: [{ id: 'a' }] },
      { commands: [{ id: 'b' }] }
    ];
    test('first group can always start', () => {
      expect(canGroupStart(groups, 0, {})).toBe(true);
    });
    test('returns true when previous groups successful', () => {
      const statuses = { a: 'success' };
      expect(canGroupStart(groups, 1, statuses)).toBe(true);
    });
    test('returns false when previous group not successful', () => {
      const statuses = { a: 'failed' };
      expect(canGroupStart(groups, 1, statuses)).toBe(false);
    });
  });
});
