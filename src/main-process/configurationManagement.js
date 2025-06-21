const path = require('path');
const fs = require('fs').promises;
const { dialog } = require('electron');
const { exportConfigToFile, importConfigFromFile } = require('../../configIO');
const { loggers } = require('../common/utils/debugUtils.js');

const logger = loggers.export;

// Path to configuration files
const CONFIG_SIDEBAR_ABOUT_PATH = path.join(__dirname, '..', 'project-config', 'config', 'configurationSidebarAbout.json');
const CONFIG_SIDEBAR_SECTIONS_PATH = path.join(__dirname, '..', 'project-config', 'config', 'configurationSidebarSections.json');

// Function to load application settings
async function loadAppSettings() {
  try {
    const sectionsConfig = JSON.parse(await fs.readFile(CONFIG_SIDEBAR_SECTIONS_PATH, 'utf-8'));
    
    // Extract settings from the loaded config
    const appSettings = {
      openDevToolsByDefault: sectionsConfig?.settings?.openDevToolsByDefault ?? false,
      projectName: sectionsConfig?.settings?.projectName || 'Project',
      autoSetupTimeoutSeconds: sectionsConfig?.settings?.autoSetupTimeoutSeconds || 60,
      loadingScreenTimeoutSeconds: sectionsConfig?.settings?.loadingScreenTimeoutSeconds || 15,
      sidebarDefaultExpanded: sectionsConfig?.settings?.sidebarDefaultExpanded ?? false,
      terminalScrollback: sectionsConfig?.settings?.terminalScrollback || 1000,
      maxFloatingTerminals: sectionsConfig?.settings?.maxFloatingTerminals || 10,
      terminalFontSize: sectionsConfig?.settings?.terminalFontSize || 14,
      configurationDefaultExpanded: sectionsConfig?.settings?.configurationDefaultExpanded ?? true,
    };

    logger.debug('Application settings loaded successfully');
    return {
      success: true,
      appSettings,
      sections: sectionsConfig
    };
  } catch (error) {
    logger.error('Error loading application settings:', error);
    return {
      success: false,
      error: error.message,
      appSettings: {},
      sections: []
    };
  }
}

// Function to get about configuration
async function getAboutConfig() {
  try {
    const configFile = await fs.readFile(CONFIG_SIDEBAR_ABOUT_PATH, 'utf-8');
    const aboutConfig = JSON.parse(configFile);
    
    logger.debug('About configuration loaded successfully');
    return aboutConfig;
  } catch (error) {
    logger.error('Error loading about configuration:', error);
    return [];
  }
}

// Function to export configuration
async function exportConfiguration(data) {
  try {
    logger.debug('Showing save dialog for configuration export...');
    const result = await dialog.showSaveDialog({
      title: 'Export Configuration',
      defaultPath: 'project-config.json',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      logger.debug('Export canceled by user');
      return { success: false, message: 'Export canceled by user' };
    }

    const filePath = result.filePath;
    logger.debug(`Exporting configuration data to: ${filePath}`);
    
    const exportResult = await exportConfigToFile(data, filePath);
    if (exportResult.success) {
      logger.debug(`Configuration exported successfully to: ${filePath}`);
      return { success: true, filePath };
    } else {
      logger.error('Export failed:', exportResult.error);
      return { success: false, error: exportResult.error, message: 'Error during configuration export' };
    }
  } catch (error) {
    logger.error('Error exporting configuration:', error);
    return {
      success: false,
      error: error.message,
      message: 'Error during configuration export'
    };
  }
}

// Function to import configuration
async function importConfiguration() {
  try {
    logger.debug('Showing open dialog for configuration import...');
    const result = await dialog.showOpenDialog({
      title: 'Import Configuration',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      logger.debug('Import canceled by user');
      return { success: false, canceled: true, message: 'Import canceled by user' };
    }

    const filePath = result.filePaths[0];
    logger.debug(`Importing configuration from file: ${filePath}`);
    
    const importResult = await importConfigFromFile(filePath);
    if (importResult.success) {
      logger.debug('Configuration imported successfully');
      // Return all properties from the imported config (configState, attachState, etc.)
      const { success, ...configData } = importResult;
      return { success: true, ...configData };
    } else {
      logger.error('Import failed:', importResult.error);
      return { success: false, error: importResult.error, message: 'Error during configuration import' };
    }
  } catch (error) {
    logger.error('Error importing configuration:', error);
    return {
      success: false,
      error: error.message,
      message: 'Error during configuration import'
    };
  }
}

// Function to load section configuration
async function loadSectionConfiguration(sectionFilePath) {
  try {
    const absolutePath = path.join(__dirname, '../../', sectionFilePath);
    const configFile = await fs.readFile(absolutePath, 'utf-8');
    const sectionConfig = JSON.parse(configFile);
    
    logger.debug(`Section configuration loaded: ${sectionFilePath}`);
    return {
      success: true,
      config: sectionConfig
    };
  } catch (error) {
    logger.error(`Error loading section configuration ${sectionFilePath}:`, error);
    return {
      success: false,
      error: error.message,
      config: {}
    };
  }
}

// Function to save configuration (if needed for future use)
async function saveConfiguration(configPath, data) {
  try {
    const configString = JSON.stringify(data, null, 2);
    await fs.writeFile(configPath, configString, 'utf-8');
    
    logger.debug(`Configuration saved to: ${configPath}`);
    return {
      success: true,
      filePath: configPath,
      message: 'Configuration saved successfully'
    };
  } catch (error) {
    logger.error(`Error saving configuration to ${configPath}:`, error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to save configuration'
    };
  }
}

// Function to validate configuration structure
function validateConfiguration(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { isValid: false, errors, warnings };
  }

  // Check for required sections
  if (config.sections && Array.isArray(config.sections)) {
    config.sections.forEach((section, index) => {
      if (!section.id) {
        errors.push(`Section at index ${index} is missing required 'id' field`);
      }
      if (!section.title) {
        warnings.push(`Section at index ${index} is missing 'title' field`);
      }
    });
  }

  // Check settings
  if (config.settings && typeof config.settings !== 'object') {
    errors.push('settings must be an object');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Function to get configuration file paths
function getConfigurationPaths() {
  return {
    sidebarAbout: CONFIG_SIDEBAR_ABOUT_PATH,
    sidebarSections: CONFIG_SIDEBAR_SECTIONS_PATH
  };
}

// Function to check if configuration files exist
async function checkConfigurationFiles() {
  const paths = getConfigurationPaths();
  const results = {};

  for (const [key, filePath] of Object.entries(paths)) {
    try {
      await fs.access(filePath);
      results[key] = { exists: true, path: filePath };
    } catch (error) {
      results[key] = { exists: false, path: filePath, error: error.message };
    }
  }

  return results;
}

module.exports = {
  loadAppSettings,
  getAboutConfig,
  exportConfiguration,
  importConfiguration,
  loadSectionConfiguration,
  saveConfiguration,
  validateConfiguration,
  getConfigurationPaths,
  checkConfigurationFiles
}; 