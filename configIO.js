const fs = require('fs').promises;

async function exportConfigToFile(data, filePath) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function importConfigFromFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return { success: true, ...parsed };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  exportConfigToFile,
  importConfigFromFile,
};
