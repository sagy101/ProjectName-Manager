const { STATUS } = require('../../environment-verification/constants/verificationConstants');
const { DEFAULT_FIX_PRIORITY, SECTION_STATUS } = require('../constants/autoSetupConstants');

/**
 * Collects all fix commands from verifications with invalid status
 * @param {Object} verificationStatuses - Current verification statuses
 * @param {Array} generalVerificationConfig - General environment verification config
 * @param {Array} configSidebarAbout - Section verification configs
 * @param {boolean} showTestSections - Whether test sections are visible
 * @returns {Array} Array of command groups sorted by priority
 */
const collectFixCommands = (
  verificationStatuses, 
  generalVerificationConfig, 
  configSidebarAbout,
  showTestSections = false
) => {
  const commandsByPriority = new Map();

  // Collect from general environment verifications
  if (generalVerificationConfig && verificationStatuses.general) {
    generalVerificationConfig.forEach(category => {
      if (category.category && category.category.verifications) {
        category.category.verifications.forEach(verification => {
          const status = verificationStatuses.general[verification.id];
          if (status === STATUS.INVALID && verification.fixCommand) {
            const priority = verification.fixPriority || DEFAULT_FIX_PRIORITY;
            if (!commandsByPriority.has(priority)) {
              commandsByPriority.set(priority, []);
            }
            commandsByPriority.get(priority).push({
              id: verification.id,
              title: verification.title,
              fixCommand: verification.fixCommand,
              source: 'general',
              category: category.category.title,
              priority
            });
          }
        });
      }
    });
  }

  // Collect from section verifications
  if (configSidebarAbout && verificationStatuses) {
    configSidebarAbout.forEach(sectionConfig => {
      if (sectionConfig.verifications) {
        sectionConfig.verifications.forEach(verification => {
          // Check if this verification has invalid status
          const sectionStatuses = verificationStatuses[convertSectionId(sectionConfig.sectionId)];
          const status = sectionStatuses?.[verification.id];
          
          if (status === STATUS.INVALID && verification.fixCommand) {
            // Skip if test section and not showing test sections
            const isTestSection = isFromTestSection(sectionConfig.sectionId, configSidebarAbout);
            if (isTestSection && !showTestSections) {
              return;
            }

            const priority = verification.fixPriority || DEFAULT_FIX_PRIORITY;
            if (!commandsByPriority.has(priority)) {
              commandsByPriority.set(priority, []);
            }
            commandsByPriority.get(priority).push({
              id: verification.id,
              title: verification.title,
              fixCommand: verification.fixCommand,
              source: 'section',
              sectionId: sectionConfig.sectionId,
              category: sectionConfig.description || sectionConfig.sectionId,
              priority
            });
          }
        });
      }
    });
  }

  // Convert map to sorted array of command groups
  const sortedPriorities = Array.from(commandsByPriority.keys()).sort((a, b) => a - b);
  return sortedPriorities.map(priority => ({
    priority,
    commands: commandsByPriority.get(priority),
    status: SECTION_STATUS.WAITING
  }));
};

/**
 * Converts section ID to the format used in verification statuses
 * @param {string} sectionId - Original section ID
 * @returns {string} Converted section ID
 */
const convertSectionId = (sectionId) => {
  return sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Checks if a section is marked as a test section
 * @param {string} sectionId - Section ID to check
 * @param {Array} configSidebarAbout - Configuration data
 * @returns {boolean} True if section is a test section
 */
const isFromTestSection = (sectionId, configSidebarAbout) => {
  // This would need to be cross-referenced with configurationSidebarSections.json
  // For now, we'll use a simple heuristic
  return sectionId.includes('test') || sectionId.includes('Test');
};

/**
 * Calculate the status of a command group based on individual command statuses
 * @param {Array} commands - Array of commands in the group
 * @param {Object} commandStatuses - Map of command ID to status
 * @returns {string} Group status
 */
const calculateGroupStatus = (commands, commandStatuses) => {
  if (!commands.length) return SECTION_STATUS.WAITING;

  const statuses = commands.map(cmd => commandStatuses[cmd.id] || 'pending');
  
  // If any command is running, group is running
  if (statuses.includes('running')) return SECTION_STATUS.RUNNING;
  
  // If all commands are successful, group is successful
  if (statuses.every(status => status === 'success')) return SECTION_STATUS.SUCCESS;
  
  // If any command failed or timed out, group failed
  if (statuses.includes('failed') || statuses.includes('timeout')) return SECTION_STATUS.FAILED;
  
  // If some succeeded and execution stopped, partial
  if (statuses.includes('success') && statuses.includes('stopped')) return SECTION_STATUS.PARTIAL;
  
  // Default to waiting
  return SECTION_STATUS.WAITING;
};

/**
 * Generate a unique terminal ID for an auto setup command
 * @param {string} commandId - The verification command ID
 * @returns {string} Unique terminal ID
 */
const generateAutoSetupTerminalId = (commandId) => {
  return `auto-setup-${commandId}-${Date.now()}`;
};

/**
 * Determines if all commands in a group can start (previous groups completed)
 * @param {Array} commandGroups - All command groups
 * @param {number} currentGroupIndex - Index of current group to check
 * @param {Object} commandStatuses - Current command statuses
 * @returns {boolean} True if group can start
 */
const canGroupStart = (commandGroups, currentGroupIndex, commandStatuses) => {
  // First group can always start
  if (currentGroupIndex === 0) return true;
  
  // Check all previous groups are completed successfully
  for (let i = 0; i < currentGroupIndex; i++) {
    const groupStatus = calculateGroupStatus(commandGroups[i].commands, commandStatuses);
    if (groupStatus !== SECTION_STATUS.SUCCESS) {
      return false;
    }
  }
  
  return true;
};

module.exports = {
  collectFixCommands,
  calculateGroupStatus,
  generateAutoSetupTerminalId,
  canGroupStart
}; 