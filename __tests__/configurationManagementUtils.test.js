const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const {
  validateConfiguration,
  loadSectionConfiguration,
  checkConfigurationFiles
} = require('../src/main-process/configurationManagement');

describe('configurationManagement utilities', () => {
  test('validateConfiguration detects errors', () => {
    const result = validateConfiguration({
      sections: [{ title: 'No id' }],
      displaySettings: 'bad'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validateConfiguration passes with minimal valid config', () => {
    const result = validateConfiguration({
      sections: [{ id: 'one', title: 'One' }],
      displaySettings: {}
    });
    expect(result.isValid).toBe(true);
  });

  test('loadSectionConfiguration reads file', async () => {
    const tmp = path.resolve('tmp-section-test.json');
    await fs.writeFile(tmp, JSON.stringify({ a: 1 }), 'utf-8');
    const res = await loadSectionConfiguration('tmp-section-test.json');
    expect(res.success).toBe(true);
    expect(res.config).toEqual({ a: 1 });
    await fs.unlink(tmp);
  });

  test('loadSectionConfiguration handles missing file', async () => {
    const res = await loadSectionConfiguration('/no/such/file.json');
    expect(res.success).toBe(false);
  });

  test('checkConfigurationFiles reports existing paths', async () => {
    const res = await checkConfigurationFiles();
    expect(res.sidebarAbout.exists).toBe(true);
    expect(res.sidebarSections.exists).toBe(true);
  });
});
