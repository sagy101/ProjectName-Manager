const fs = require('fs');
const path = require('path');

// Parse command line arguments
const [,, ...args] = process.argv;

if (args.length === 0) {
  console.error('Usage: node extract-mock-commands.js <path-to-project-root>');
  throw new Error('Missing required argument: path-to-project-root');
}

const projectRoot = args[0];

// JSON file paths
const generalEnvPath = path.join(projectRoot, 'src/environment-verification/generalEnvironmentVerifications.json');
const configAboutPath = path.join(projectRoot, 'src/project-config/config/configurationSidebarAbout.json');

// Function to extract command from a command string
function extractBaseCommand(commandStr) {
  if (!commandStr) return null;
  
  // Remove shell redirections and pipes
  const cleanCommand = commandStr.replace(/\s*2>&1\s*/, '').replace(/\s*\|\s*.*$/, '');
  
  // Extract the first word (the command name)
  const parts = cleanCommand.trim().split(/\s+/);
  return parts[0];
}

// Function to extract all commands from a verification object
function extractCommandsFromVerification(verification) {
  const commands = new Set();
  
  if (verification.command) {
    const baseCmd = extractBaseCommand(verification.command);
    if (baseCmd) {
      commands.add({
        name: baseCmd,
        fullCommand: verification.command,
        checkType: verification.checkType || 'commandSuccess',
        expectedValue: verification.expectedValue || '',
        outputStream: verification.outputStream || 'stdout',
        source: 'verification'
      });
    }
  }
  
  if (verification.fixCommand) {
    const baseCmd = extractBaseCommand(verification.fixCommand);
    if (baseCmd) {
      commands.add({
        name: baseCmd,
        fullCommand: verification.fixCommand,
        checkType: 'commandSuccess',
        expectedValue: '',
        outputStream: 'stdout',
        source: 'fixCommand'
      });
    }
  }
  
  return Array.from(commands);
}

// Function to process general environment verifications
function processGeneralEnvironmentVerifications(filePath) {
  const commands = new Map();
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content);
    
    // Process dropdown selectors in header
    if (config.header && config.header.dropdownSelectors) {
      config.header.dropdownSelectors.forEach(selector => {
        if (selector.command) {
          const baseCmd = extractBaseCommand(selector.command);
          if (baseCmd) {
            commands.set(baseCmd, {
              name: baseCmd,
              fullCommand: selector.command,
              checkType: 'commandSuccess',
              expectedValue: '',
              outputStream: 'stdout',
              source: 'dropdownSelector'
            });
          }
        }
        
        if (selector.commandOnChange) {
          const baseCmd = extractBaseCommand(selector.commandOnChange);
          if (baseCmd) {
            commands.set(baseCmd, {
              name: baseCmd,
              fullCommand: selector.commandOnChange,
              checkType: 'commandSuccess',
              expectedValue: '',
              outputStream: 'stdout',
              source: 'dropdownSelector'
            });
          }
        }
      });
    }
    
    // Process categories and verifications
    if (config.categories) {
      config.categories.forEach(categoryWrapper => {
        if (categoryWrapper.category && categoryWrapper.category.verifications) {
          categoryWrapper.category.verifications.forEach(verification => {
            const cmds = extractCommandsFromVerification(verification);
            cmds.forEach(cmd => {
              commands.set(cmd.name, cmd);
            });
          });
        }
      });
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  
  return commands;
}

// Function to process configuration sidebar about
function processConfigurationSidebarAbout(filePath) {
  const commands = new Map();
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content);
    
    config.forEach(section => {
      if (section.verifications) {
        section.verifications.forEach(verification => {
          const cmds = extractCommandsFromVerification(verification);
          cmds.forEach(cmd => {
            commands.set(cmd.name, cmd);
          });
        });
      }
    });
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  
  return commands;
}

// Hardcoded values to match original script behavior
const ORIGINAL_MOCK_VALUES = {
  'gcloud': {
    '--version': 'Google Cloud SDK 450.0.0',
    '*': 'Google Cloud SDK 450.0.0'
  },
  'kubectl': {
    'version --client': 'Client Version: v1.28.4',
    '*': 'Client Version: v1.28.4'
  },
  'kubectx': {
    '--help': '', // Just succeed
    '*': ''
  },
  'docker': {
    'info --format "{{.ServerVersion}}"': '24.0.7',
    'info --format \'{{.ServerVersion}}\'': '24.0.7',
    'ps': 'CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS   NAMES',
    '*': 'Docker version 24.0.7, build afdd53b'
  },
  'go': {
    'version': 'go version go1.21.4 linux/amd64',
    '*': 'go version go1.21.4 linux/amd64'
  },
  'java': {
    '-version': { output: 'openjdk version \\"17.0.8\\" 2023-07-18', stream: 'stderr' },
    '*': { output: 'openjdk version \\"17.0.8\\" 2023-07-18', stream: 'stderr' }
  },
  'brew': {
    '--version': 'Homebrew 4.1.20',
    '*': 'Homebrew 4.1.20'
  },
  'rdctl': {
    'version': 'rdctl version 1.10.1',
    '*': 'rdctl version 1.10.1'
  },
  'chromium': {
    '--version': 'Chromium 125.0.6422.141',
    '*': 'Chromium 125.0.6422.141'
  }
};

// Function to generate mock script content
function generateMockScript(commandName, commandData) {
  // Skip commands that shouldn't be mocked (like system commands from fix commands)
  const skipCommands = ['curl', 'git', 'mkdir', '/bin/bash', 'echo', 'hdiutil', 'cp', 'rm', 'open', 'touch', 'printf', 'source'];
  if (skipCommands.includes(commandName) || commandName.includes('=')) {
    return null; // Skip this command
  }
  
  const commands = Array.isArray(commandData) ? commandData : [commandData];
  
  let script = '#!/bin/bash\n';
  script += `# Mock for: ${commandName}\n`;
  script += `# Generated from JSON configuration\n\n`;
  
  // Use hardcoded values if available, otherwise generate from JSON
  if (ORIGINAL_MOCK_VALUES[commandName]) {
    const mockDef = ORIGINAL_MOCK_VALUES[commandName];
    const patterns = Object.keys(mockDef).filter(key => key !== '*');
    
    if (patterns.length > 0) {
      script += 'case "$*" in\n';
      patterns.forEach(pattern => {
        script += `    "${pattern}")\n`;
        const value = mockDef[pattern];
        if (typeof value === 'object' && value.output) {
          if (value.stream === 'stderr') {
            script += `        echo "${value.output}" >&2\n`;
          } else {
            script += `        echo "${value.output}"\n`;
          }
        } else if (value) {
          script += `        echo "${value}"\n`;
        }
        script += '        ;;\n';
      });
      script += '    *)\n';
      const defaultValue = mockDef['*'];
      if (typeof defaultValue === 'object' && defaultValue.output) {
        if (defaultValue.stream === 'stderr') {
          script += `        echo "${defaultValue.output}" >&2\n`;
        } else {
          script += `        echo "${defaultValue.output}"\n`;
        }
      } else if (defaultValue) {
        script += `        echo "${defaultValue}"\n`;
      }
      script += '        ;;\n';
      script += 'esac\n';
    } else {
      const defaultValue = mockDef['*'];
      if (typeof defaultValue === 'object' && defaultValue.output) {
        if (defaultValue.stream === 'stderr') {
          script += `echo "${defaultValue.output}" >&2\n`;
        } else {
          script += `echo "${defaultValue.output}"\n`;
        }
      } else if (defaultValue) {
        script += `echo "${defaultValue}"\n`;
      }
    }
  } else {
    // Generate from JSON data
    const patterns = [];
    let defaultOutput = '';
    
    commands.forEach(cmd => {
      if (cmd.checkType === 'outputContains' && cmd.expectedValue) {
        if (Array.isArray(cmd.expectedValue)) {
          defaultOutput = cmd.expectedValue[0]; // Use first value
        } else {
          defaultOutput = cmd.expectedValue;
        }
      }
      
              // Handle specific command patterns
        if (cmd.fullCommand) {
          // Escape special regex characters in command name
          const escapedCommandName = commandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const args = cmd.fullCommand.replace(new RegExp(`^${escapedCommandName}\\s*`), '');
          if (args && args !== cmd.fullCommand) { // Make sure we actually removed the command name
            patterns.push({
              pattern: args,
              output: cmd.expectedValue || defaultOutput,
              stream: cmd.outputStream || 'stdout'
            });
          }
        }
    });
    
    if (patterns.length > 0) {
      script += 'case "$*" in\n';
      patterns.forEach(pattern => {
        script += `    "${pattern.pattern}")\n`;
        if (pattern.output) {
          if (pattern.stream === 'stderr') {
            script += `        echo "${pattern.output}" >&2\n`;
          } else {
            script += `        echo "${pattern.output}"\n`;
          }
        }
        script += '        ;;\n';
      });
      script += '    *)\n';
      if (defaultOutput) {
        script += `        echo "${defaultOutput}"\n`;
      }
      script += '        ;;\n';
      script += 'esac\n';
    } else if (defaultOutput) {
      script += `echo "${defaultOutput}"\n`;
    }
  }
  
  script += 'exit 0\n';
  
  return script;
}

// Main execution
function main() {
  const allCommands = new Map();
  
  // Process both JSON files
  const generalCommands = processGeneralEnvironmentVerifications(generalEnvPath);
  const configCommands = processConfigurationSidebarAbout(configAboutPath);
  
  // Merge commands
  generalCommands.forEach((cmd, name) => {
    if (allCommands.has(name)) {
      // Merge with existing command
      const existing = allCommands.get(name);
      if (!Array.isArray(existing)) {
        allCommands.set(name, [existing, cmd]);
      } else {
        existing.push(cmd);
      }
    } else {
      allCommands.set(name, cmd);
    }
  });
  
  configCommands.forEach((cmd, name) => {
    if (allCommands.has(name)) {
      // Merge with existing command
      const existing = allCommands.get(name);
      if (!Array.isArray(existing)) {
        allCommands.set(name, [existing, cmd]);
      } else {
        existing.push(cmd);
      }
    } else {
      allCommands.set(name, cmd);
    }
  });
  
  // Output the results
  console.log('# Commands extracted from JSON files:');
  allCommands.forEach((commandData, commandName) => {
    const mockScript = generateMockScript(commandName, commandData);
    if (mockScript) { // Only output if script generation didn't return null
      console.log(`MOCK_COMMAND:${commandName}`);
      console.log(mockScript);
      console.log('MOCK_COMMAND_END');
    }
  });
}

// Run if called directly
if (require.main === module) {
  main();
} 