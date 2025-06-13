const path = require('path');
const fs = require('fs').promises;
const { dialog } = require('electron');
const { exportConfigToFile, importConfigFromFile } = require('../../configIO');

// Path to configuration files
const CONFIG_SIDEBAR_ABOUT_PATH = path.join(__dirname, '../configurationSidebarAbout.json');
const CONFIG_SIDEBAR_SECTIONS_PATH = path.join(__dirname, '../configurationSidebarSections.json');

// Function to load display settings
async function loadDisplaySettings() {
  try {
    const sectionsConfig = JSON.parse(await fs.readFile(CONFIG_SIDEBAR_SECTIONS_PATH, 'utf-8'));
    
    // Extract display settings from the loaded config
    const displaySettings = {
      openDevToolsByDefault: sectionsConfig?.displaySettings?.openDevToolsByDefault || false,
      projectName: sectionsConfig?.displaySettings?.projectName || 'Project',
    };

    console.log('Display settings loaded successfully');
    return {
      success: true,
      displaySettings,
      sections: sectionsConfig
    };
  } catch (error) {
    console.error('Error loading display settings:', error);
    return {
      success: false,
      error: error.message,
      displaySettings: {},
      sections: []
    };
  }
}

// Function to get about configuration
async function getAboutConfig() {
  try {
    const configFile = await fs.readFile(CONFIG_SIDEBAR_ABOUT_PATH, 'utf-8');
    const aboutConfig = JSON.parse(configFile);
    
    console.log('About configuration loaded successfully');
    return aboutConfig;
  } catch (error) {
    console.error('Error loading about configuration:', error);
    return [];
  }
}

// Function to export configuration
async function exportConfiguration(data) {
  try {
    console.log('Showing save dialog for configuration export...');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Configuration',
      defaultPath: 'config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (canceled || !filePath) {
      console.log('Export canceled by user');
      return { 
        success: false, 
        canceled: true,
        message: 'Export canceled by user'
      };
    }
    
    console.log(`Exporting configuration data to: ${filePath}`);
    const result = await exportConfigToFile(data, filePath);
    
    if (result.success) {
      console.log(`Configuration exported successfully to: ${filePath}`);
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
    console.log('Showing open dialog for configuration import...');
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Configuration',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (canceled || filePaths.length === 0) {
      console.log('Import canceled by user');
      return { 
        success: false, 
        canceled: true,
        message: 'Import canceled by user'
      };
    }
    
    console.log(`Importing configuration from file: ${filePaths[0]}`);
    const result = await importConfigFromFile(filePaths[0]);
    
    if (result.success) {
      console.log('Configuration imported successfully');
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
    
    console.log(`Section configuration loaded: ${sectionFilePath}`);
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
    
    console.log(`Configuration saved to: ${configPath}`);
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

  // Check display settings
  if (config.displaySettings && typeof config.displaySettings !== 'object') {
    errors.push('displaySettings must be an object');
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
  loadDisplaySettings,
  getAboutConfig,
  exportConfiguration,
  importConfiguration,
  loadSectionConfiguration,
  saveConfiguration,
  validateConfiguration,
  getConfigurationPaths,
  checkConfigurationFiles
}; 