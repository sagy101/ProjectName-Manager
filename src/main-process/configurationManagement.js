const path = require('path');
const fs = require('fs').promises;
const { dialog } = require('electron');
const { exportConfigToFile, importConfigFromFile } = require('../../configIO');
const { debugLog } = require('../common/utils/debugUtils');

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

    debugLog('Application settings loaded successfully');
    return {
      success: true,
      appSettings,
      sections: sectionsConfig
    };
  } catch (error) {
    console.error('Error loading application settings:', error);
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
    
    debugLog('About configuration loaded successfully');
    return aboutConfig;
  } catch (error) {
    console.error('Error loading about configuration:', error);
    return [];
  }
}

// Function to export configuration
async function exportConfiguration(data) {
  try {
    debugLog('Showing save dialog for configuration export...');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Configuration',
      defaultPath: 'config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (canceled || !filePath) {
      debugLog('Export canceled by user');
      return { 
        success: false, 
        canceled: true,
        message: 'Export canceled by user'
      };
    }
    
    debugLog(`Exporting configuration data to: ${filePath}`);
    const result = await exportConfigToFile(data, filePath);
    
    if (result.success) {
      debugLog(`Configuration exported successfully to: ${filePath}`);
      return {
        success: true,
        filePath: filePath,
        message: 'Configuration exported successfully'
      };
    } else {
      console.error('Failed to export configuration:', result.error);
      return {
        success: false,
        error: result.error,
        message: 'Failed to export configuration'
      };
    }
  } catch (error) {
    console.error('Error exporting configuration:', error);
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
    debugLog('Showing open dialog for configuration import...');
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Configuration',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (canceled || filePaths.length === 0) {
      debugLog('Import canceled by user');
      return { 
        success: false, 
        canceled: true,
        message: 'Import canceled by user'
      };
    }
    
    debugLog(`Importing configuration from file: ${filePaths[0]}`);
    const result = await importConfigFromFile(filePaths[0]);
    
    if (result.success) {
      debugLog('Configuration imported successfully');
      // Spread the imported data directly like the original version
      // This ensures configState, attachState, globalDropdownValues, gitBranches are top-level properties
      return {
        success: true,
        ...result, // This spreads configState, attachState, globalDropdownValues, gitBranches, etc.
        message: 'Configuration imported successfully'
      };
    } else {
      console.error('Failed to import configuration:', result.error);
      return {
        success: false,
        error: result.error,
        message: 'Failed to import configuration'
      };
    }
  } catch (error) {
    console.error('Error importing configuration:', error);
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
    
    debugLog(`Section configuration loaded: ${sectionFilePath}`);
    return {
      success: true,
      config: sectionConfig
    };
  } catch (error) {
    console.error(`Error loading section configuration ${sectionFilePath}:`, error);
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
    
    debugLog(`Configuration saved to: ${configPath}`);
    return {
      success: true,
      filePath: configPath,
      message: 'Configuration saved successfully'
    };
  } catch (error) {
    console.error(`Error saving configuration to ${configPath}:`, error);
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