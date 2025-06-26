#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Verification responses database
const VERIFICATION_RESPONSES = {
  // Cloud verifications
  'cloudGcloudCLI': {
    success: 'Google Cloud SDK 515.0.0\nbq 2.1.14\ncore 2025.03.14\ngcloud-crc32c 1.0.0\ngke-gcloud-auth-plugin 0.5.10\ngsutil 5.33',
    failure: 'gcloud: command not found',
    type: 'outputContains',
    expectedValue: 'Google Cloud SDK',
    outputStream: 'stdout'
  },
  'fileExistsTest': {
    success: 'exists',
    failure: 'missing',
    type: 'outputContains',
    expectedValue: 'exists',
    outputStream: 'stdout'
  },
  'cloudKubectlCLI': {
    success: 'Client Version: v1.32.3\nKustomize Version: v5.5.0',
    failure: 'kubectl: command not found',
    type: 'outputContains',
    expectedValue: 'Client Version:',
    outputStream: 'stdout'
  },
  'cloudKubectx': {
    success: 'kubectx help output here',
    failure: '',
    type: 'commandSuccess'
  },
  
  // Container Runtime verifications
  'dockerRunning': {
    success: '24.0.7',
    failure: 'Cannot connect to the Docker daemon',
    type: 'commandSuccess'
  },
  'dockerDaemon': {
    success: 'CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES',
    failure: 'Cannot connect to the Docker daemon',
    type: 'commandSuccess'
  },
  'rancherDesktop': {
    success: 'rdctl version v1.13.1',
    failure: 'rdctl: command not found',
    type: 'commandSuccess'
  },
  'containerRuntime': {
    success: '24.0.7',
    failure: 'Cannot connect to the Docker daemon',
    type: 'commandSuccess'
  },
  
  // Node.js verifications
  'nodeJs': {
    success: '       v16.20.2\n->     v22.16.0\ndefault -> node (-> v22.16.0)',
    failure: 'nvm: command not found',
    type: 'outputContains',
    expectedValue: ['v15.', 'v16.'],
    outputStream: 'stdout'
  },
  'nvmInstalled': {
    success: '0.40.2',
    failure: 'nvm: command not found',
    type: 'commandSuccess'
  },
  
  // Go verifications
  'goInstalled': {
    success: 'go version go1.21.5 darwin/arm64',
    failure: 'go: command not found',
    type: 'outputContains',
    expectedValue: 'go version go1'
  },
  'goPathIncludes': {
    success: () => {
      const gopath = process.env.GOPATH || '$HOME/go';
      return `/Users/user/go/bin:/usr/local/bin:/usr/bin:/bin:${gopath}/bin`;
    },
    failure: '/usr/local/bin:/usr/bin:/bin',
    type: 'outputContains',
    expectedValue: '$GOPATH/bin'
  },
  
  // Additional verifications
  'javaVersion': {
    success: 'openjdk version "17.0.14" 2025-01-21 LTS\nOpenJDK Runtime Environment (build 17.0.14+1-LTS)',
    failure: 'java: command not found',
    type: 'outputContains',
    expectedValue: 'openjdk version "17.',
    outputStream: 'stderr'
  },
  'homebrewInstalled': {
    success: 'Homebrew 4.5.8\nHomebrew/homebrew-core (git revision 1234567; last commit 2025-01-01)',
    failure: 'brew: command not found',
    type: 'commandSuccess'
  },
  
  // Configuration sidebar verifications
  'ChromiumInstalled': {
    success: 'Chromium 125.0.6422.141',
    failure: 'chromium: command not found',
    type: 'commandSuccess'
  }
};

// Session state file path - use a simple approach with timestamp-based cleanup
const SESSION_STATE_FILE = path.join(__dirname, '.verification-session-state.json');
const SESSION_LOCK_FILE = path.join(__dirname, '.verification-session-state.lock');

// Removed debug logging - can be re-enabled for troubleshooting

// Clean up old session files and check if session is stale
function cleanupOldSessionFiles() {
  try {
    // Clean up any old PID-based session files
    const files = fs.readdirSync(__dirname);
    const oldSessionFiles = files.filter(file => 
      file.startsWith('.verification-session-state-') && 
      file.endsWith('.json') && 
      file !== '.verification-session-state.json'
    );
    
    for (const file of oldSessionFiles) {
      const filePath = path.join(__dirname, file);
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        // Silently ignore cleanup errors
      }
    }
    
    // Check if current session file is stale (older than 1 hour)
    if (fs.existsSync(SESSION_STATE_FILE)) {
      const stats = fs.statSync(SESSION_STATE_FILE);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      if (ageHours > 1) {
        try {
          fs.unlinkSync(SESSION_STATE_FILE);
        } catch (error) {
          // Silently ignore cleanup errors
        }
      }
    }
  } catch (error) {
    // Silently ignore cleanup errors
  }
}

// Get a consistent session identifier regardless of how we're spawned
function getSessionId() {
  // Use the main electron PID set by main.js
  if (process.env.MAIN_ELECTRON_PID) {
    return parseInt(process.env.MAIN_ELECTRON_PID);
  }
  
  // Fallback for cases where environment variable isn't set
  return process.ppid || process.pid;
}

// Load session state from file and validate it's from the same app session
function loadSessionState() {
  try {
    if (fs.existsSync(SESSION_STATE_FILE)) {
      const data = fs.readFileSync(SESSION_STATE_FILE, 'utf8');
      const sessionData = JSON.parse(data);
      
      // Check if this session is from the same app instance
      const currentSessionId = getSessionId();
      if (sessionData._metadata && sessionData._metadata.sessionId) {
        if (sessionData._metadata.sessionId !== currentSessionId) {
          return {}; // Different app instance, return empty state
        }
      } else {
        return {}; // No metadata, treat as stale
      }
      
      // Return just the verification states (without metadata)
      const { _metadata, ...verificationStates } = sessionData;
      return verificationStates;
    }
  } catch (error) {
    // Silently handle errors and return empty state
  }
  return {};
}

// Save session state to file (atomic write with retry to handle race conditions)
function saveSessionState(state) {
  // Add metadata to track which app instance created this session
  const sessionData = {
    ...state,
    _metadata: {
      sessionId: getSessionId(),
      timestamp: Date.now(),
      version: '1.0'
    }
  };
  
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tempFile = SESSION_STATE_FILE + `.tmp.${Date.now()}.${Math.random()}`;
      fs.writeFileSync(tempFile, JSON.stringify(sessionData, null, 2));
      fs.renameSync(tempFile, SESSION_STATE_FILE);
      return; // Success, exit early
    } catch (error) {
      // If last retry, give up silently
      if (i === maxRetries - 1) {
        return;
      }
      // Brief delay before retry
      const delay = Math.random() * 10;
      const start = Date.now();
      while (Date.now() - start < delay) {
        // Busy wait for very short time
      }
    }
  }
}

// Clean up old session files and load current session state
cleanupOldSessionFiles();
let sessionState = loadSessionState();

function getVerificationResponse(verificationId, shouldSucceed) {
  const verification = VERIFICATION_RESPONSES[verificationId];
  if (!verification) {
    console.error(`Unknown verification: ${verificationId}`);
    process.exit(1);
  }
  
  let response = shouldSucceed ? verification.success : verification.failure;
  // Handle function-based responses
  if (typeof response === 'function') {
    response = response();
  }
  
  const outputStream = verification.outputStream || 'stdout';
  
  if (outputStream === 'stderr') {
    console.error(response);
  } else {
    console.log(response);
  }
  
  // For commandSuccess type, exit with appropriate code
  if (verification.type === 'commandSuccess') {
    process.exit(shouldSucceed ? 0 : 1);
  }
  
  // For outputContains, always exit 0 (command succeeded in running)
  process.exit(0);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: verification-simulator.js <verify|fix> <verification-id>');
    console.error('');
    console.error('Available verifications:');
    Object.keys(VERIFICATION_RESPONSES).sort().forEach(id => {
      console.error(`  - ${id}`);
    });
    process.exit(1);
  }
  
  const [mode, verificationId] = args;
  
  if (mode === 'verify') {
    // If verification was explicitly fixed in session, it should succeed
    if (sessionState[verificationId] === true) {
      getVerificationResponse(verificationId, true);
      return;
    }
    
    // Check environment variable for global override
    const shouldFail = process.env.VERIFICATION_SHOULD_FAIL === 'true';
    // Default to success unless explicitly set to fail in session or global override
    const shouldSucceed = (sessionState[verificationId] !== false) && !shouldFail;
    
    getVerificationResponse(verificationId, shouldSucceed);
    
  } else if (mode === 'fix') {
    // Set this verification to succeed for current session only
    sessionState[verificationId] = true;
    
    // Save session state to file
    saveSessionState(sessionState);
    
    console.log(`Fixed verification: ${verificationId} - will now return success`);
    process.exit(0);
    
  } else {
    console.error(`Invalid mode: ${mode}. Use 'verify' or 'fix'.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 