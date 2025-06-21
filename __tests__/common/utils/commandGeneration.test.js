/** @jest-environment node */

const { generateCommandList } = require('../../../src/common/utils/evalUtils');
const configSidebarCommands = require('../../../src/project-config/config/configurationSidebarCommands.json');
const { sections: configSidebarSectionsActual } = require('../../../src/project-config/config/configurationSidebarSections.json');

describe('Command generation end-to-end', () => {
  // Mock discovered versions for template variable substitution
  const mockDiscoveredVersions = {
    nodeVersion: '15.5.1'
  };

  test('Mirror command without attach uses base gradle run', () => {
    const config = {
      mirror: {
        enabled: true,
        mode: 'suspend',
        frontendConfig: { enabled: false }
      }
    };
    const result = generateCommandList(config, {}, {
      attachState: { mirror: false },
      configSidebarCommands,
      configSidebarSectionsActual,
      discoveredVersions: mockDiscoveredVersions
    });
    const mirrorCmd = result.find(c => c.sectionId === 'mirror');
    expect(mirrorCmd.command).toBe(
      'nvm use 15.5.1 && cd ./weblifemirror && ./gradlew bootRun --info  -x runDockerComposeAuthService -x buildAgent -x runDockerComposeRuleEngine  -x frontendDev -x runDockerComposeStats -Dspring.profiles.active=localDb,dev,worker,quartz'
    );
    expect(mirrorCmd.associatedContainers).toEqual(
      expect.arrayContaining([
        'wiremock',
        'weblifemirror-db-replica-1',
        'weblifemirror-db-master-1',
        'weblifemirror-redis-1',
        'weblifemirror-localdb-1'
      ])
    );
  });

  test('Mirror debug run command when attached', () => {
    const config = {
      mirror: {
        enabled: true,
        mode: 'run',
        debugPort: '5005',
        frontendConfig: { enabled: false }
      }
    };
    const result = generateCommandList(config, {}, {
      attachState: { mirror: true },
      configSidebarCommands,
      configSidebarSectionsActual,
      discoveredVersions: mockDiscoveredVersions
    });
    const mirrorCmd = result.find(c => c.sectionId === 'mirror');
    expect(mirrorCmd.command).toBe(
      'nvm use 15.5.1 && cd ./weblifemirror && ./gradlew bootRun -Dspring-boot.run.jvmArguments=\'-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005\' --info -x runDockerComposeAuthService -x buildAgent -x runDockerComposeRuleEngine -x frontendDev -x runDockerComposeStats -Dspring.profiles.active=localDb,dev,worker,quartz'
    );
  });

  test('Frontend dev sub-section command generated when enabled', () => {
    const config = {
      mirror: {
        enabled: true,
        mode: 'suspend',
        frontendConfig: { enabled: true, mode: 'dev' }
      }
    };
    const result = generateCommandList(config, {}, {
      attachState: { mirror: false },
      configSidebarCommands,
      configSidebarSectionsActual,
      discoveredVersions: mockDiscoveredVersions
    });
    const frontendCmd = result.find(c => c.sectionId === 'frontend');
    expect(frontendCmd.command).toBe('nvm use 15.5.1 && cd ./weblifemirror && webpack --watch');
  });
});
