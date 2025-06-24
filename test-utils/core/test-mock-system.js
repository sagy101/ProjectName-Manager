#!/usr/bin/env node

/**
 * Mock System Validation Test
 * 
 * This script validates that the mock command system is working correctly.
 * It tests various patterns and verifies file creation.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class MockSystemTest {
  constructor() {
    this.results = [];
    this.tempFiles = [];
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      await testFn();
      console.log(`✅ ${name} - PASSED`);
      this.results.push({ name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      this.results.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async runMockCommand(args, duration = 10000) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['mock-command.js', ...args], {
        cwd: __dirname,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout handling
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${duration}ms`));
      }, duration);

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ code, stdout, stderr });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async findStatusFile(service) {
    const files = await fs.readdir('/tmp');
    const statusFile = files.find(f => f.startsWith(`mock-status-${service}-`));
    return statusFile ? path.join('/tmp', statusFile) : null;
  }

  async findContainerFile(containerName) {
    const filePath = path.join('/tmp', `mock-container-${containerName}.json`);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }

  async cleanup() {
    // Clean up temp files
    for (const file of this.tempFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Clean up mock files
    try {
      const files = await fs.readdir('/tmp');
      const mockFiles = files.filter(f => f.startsWith('mock-'));
      for (const file of mockFiles) {
        await fs.unlink(path.join('/tmp', file));
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Mock System Validation Tests\n');

    // Test 1: Basic success pattern
    await this.runTest('Basic Success Pattern', async () => {
      const result = await this.runMockCommand(['--service=test1', '--pattern=success-3'], 5000);
      
      if (result.code !== 0) {
        throw new Error(`Expected exit code 0, got ${result.code}`);
      }

      if (!result.stdout.includes('Service started')) {
        throw new Error('Expected "Service started" in output');
      }

      if (!result.stdout.includes('Completed successfully')) {
        throw new Error('Expected "Completed successfully" in output');
      }
    });

    // Test 2: Failure pattern
    await this.runTest('Failure Pattern', async () => {
      const result = await this.runMockCommand(['--service=test2', '--pattern=fail-3'], 5000);
      
      if (result.code !== 1) {
        throw new Error(`Expected exit code 1, got ${result.code}`);
      }

      if (!result.stdout.includes('Service failed with error')) {
        throw new Error('Expected "Service failed with error" in output');
      }
    });

    // Test 3: Status file creation
    await this.runTest('Status File Creation', async () => {
      // Start a command that runs for a bit
      const promise = this.runMockCommand(['--service=status-test', '--pattern=success-4'], 6000);
      
      // Wait a moment for file creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusFile = await this.findStatusFile('status-test');
      if (!statusFile) {
        throw new Error('Status file not created');
      }

      this.tempFiles.push(statusFile);

      const content = await fs.readFile(statusFile, 'utf8');
      const status = JSON.parse(content);

      if (status.service !== 'status-test') {
        throw new Error('Incorrect service name in status file');
      }

      if (!status.timestamp) {
        throw new Error('Missing timestamp in status file');
      }

      // Wait for command to complete
      await promise;
    });

    // Test 4: Container simulation
    await this.runTest('Container Simulation', async () => {
      // Start backend service which has containers configured
      const promise = this.runMockCommand(['--service=backend-service', '--pattern=success-6'], 8000);
      
      // Wait for container files
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const dbFile = await this.findContainerFile('backend-db');
      const cacheFile = await this.findContainerFile('backend-cache');
      
      if (!dbFile) {
        throw new Error('backend-db container file not created');
      }

      if (!cacheFile) {
        throw new Error('backend-cache container file not created');
      }

      this.tempFiles.push(dbFile, cacheFile);

      // Check container content
      const dbContent = JSON.parse(await fs.readFile(dbFile, 'utf8'));
      if (dbContent.name !== 'backend-db') {
        throw new Error('Incorrect container name in db file');
      }

      if (!['creating', 'starting', 'running', 'healthy'].includes(dbContent.status)) {
        throw new Error(`Unexpected db container status: ${dbContent.status}`);
      }

      // Wait for command to complete
      await promise;
    });

    // Test 5: Configuration loading
    await this.runTest('Configuration Loading', async () => {
      const result = await this.runMockCommand(['--service=backend-service', '--pattern=success-2'], 4000);
      
      // Should use config from mock-config.json
      if (!result.stdout.includes('Backend service initializing')) {
        throw new Error('Expected custom configuration message from config file');
      }
    });

    // Test 6: Dynamic pattern parsing
    await this.runTest('Dynamic Pattern Parsing', async () => {
      const result = await this.runMockCommand(['--service=dynamic-test', '--pattern=success-2'], 4000);
      
      if (result.code !== 0) {
        throw new Error(`Expected successful completion, got exit code ${result.code}`);
      }

      // Should complete in about 2 seconds
      const duration = this.extractDuration(result.stdout);
      if (duration < 1500 || duration > 3500) {
        throw new Error(`Expected ~2 second duration, got ${duration}ms`);
      }
    });

    // Print results
    console.log('\n📊 Test Results Summary:');
    console.log('========================');

    let passed = 0;
    let failed = 0;

    for (const result of this.results) {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      if (result.status === 'PASSED') passed++;
      else failed++;
    }

    console.log(`\nTotal: ${this.results.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed! Mock system is working correctly.');
      return true;
    } else {
      console.log('\n❌ Some tests failed. Please check the issues above.');
      return false;
    }
  }

  extractDuration(output) {
    const lines = output.split('\n');
    const startLine = lines.find(l => l.includes('Starting'));
    const endLine = lines.find(l => l.includes('Completed successfully'));

    if (!startLine || !endLine) return 0;

    const startTime = new Date(startLine.match(/\[(.*?)\]/)[1]).getTime();
    const endTime = new Date(endLine.match(/\[(.*?)\]/)[1]).getTime();

    return endTime - startTime;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new MockSystemTest();
  
  tester.runAllTests()
    .then(success => {
      tester.cleanup();
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      tester.cleanup();
      process.exit(1);
    });
}

module.exports = MockSystemTest; 