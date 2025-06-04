function evaluateCondition(conditionStr, currentConfig, currentSectionId, attachState = {}, globalDropdownValues = {}) {
  const context = {};

  if (currentConfig[currentSectionId]) {
    Object.assign(context, currentConfig[currentSectionId]);
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
    let safeConditionStr = conditionStr;
    safeConditionStr = safeConditionStr.replace(/config\./g, '').replace(/currentConfig\./g, '');

    const conditionFunction = new Function(...Object.keys(context), `return !!(${safeConditionStr});`);
    const result = conditionFunction(...Object.values(context));
    return result;
  } catch (e) {
    return false;
  }
}

function generateCommandList(config, globalDropdowns, {
  attachState = {},
  configSidebarCommands = [],
  configSidebarSectionsActual = [],
  showTestSections = false
} = {}) {
  const commands = [];
  const generatedCommandSectionIds = new Set();

  configSidebarCommands.forEach((commandDef, index) => {
    const { sectionId: cmdSectionId, conditions, command } = commandDef;
    const commandDefinitionId = index;

    const isDisplayableSectionOrSubSection = configSidebarSectionsActual.some(s =>
      s.id === cmdSectionId || (s.components?.subSections?.some(sub => sub.id === cmdSectionId))
    );

    if (!isDisplayableSectionOrSubSection) {
      return;
    }

    let effectiveSectionDefForTestCheck = configSidebarSectionsActual.find(s => s.id === cmdSectionId);
    if (!effectiveSectionDefForTestCheck) {
      const parentSection = configSidebarSectionsActual.find(s => s.components?.subSections?.some(sub => sub.id === cmdSectionId));
      if (parentSection) {
        effectiveSectionDefForTestCheck = parentSection;
      }
    }

    if (effectiveSectionDefForTestCheck?.testSection && !showTestSections) {
      return;
    }

    let shouldInclude = true;
    let isSubSectionCommand = false;

    if (conditions) {
      Object.entries(conditions).forEach(([key, expectedValue]) => {
        let actualValue;
        isSubSectionCommand = key.includes('Config');

        if (key.includes('.')) {
          const [leftPart, propertyToAccess] = key.split('.', 2);
          if (leftPart.endsWith('attachState')) {
            actualValue = attachState?.[propertyToAccess];
          } else if (leftPart.endsWith('Config')) {
            const configObjectName = leftPart;
            if (propertyToAccess === 'enabled') {
              const sectionIdToEvaluate = configObjectName.replace('Config', '');
              if (config[sectionIdToEvaluate] !== undefined) {
                actualValue = config[sectionIdToEvaluate]?.enabled;
              } else {
                let parentSectionIdForSub = null;
                let subSectionActualConfigObject = null;
                for (const topLvlId in config) {
                  if (config[topLvlId] && typeof config[topLvlId] === 'object' && configObjectName in config[topLvlId]) {
                    parentSectionIdForSub = topLvlId;
                    subSectionActualConfigObject = config[parentSectionIdForSub]?.[configObjectName];
                    break;
                  }
                }
                if (subSectionActualConfigObject) {
                  actualValue = subSectionActualConfigObject.enabled;
                } else {
                  actualValue = undefined;
                }
              }
            } else {
              let parentSectionIdForConfigObject = null;
              for (const topLevelSectionIdInState in config) {
                if (config[topLevelSectionIdInState] && typeof config[topLevelSectionIdInState] === 'object' && configObjectName in config[topLevelSectionIdInState]) {
                  parentSectionIdForConfigObject = topLevelSectionIdInState;
                  break;
                }
              }
              if (parentSectionIdForConfigObject) {
                actualValue = config[parentSectionIdForConfigObject]?.[configObjectName]?.[propertyToAccess];
              } else {
                actualValue = undefined;
              }
            }
          } else {
            actualValue = key.split('.').reduce((obj, prop) => obj?.[prop], config[cmdSectionId]);
          }
        } else {
          let targetObjectForSimpleKey;
          let parentOfCmdSection = null;
          configSidebarSectionsActual.forEach(s => {
            if (s.components?.subSections?.some(sub => sub.id === cmdSectionId)) {
              parentOfCmdSection = s.id;
            }
          });

          if (key.endsWith('Selected') && parentOfCmdSection) {
            targetObjectForSimpleKey = config[parentOfCmdSection];
          } else if (parentOfCmdSection) {
            const subConfigObjectName = `${cmdSectionId.replace(/-sub$/, '')}Config`;
            targetObjectForSimpleKey = config[parentOfCmdSection]?.[subConfigObjectName];
          } else {
            targetObjectForSimpleKey = config[cmdSectionId];
          }
          actualValue = targetObjectForSimpleKey?.[key];
        }
        shouldInclude = shouldInclude && actualValue === expectedValue;
      });
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

    finalCommand = finalCommand.replace(/\$\{(\w+)\}/g, (match, varName) => {
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

      if (!found && globalDropdowns?.[varName] !== undefined) {
        replacementValue = globalDropdowns[varName];
        found = true;
      }

      if (!found && varName === 'mode') {
        if (currentCommandSectionIsSubSection && parentSectionId && subSectionConfigObjectName) {
          replacementValue = config[parentSectionId]?.[subSectionConfigObjectName]?.mode || match;
          if (replacementValue !== match) found = true;
        } else if (config[cmdSectionId]?.mode !== undefined) {
          replacementValue = config[cmdSectionId]?.mode || match;
          if (replacementValue !== match) found = true;
        }
      }

      return replacementValue;
    });

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
      const hasCommandConfig = configSidebarCommands.some(cmd => cmd.sectionId === sectionId);
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
          const subHasCommandConfig = configSidebarCommands.some(cmd => cmd.sectionId === subSectionId);
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

module.exports = { evaluateCondition, generateCommandList };
