const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    if (arg.includes('=')) {
      // Handle --key=value format
      const equalIndex = arg.indexOf('=');
      const key = arg.slice(2, equalIndex);
      const value = arg.slice(equalIndex + 1);
      config[key] = value;
    } else {
      // Handle --key value format
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        config[key] = value;
        i++; // Skip next argument as it's the value
      } else {
        config[key] = true; // Boolean flag
      }
    }
  }
}

// Configuration will be used by functions below

// Default configuration
const {
  duration = 'infinite', // 'infinite' or number of seconds
  result = 'success', // 'success' or 'fail'
  containers = '', // comma-separated container names
  silent = false, // boolean
  variables = '', // comma-separated key=value pairs
  tabTitle = 'Generic Command'
} = config;

// Parse variables
const parsedVariables = {};
if (variables) {
  variables.split(',').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value) {
      parsedVariables[key] = value;
    }
  });
}

// Container names array
const containerNames = containers ? containers.split(',').filter(c => c.trim()) : [];

console.log(`🚀 Starting Generic Command Simulator`);
console.log(`📋 Tab Title: ${tabTitle}`);
console.log(`⏱️  Duration: ${duration === 'infinite' ? 'Running indefinitely' : `${duration} seconds`}`);
console.log(`✅ Expected Result: ${result}`);
console.log(`🔇 Silent Mode: ${silent ? 'Enabled' : 'Disabled'}`);

if (Object.keys(parsedVariables).length > 0) {
  console.log(`📝 Variables:`);
  Object.entries(parsedVariables).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

if (containerNames.length > 0) {
  console.log(`🐳 Associated Containers: ${containerNames.join(', ')}`);
}

// Ensure containers are running
const managedContainers = [];
async function ensureContainersRunning() {
  for (const containerName of containerNames) {
    try {
      console.log(`🐳 Checking container: ${containerName}`);
      
      // Check if container exists
      const inspectProcess = spawn('docker', ['inspect', containerName], { stdio: 'pipe' });
      
      const containerExists = await new Promise((resolve) => {
        inspectProcess.on('close', (code) => {
          resolve(code === 0);
        });
        inspectProcess.on('error', () => resolve(false));
      });

      if (containerExists) {
        // Container exists, check if it's running
        const psProcess = spawn('docker', ['ps', '-q', '-f', `name=${containerName}`], { stdio: 'pipe' });
        let output = '';
        psProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        const isRunning = await new Promise((resolve) => {
          psProcess.on('close', () => {
            resolve(output.trim().length > 0);
          });
          psProcess.on('error', () => resolve(false));
        });

        if (isRunning) {
          console.log(`✅ Container ${containerName} is already running`);
          managedContainers.push(containerName);
        } else {
          // Container exists but not running, start it
          console.log(`🔄 Starting existing container: ${containerName}`);
          const startProcess = spawn('docker', ['start', containerName], { stdio: 'pipe' });
          
          await new Promise((resolve) => {
            startProcess.on('close', (code) => {
              if (code === 0) {
                console.log(`✅ Container ${containerName} started successfully`);
                managedContainers.push(containerName);
              } else {
                console.log(`⚠️  Failed to start container ${containerName}`);
              }
              resolve();
            });
            startProcess.on('error', () => {
              console.log(`⚠️  Error starting container ${containerName}`);
              resolve();
            });
          });
        }
      } else {
        // Container doesn't exist, create it
        console.log(`🐳 Creating new container: ${containerName}`);
        const createProcess = spawn('docker', [
          'run', '-d', '--name', containerName,
          '--rm', // Auto-remove when stopped
          'alpine:latest', 'sleep', '3600' // Sleep for 1 hour
        ], { stdio: 'pipe' });

        await new Promise((resolve) => {
          createProcess.on('close', (code) => {
            if (code === 0) {
              managedContainers.push(containerName);
              console.log(`✅ Container ${containerName} created successfully`);
            } else {
              console.log(`⚠️  Failed to create container ${containerName} (code: ${code})`);
            }
            resolve();
          });
          createProcess.on('error', (error) => {
            console.log(`⚠️  Error creating container ${containerName}: ${error.message}`);
            resolve();
          });
        });
      }
    } catch (error) {
      console.log(`⚠️  Error with container ${containerName}: ${error.message}`);
    }
  }
}

// Cleanup function
async function cleanup() {
  console.log(`\n🧹 Cleaning up...`);
  
  // Only cleanup containers we managed and only if they should be removed
  // For testing purposes, we'll keep containers running as specified in requirements
  if (containerNames.length > 0 && duration !== 'infinite') {
    console.log(`🐳 Containers will continue running: ${containerNames.join(', ')}`);
  }
}

// Status printing function
function printStatus() {
  if (!silent) {
    const timestamp = new Date().toISOString();
    console.log(`⏰ [${timestamp}] Command still running... (${tabTitle})`);
  }
}

// Main execution
async function main() {
  // Ensure containers are running if specified
  if (containerNames.length > 0) {
    await ensureContainersRunning();
  }

  console.log(`\n🏃 Command execution started\n`);

  let statusInterval;
  
  // Set up status printing if not silent
  if (!silent) {
    statusInterval = setInterval(printStatus, 3000); // Print every 3 seconds
  }

  // Handle duration
  if (duration === 'infinite') {
    console.log(`♾️  Running indefinitely... (Press Ctrl+C to stop)`);
    
    // Use a promise to handle interruption
    const interruptPromise = new Promise((resolve) => {
      process.on('SIGINT', async () => {
        console.log(`\n⏹️  Received interrupt signal`);
        if (statusInterval) clearInterval(statusInterval);
        await cleanup();
        console.log(result === 'success' ? `✅ Command completed successfully` : `❌ Command failed as requested`);
        resolve();
      });
      
      process.on('SIGTERM', async () => {
        console.log(`\n⏹️  Received termination signal`);
        if (statusInterval) clearInterval(statusInterval);
        await cleanup();
        console.log(result === 'success' ? `✅ Command completed successfully` : `❌ Command failed as requested`);
        resolve();
      });
    });

    // Wait for interruption
    await interruptPromise;
    
  } else {
    // Run for specified duration
    const durationMs = parseInt(duration) * 1000;
    console.log(`⏱️  Running for ${duration} seconds...`);
    
    setTimeout(async () => {
      console.log(`\n⏰ Duration completed`);
      if (statusInterval) clearInterval(statusInterval);
      await cleanup();
      
      if (result === 'success') {
        console.log(`✅ Command completed successfully`);
      } else {
        console.log(`❌ Command failed as requested`);
      }
    }, durationMs);
  }
}

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  console.error(`💥 Uncaught exception: ${error.message}`);
  await cleanup();
  // Let the process exit naturally after cleanup
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error(`💥 Unhandled rejection at:`, promise, 'reason:', reason);
  await cleanup();
  // Let the process exit naturally after cleanup
});

// Handle help flag and start execution
if (config.help) {
  console.log(`
Generic Command Simulator

Usage: node scripts/generic-command-simulator.js [options]

Options:
  --duration=<seconds|infinite>  How long to run (default: infinite)
  --result=<success|fail>        Exit result (default: success)
  --containers=<list>            Comma-separated container names
  --silent=<true|false>          Silent mode (default: false)
  --variables=<list>             Comma-separated key=value pairs
  --tabTitle=<title>             Tab title for display
  --help                         Show this help message

Examples:
  node scripts/generic-command-simulator.js --duration=30 --result=success
  node scripts/generic-command-simulator.js --duration=infinite --containers=mysql,redis
  node scripts/generic-command-simulator.js --variables=nodeVersion=18.0.0,port=3000
  `);
} else {
  // Start the simulation
  main().catch(async (error) => {
    console.error(`💥 Error in main execution: ${error.message}`);
    await cleanup();
    throw error;
  });
} 