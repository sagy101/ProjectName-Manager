/** @jest-environment node */

const { generateCommandList } = require('../../src/utils/evalUtils');
const configSidebarCommands = require('../../src/configurationSidebarCommands.json');
const { sections: configSidebarSectionsActual } = require('../../src/configurationSidebarSections.json');
const { test, expect } = require('@playwright/test');
const { launchElectron, getTimeout } = require('./test-helpers');

describe('Command generation end-to-end', () => {
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
      configSidebarSectionsActual
    });
    const mirrorCmd = result.find(c => c.sectionId === 'mirror');
    expect(mirrorCmd.command).toBe(
      'nvm use 15.5.1 && cd ./weblifemirror && ./gradlew bootRun --info -x buildAgent -x runDockerComposeRuleEngine  -x frontendDev -x runDockerComposeStats -Dspring.profiles.active=localDb,dev,worker,quartz'
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
        frontendConfig: { enabled: false }
      }
    };
    const result = generateCommandList(config, {}, {
      attachState: { mirror: true },
      configSidebarCommands,
      configSidebarSectionsActual
    });
    const mirrorCmd = result.find(c => c.sectionId === 'mirror');
    expect(mirrorCmd.command).toBe(
      'nvm use 15.5.1 && cd ./weblifemirror && ./gradlew bootRun --debug-jvm -Dorg.gradle.debug.suspend=false --info -x buildAgent -x runDockerComposeRuleEngine  -x frontendDev -x runDockerComposeStats -Dspring.profiles.active=localDb,dev,worker,quartz'
    );
  });

  test('Frontend dev sub-section command generated when enabled', () => {
    const config = {
      mirror: {
        enabled: true,
        mode: 'suspend',
        frontendConfig: { enabled: true, deploymentType: 'dev' }
      }
    };
    const result = generateCommandList(config, {}, {
      attachState: { mirror: false },
      configSidebarCommands,
      configSidebarSectionsActual
    });
    const frontendCmd = result.find(c => c.sectionId === 'frontend');
    expect(frontendCmd.command).toBe('nvm use 15.5.1 && cd ./weblifemirror && webpack --watch');
  });
});
