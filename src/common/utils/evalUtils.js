const { loggers } = require('./debugUtils.js');

const logger = loggers.app;

function evaluateCondition(conditionStr, currentConfig, currentSectionId, attachState = {}, globalDropdownValues = {}) {
  const context = {};

  let parentSection = null;
  let subSectionConfig = null;

  for (const section of Object.values(currentConfig)) {
    if (section && typeof section === 'object') {
      for (const prop in section) {
        if (prop.endsWith('Config') && section[prop] && section[prop].id === currentSectionId) {
          parentSection = section;
          subSectionConfig = section[prop];
          break;
        }
      }
    }
    if (parentSection) break;
  }
  
  if (currentConfig[currentSectionId]) {
    Object.assign(context, currentConfig[currentSectionId]);
  } else if (subSectionConfig) {
    Object.assign(context, subSectionConfig);
  }

  for (const sectionKey in currentConfig) {
    if (Object.prototype.hasOwnProperty.call(currentConfig, sectionKey)) {
      context[`${sectionKey}Config`] = currentConfig[sectionKey];
      if (typeof currentConfig[sectionKey] === 'object' && currentConfig[sectionKey] !== null) {
        for (const subKey in currentConfig[sectionKey]) {
          if (Object.prototype.hasOwnProperty.call(currentConfig[sectionKey], subKey) && subKey.endsWith('Config')) {
            context[subKey] = currentConfig[sectionKey][subKey];
          }
        }
      }
    }
  }

  context.attachState = attachState || {};

  if (globalDropdownValues) {
    Object.assign(context, globalDropdownValues);
  }

  try {
    let safeConditionStr = conditionStr.replace(/config\./g, '').replace(/currentConfig\./g, '');

    const conditionFunction = new Function(...Object.keys(context), `return !!(${safeConditionStr});`);
    return conditionFunction(...Object.values(context));
  } catch (e) {
    logger.error(`Error evaluating condition "${conditionStr}":`, e);
    return false;
  }
}

const findParentSection = (subSectionId, sectionsConfig) => {
  return sectionsConfig.find(s => s.components?.subSections?.some(sub => sub.id === subSectionId));
};

const getValueFromState = (key, cmdSectionId, config, sectionsConfig) => {
  const parentSection = findParentSection(cmdSectionId, sectionsConfig);

  if (key.includes('.')) {
    const [configName, prop] = key.split('.');
    
    const topLevelSectionId = configName.replace('Config', '');
    if (config[topLevelSectionId] && config[topLevelSectionId][prop] !== undefined) {
      return config[topLevelSectionId][prop];
    }

    for (const section of Object.values(config)) {
      if (section && typeof section === 'object' && section[configName] && section[configName][prop] !== undefined) {
        return section[configName][prop];
      }
    }
    return undefined;
  }
  
  if (parentSection) {
    const subConfigName = `${cmdSectionId.replace(/-sub$/, '')}Config`;
    if (config[parentSection.id]?.[subConfigName]?.[key] !== undefined) {
      return config[parentSection.id][subConfigName][key];
    }
    const value = config[parentSection.id]?.[key];
    if ((key === 'deploymentType' || key === 'mode') && typeof value === 'object' && value !== null && value.value) {
      return value.value;
    }
    return value;
  }

  const value = config[cmdSectionId]?.[key];
  if ((key === 'deploymentType' || key === 'mode') && typeof value === 'object' && value !== null && value.value) {
    return value.value;
  }
  return value;
};

function generateCommandList(config, globalDropdowns, {
  attachState = {},
  configSidebarCommands = [],
  configSidebarSectionsActual = [],
  showTestSections = false,
  discoveredVersions = {}
} = {}) {
  const commands = [];
  const generatedCommandSectionIds = new Set();

  configSidebarCommands.forEach((commandDef, index) => {
    const { id: cmdSectionId, conditions, command } = commandDef;
    const commandDefinitionId = index;

    const isDisplayableSectionOrSubSection = configSidebarSectionsActual.some(s =>
      s.id === cmdSectionId || s.components?.subSections?.some(sub => sub.id === cmdSectionId)
    );

    if (!isDisplayableSectionOrSubSection) {
      return;
    }

    let effectiveSectionDefForTestCheck = configSidebarSectionsActual.find(s => s.id === cmdSectionId) 
      || findParentSection(cmdSectionId, configSidebarSectionsActual);
    if (effectiveSectionDefForTestCheck?.testSection && !showTestSections) {
      return;
    }

    let shouldInclude = true;
    let isSubSectionCommand = false;

    if (conditions) {
      for (const [key, expectedValue] of Object.entries(conditions)) {
        let actualValue;
        if (key.startsWith('attachState.')) {
          actualValue = attachState[key.substring(12)];
        } else {
          actualValue = getValueFromState(key, cmdSectionId, config, configSidebarSectionsActual);
        }

        if (actualValue !== expectedValue) {
          shouldInclude = false;
          break;
        }
      }
    }

    if (!shouldInclude) return;

    let finalCommand = command.base;

    if (command.modifiers) {
      command.modifiers.forEach(modifier => {
        const conditionMet = evaluateCondition(modifier.condition, config, cmdSectionId, attachState, globalDropdowns);
        if (conditionMet) {
          if (modifier.append) {
            finalCommand += modifier.append;
          } else if (modifier.replace) {
            finalCommand = modifier.replace;
          }
        }
      });
    }

    if (command.postModifiers) {
      finalCommand += command.postModifiers;
    }

    if (command.excludes) {
      command.excludes.forEach(exclude => {
        const conditionMet = evaluateCondition(exclude.condition, config, cmdSectionId, attachState, globalDropdowns);
        if (conditionMet && exclude.append) {
          finalCommand += exclude.append;
        }
      });
    }

    if (command.finalAppend) {
      finalCommand += command.finalAppend;
    }

    if (command.prefix) {
      finalCommand = command.prefix + finalCommand;
    }

    finalCommand = substituteCommandVariables(finalCommand, discoveredVersions, globalDropdowns, config, cmdSectionId, configSidebarSectionsActual);

    let tabTitle = command.tabTitle;
    if (typeof tabTitle === 'object') {
      tabTitle = command.tabTitle.base;
      if (command.tabTitle.conditionalAppends) {
        command.tabTitle.conditionalAppends.forEach(append => {
          const conditionMet = evaluateCondition(append.condition, config, cmdSectionId, attachState, globalDropdowns);
          if (conditionMet) {
            tabTitle += append.append;
          }
        });
      }
    }

    const resolvedAssociatedContainers = [];
    if (command.associatedContainers) {
      command.associatedContainers.forEach(containerAssoc => {
        if (typeof containerAssoc === 'string') {
          resolvedAssociatedContainers.push(containerAssoc);
        } else if (typeof containerAssoc === 'object' && containerAssoc.name) {
          if (!containerAssoc.condition || evaluateCondition(containerAssoc.condition, config, cmdSectionId, attachState, globalDropdowns)) {
            resolvedAssociatedContainers.push(containerAssoc.name);
          }
        }
      });
    }

    commands.push({
      section: tabTitle,
      command: finalCommand,
      sectionId: cmdSectionId,
      commandDefinitionId: commandDefinitionId,
      isSubSectionCommand: isSubSectionCommand,
      associatedContainers: resolvedAssociatedContainers,
      refreshConfig: command.refreshConfig
    });
    generatedCommandSectionIds.add(cmdSectionId);
  });

  configSidebarSectionsActual.forEach(sectionDef => {
    const sectionId = sectionDef.id;
    const sectionTitle = sectionDef.title;
    if (config[sectionId]?.enabled) {
      const hasCommandConfig = configSidebarCommands.some(cmd => cmd.id === sectionId);
      if (hasCommandConfig) {
        if (!generatedCommandSectionIds.has(sectionId)) {
          commands.push({
            title: sectionTitle,
            sectionId: sectionId,
            type: 'error',
            message: 'No suitable command found for the current configuration.',
            id: `error-${sectionId}-${Date.now()}`
          });
        }
      } else {
        let sectionError = true;
        let sectionErrorMessage = 'No commands configured for this section and no active/valid sub-sections.';
        if (sectionDef.components?.subSections && sectionDef.components.subSections.length > 0) {
          for (const subSectionDef of sectionDef.components.subSections) {
            const subSectionId = subSectionDef.id;
            const subSectionConfigKey = `${subSectionId.replace(/-sub$/, '')}Config`;
            if (config[sectionId]?.[subSectionConfigKey]?.enabled) {
              if (generatedCommandSectionIds.has(subSectionId)) {
                sectionError = false;
                break;
              }
            }
          }
        }
        if (sectionError && !generatedCommandSectionIds.has(sectionId)) {
          commands.push({
            title: sectionTitle,
            sectionId: sectionId,
            type: 'error',
            message: sectionErrorMessage,
            id: `error-${sectionId}-${Date.now()}`
          });
        }
      }
    }
    if (sectionDef.components?.subSections) {
      sectionDef.components.subSections.forEach(subSectionDef => {
        const subSectionId = subSectionDef.id;
        const subSectionTitle = subSectionDef.title;
        const parentSectionId = sectionDef.id;
        const subSectionConfigKey = `${subSectionId.replace(/-sub$/, '')}Config`;
        if (config[parentSectionId]?.[subSectionConfigKey]?.enabled) {
          const subHasCommandConfig = configSidebarCommands.some(cmd => cmd.id === subSectionId);
          if (subHasCommandConfig && !generatedCommandSectionIds.has(subSectionId)) {
            commands.push({
              title: subSectionTitle,
              sectionId: subSectionId,
              type: 'error',
              message: 'No suitable command found for the current configuration.',
              id: `error-${subSectionId}-${Date.now()}`
            });
          }
        }
      });
    }
  });

  return commands;
}

function substituteCommandVariables(command, discoveredVersions = {}, globalDropdowns = {}, config = {}, cmdSectionId = null, configSidebarSectionsActual = []) {
  if (!command) return '';

  return command.replace(/\${(\w+)}/g, (match, varName) => {
    if (discoveredVersions[varName]) {
      return discoveredVersions[varName];
    }
    if (globalDropdowns[varName]) {
      return globalDropdowns[varName];
    }
    if (cmdSectionId) {
      let replacementValue = match;
      let found = false;

      let parentSectionId = null;
      let subSectionConfigObjectName = null;
      const currentCommandSectionIsSubSection = configSidebarSectionsActual.some(s => {
        if (s.components?.subSections?.some(sub => sub.id === cmdSectionId)) {
          parentSectionId = s.id;
          subSectionConfigObjectName = `${cmdSectionId.replace(/-sub$/, '')}Config`;
          return true;
        }
        return false;
      });

      if (currentCommandSectionIsSubSection && parentSectionId) {
        if (config[parentSectionId]?.[varName] !== undefined) {
          replacementValue = config[parentSectionId][varName];
          found = true;
        } else if (subSectionConfigObjectName && config[parentSectionId]?.[subSectionConfigObjectName]?.[varName] !== undefined) {
          replacementValue = config[parentSectionId][subSectionConfigObjectName][varName];
          found = true;
        }
      } else {
        if (config[cmdSectionId]?.[varName] !== undefined) {
          replacementValue = config[cmdSectionId][varName];
          found = true;
        }
      }
      
      if (found) return replacementValue;
    }
    return match; // Return original if no substitution found
  });
}

module.exports = { 
  evaluateCondition, 
  evaluateCommandCondition: evaluateCondition, // Alias for backward compatibility
  generateCommandList, 
  substituteCommandVariables 
};
