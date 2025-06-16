const path = require('path');
const os = require('os');
const fs = require('fs').promises;

/**
 * Resolve common environment variable placeholders like $HOME and $GOPATH.
 * @param {string} str Input string with variables.
 * @returns {string} Resolved string.
 */
function resolveEnvVars(str) {
  if (typeof str !== 'string') {
    return str; // Return the original value if it's not a string
  }
  if (!str) return '';
  let resolvedStr = str.replace(/\$HOME/g, os.homedir());
  if (process.env.GOPATH) {
    resolvedStr = resolvedStr.replace(/\$GOPATH/g, process.env.GOPATH);
  }
  return resolvedStr;
}

/**
 * Check if a relative path exists within the given project root.
 * @param {string} projectRoot Base directory to resolve from.
 * @param {string} relativePath Relative path to check.
 * @param {string} [pathType='directory'] Expected type: 'file', 'directory', or falsy for any.
 * @returns {Promise<'valid'|'invalid'>} Validation result.
 */
async function checkPathExists(projectRoot, relativePath, pathType = 'directory') {
  const absolutePath = path.join(projectRoot, relativePath);
  try {
    const stats = await fs.stat(absolutePath);
    if (pathType === 'directory' && stats.isDirectory()) return 'valid';
    if (pathType === 'file' && stats.isFile()) return 'valid';
    if (!pathType && (stats.isFile() || stats.isDirectory())) return 'valid';
    return 'invalid';
  } catch (err) {
    return 'invalid';
  }
}

module.exports = { resolveEnvVars, checkPathExists };
