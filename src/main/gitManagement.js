const path = require('path');
const { exec } = require('child_process');

const projectRoot = path.resolve(__dirname, '../../..'); // Adjusted for new location

// Helper function to get Git branch with caching
const gitBranchCache = {};

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
        console.warn(`Error getting Git branch for ${absolutePath}: ${stderr || error.message}`);
        gitBranchCache[relativePath] = 'unknown'; // Cache the error result
        resolve('unknown');
        return;
      }
      const branchName = stdout.trim();
      console.log(`Git branch for ${absolutePath}: ${branchName}`);
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
    console.log(`Executing git checkout: ${command}`);
    
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Git checkout failed for ${absolutePath}: ${stderr || error.message}`);
        resolve({
          success: false,
          error: stderr || error.message,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
        return;
      }
      
      console.log(`Git checkout successful for ${absolutePath} to branch ${branchName}`);
      
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
    console.log(`Listing local branches: ${command}`);
    
    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Git branch listing failed for ${absolutePath}: ${stderr || error.message}`);
        resolve({
          success: false,
          error: stderr || error.message,
          branches: []
        });
        return;
      }
      
      const branches = stdout.trim().split('\n').filter(branch => branch.trim() !== '');
      console.log(`Found ${branches.length} local branches for ${absolutePath}:`, branches);
      
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

module.exports = {
  getGitBranch,
  checkoutGitBranch,
  listLocalGitBranches,
  clearGitBranchCache,
  getGitBranchCache
}; 