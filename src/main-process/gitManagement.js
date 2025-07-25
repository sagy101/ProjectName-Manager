const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const { loggers } = require('../common/utils/debugUtils.js');

const projectRoot = path.resolve(__dirname, '../../..'); // Adjusted for new location

// Helper function to get Git branch with caching
const gitBranchCache = {};

const CONFIG_SIDEBAR_ABOUT_PATH = path.join(__dirname, '..', 'project-config', 'config', 'configurationSidebarAbout.json');
const CONFIG_SIDEBAR_SECTIONS_PATH = path.join(__dirname, '..', 'project-config', 'config', 'configurationSidebarSections.json');

const logger = loggers.git;

const getGitBranch = async (relativePath) => {
  // Check cache first
  if (gitBranchCache[relativePath]) {
    return gitBranchCache[relativePath];
  }
  
  const absolutePath = path.join(projectRoot, relativePath);
  return new Promise((resolve) => {
    // The -C flag tells Git to run as if git was started in <path> instead of the current working directory.
    exec(`git -C "${absolutePath}" rev-parse --abbrev-ref HEAD`, { timeout: 1000 }, (error, stdout, stderr) => {
      if (error) {
        logger.warn(`Error getting Git branch for ${absolutePath}: ${stderr || error.message}`);
        gitBranchCache[relativePath] = 'unknown'; // Cache the error result
        resolve('unknown');
        return;
      }
      const branchName = stdout.trim();
      logger.debug(`Git branch for ${absolutePath}: ${branchName}`);
      gitBranchCache[relativePath] = branchName; // Cache the result
      resolve(branchName);
    });
  });
};

// Function to checkout a git branch
const checkoutGitBranch = async (projectPath, branchName) => {
  const absolutePath = path.join(projectRoot, projectPath);
  
  return new Promise((resolve) => {
    const command = `git -C "${absolutePath}" checkout "${branchName}"`;
    logger.debug(`Executing git checkout: ${command}`);
    
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Git checkout failed for ${absolutePath}: ${stderr || error.message}`);
        resolve({
          success: false,
          error: stderr || error.message,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
        return;
      }
      
      logger.debug(`Git checkout successful for ${absolutePath} to branch ${branchName}`);
      
      // Clear cache for this path so next getGitBranch call will fetch fresh data
      delete gitBranchCache[projectPath];
      
      resolve({
        success: true,
        branch: branchName,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
};

// Function to list local git branches
const listLocalGitBranches = async (projectPath) => {
  const absolutePath = path.join(projectRoot, projectPath);
  
  return new Promise((resolve) => {
    const command = `git -C "${absolutePath}" branch --format="%(refname:short)"`;
    logger.debug(`Listing local branches: ${command}`);
    
    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Git branch listing failed for ${absolutePath}: ${stderr || error.message}`);
        resolve({
          success: false,
          error: stderr || error.message,
          branches: []
        });
        return;
      }
      
      const branches = stdout.trim().split('\n').filter(branch => branch.trim() !== '');
      logger.debug(`Found ${branches.length} local branches for ${absolutePath}:`, branches);
      
      resolve({
        success: true,
        branches: branches
      });
    });
  });
};

// Function to clear git branch cache
const clearGitBranchCache = (relativePath = null) => {
  if (relativePath) {
    delete gitBranchCache[relativePath];
  } else {
    // Clear entire cache
    Object.keys(gitBranchCache).forEach(key => {
      delete gitBranchCache[key];
    });
  }
};

// Function to get current cache state (for debugging)
const getGitBranchCache = () => {
  return { ...gitBranchCache };
};

async function refreshGitBranches() {
    logger.debug('Refreshing git branch statuses...');
    clearGitBranchCache();

    let configSidebarAbout = [];
    let configSidebarSections = [];
    
    try {
        const configAboutFile = await fs.readFile(CONFIG_SIDEBAR_ABOUT_PATH, 'utf-8');
        configSidebarAbout = JSON.parse(configAboutFile);
        } catch (err) {
      logger.error('Error reading configurationSidebarAbout.json for git refresh:', err);
      return {};
    }
    
    try {
        const configSectionsFile = await fs.readFile(CONFIG_SIDEBAR_SECTIONS_PATH, 'utf-8');
        const sectionsData = JSON.parse(configSectionsFile);
        configSidebarSections = sectionsData.sections || [];
        } catch (err) {
      logger.error('Error reading configurationSidebarSections.json for git refresh:', err);
      return {};
    }
    
    // Create a map of section IDs to their testSection status
    const testSectionMap = {};
    configSidebarSections.forEach(section => {
        testSectionMap[section.id] = section.testSection === true;
    });
    
    const refreshedBranches = {};
    const branchPromises = configSidebarAbout.map(async (sectionAbout) => {
        if (sectionAbout.directoryPath) {
            // Skip test sections to avoid Git errors for non-existent directories
            if (testSectionMap[sectionAbout.sectionId]) {
                logger.debug(`Skipping git branch check for test section: ${sectionAbout.sectionId}`);
                return;
            }
            
            const cacheKey = sectionAbout.sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const branch = await getGitBranch(sectionAbout.directoryPath);
            refreshedBranches[cacheKey] = { gitBranch: branch };
        }
    });

    await Promise.all(branchPromises);
    logger.debug('Git branch refresh complete.');
    return refreshedBranches;
}

module.exports = {
  getGitBranch,
  checkoutGitBranch,
  listLocalGitBranches,
  clearGitBranchCache,
  getGitBranchCache,
  refreshGitBranches
}; 