#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
    type: 'outputContains',
    expectedValue: '',
    outputStream: 'stdout'
  },
  'containerRuntime': {
    success: '24.0.7',
    failure: 'Cannot connect to the Docker daemon',
    type: 'outputContains',
    expectedValue: '',
    outputStream: 'stdout'
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
    success: '/Users/user/go/bin:/usr/local/bin:/usr/bin:/bin:$GOPATH/bin',
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

// In-memory state to track which verifications should return success
// This resets every time the script is run (no persistence across app restarts)
let inMemoryState = {};

function loadState() {
  return inMemoryState;
}

function saveState(state) {
  inMemoryState = state;
}

function getVerificationResponse(verificationId, shouldSucceed) {
  const verification = VERIFICATION_RESPONSES[verificationId];
  if (!verification) {
    console.error(`Unknown verification: ${verificationId}`);
    process.exit(1);
  }
  
  const response = shouldSucceed ? verification.success : verification.failure;
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
  const state = loadState();
  
  if (mode === 'verify') {
    // Check environment variable for global override
    const shouldFail = process.env.VERIFICATION_SHOULD_FAIL === 'true';
    // Default to success unless explicitly set to fail or global override
    const shouldSucceed = (state[verificationId] !== false) && !shouldFail;
    
    getVerificationResponse(verificationId, shouldSucceed);
    
  } else if (mode === 'fix') {
    // Set this verification to succeed
    state[verificationId] = true;
    saveState(state);
    
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