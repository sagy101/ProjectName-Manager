/** @jest-environment node */

const { generateCommandList } = require('../../../src/common/utils/evalUtils');
const configSidebarCommands = require('../../../src/project-config/config/configurationSidebarCommands.json');
const { sections: configSidebarSectionsActual } = require('../../../src/project-config/config/configurationSidebarSections.json');

describe('Command generation end-to-end', () => {
  // Mock discovered versions for template variable substitution
  const mockDiscoveredVersions = {
    nodeVersion: '15.5.1'
  };

  test('Service-A command without attach uses base mock command', () => {
    const config = {
      'service-a': {
        enabled: true,
        mode: 'suspend',
        'ui-componentConfig': { enabled: false }
      }
    };
    const result = generateCommandList(config, {}, {
      attachState: { 'service-a': false },
      configSidebarCommands,
      configSidebarSectionsActual,
      discoveredVersions: mockDiscoveredVersions
    });
    const serviceACmd = result.find(c => c.sectionId === 'service-a');
    expect(serviceACmd.command).toBe(
      'node ./ProjectName-Manager/test-utils/commands/mock-command.js --service=service-a --pattern=infinite'
    );
    expect(serviceACmd.associatedContainers).toEqual(
      expect.arrayContaining([
        'service-a-cache',
        'service-a-db-replica',
        'service-a-db-master',
        'service-a-redis',
        'service-a-localdb'
      ])
    );
  });

  test('Service-A debug run command when attached', () => {
    const config = {
      'service-a': {
        enabled: true,
        mode: 'run',
        debugPort: '5005',
        'ui-componentConfig': { enabled: false }
      }
    };
    const result = generateCommandList(config, {}, {
      attachState: { 'service-a': true },
      configSidebarCommands,
      configSidebarSectionsActual,
      discoveredVersions: mockDiscoveredVersions
    });
    const serviceACmd = result.find(c => c.sectionId === 'service-a');
    expect(serviceACmd.command).toBe(
      'node ./ProjectName-Manager/test-utils/commands/mock-command.js --service=service-a --pattern=infinite --debug=run --port=5005'
    );
  });

  test('UI Component dev sub-section command generated when enabled', () => {
    const config = {
      'service-a': {
        enabled: true,
        mode: 'suspend',
        'ui-componentConfig': { enabled: true, mode: 'dev' }
      }
    };
    const result = generateCommandList(config, {}, {
      attachState: { 'service-a': false },
      configSidebarCommands,
      configSidebarSectionsActual,
      discoveredVersions: mockDiscoveredVersions
    });
    const uiCmd = result.find(c => c.sectionId === 'ui-component');
    expect(uiCmd.command).toBe('node ./ProjectName-Manager/test-utils/commands/mock-command.js --service=ui-component --pattern=infinite --mode=dev');
  });
});
