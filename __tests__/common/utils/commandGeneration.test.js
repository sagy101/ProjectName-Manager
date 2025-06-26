/** @jest-environment node */

const { generateCommandList } = require('../../../src/common/utils/evalUtils');
const configSidebarCommands = require('../../../src/project-config/config/configurationSidebarCommands.json');
const { sections: configSidebarSectionsActual } = require('../../../src/project-config/config/configurationSidebarSections.json');

describe('Command generation end-to-end', () => {
  // Mock discovered versions for template variable substitution
  const mockDiscoveredVersions = {
    nodeVersion: '15.5.1'
  };

  test('Service A command without attach uses generic simulator', () => {
    const config = {
      'service-a': {
        enabled: true,
        mode: 'suspend',
        frontendConfig: { enabled: false }
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
      "node ./ProjectName-Manager/scripts/simulators/generic-command-simulator.js --duration=30 --result=success --silent=false --containers='container-a,container-b,container-c,container-d,container-e' --variables='nodeVersion=15.5.1' --tabTitle='Service A'"
    );
    expect(serviceACmd.associatedContainers).toEqual(
      expect.arrayContaining([
        'container-a',
        'container-b',
        'container-c',
        'container-d',
        'container-e'
      ])
    );
  });

  test('Service A debug run command when attached uses generic simulator', () => {
    const config = {
      'service-a': {
        enabled: true,
        mode: 'run',
        debugPort: '5005',
        frontendConfig: { enabled: false }
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
      "node ./ProjectName-Manager/scripts/simulators/generic-command-simulator.js --duration=30 --result=success --silent=false --containers='container-a,container-b,container-c,container-d,container-e' --variables='nodeVersion=15.5.1,debugPort=5005' --tabTitle='Service A (Debug Run)'"
    );
  });

  test('Frontend dev sub-section command uses generic simulator when enabled', () => {
    const config = {
      'service-a': {
        enabled: true,
        mode: 'suspend',
        frontendConfig: { enabled: true, mode: 'dev' }
      }
    };
    const result = generateCommandList(config, {}, {
      attachState: { 'service-a': false },
      configSidebarCommands,
      configSidebarSectionsActual,
      discoveredVersions: mockDiscoveredVersions
    });
    const frontendCmd = result.find(c => c.sectionId === 'frontend');
    expect(frontendCmd.command).toBe("nvm use 15.5.1 && node ./ProjectName-Manager/scripts/simulators/generic-command-simulator.js --duration=infinite --result=success --silent=false --tabTitle='Frontend (Dev Mode)'");
  });
});
