/**
 * Mock Command System Tests
 * 
 * Tests the core mock command functionality for the testing infrastructure.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Import the MockCommand class directly
const { MockCommand, ContainerManager } = require('../../../test-utils/commands/mock-command.js');

describe('Mock Command System', () => {
  let tempFiles = [];

  // Helper function available to all tests
  async function runMockCommand(args, timeout = 10000, env = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [
        path.join(__dirname, '../../../test-utils/commands/mock-command.js'),
        ...args
      ], {
        stdio: 'pipe',
        env: { ...process.env, ...env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code, stdout, stderr });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  afterEach(async () => {
    // Clean up temp files after each test
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // Ignore cleanup errors
      }
    }
    tempFiles = [];

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
  });

  describe('MockCommand Class', () => {
    test('should parse command line arguments correctly', () => {
      const cmd = new MockCommand(['--service=test-service', '--pattern=success-5']);
      expect(cmd.config.service).toBe('test-service');
      expect(cmd.config.pattern).toBe('success-5');
    });

    test('should parse complex arguments with debug and mode', () => {
      const cmd = new MockCommand(['--service=test-service', '--pattern=success-5', '--debug=run', '--mode=container', '--port=8080']);
      expect(cmd.config.service).toBe('test-service');
      expect(cmd.config.pattern).toBe('success-5');
      expect(cmd.config.debug).toBe('run');
      expect(cmd.config.mode).toBe('container');
      expect(cmd.config.port).toBe('8080');
    });

    test('should use default configuration for unknown service', () => {
      const cmd = new MockCommand(['--service=unknown-service']);
      expect(cmd.config.service).toBe('unknown-service');
      expect(cmd.config.pattern).toBe('infinite');
      expect(cmd.config.logInterval).toBe(10000);
    });

    test('should handle empty arguments', () => {
      const cmd = new MockCommand([]);
      expect(cmd.config.service).toBe('unknown');
      expect(cmd.config.pattern).toBe('infinite');
    });

    test('should generate correct transitions for dynamic patterns', () => {
      const cmd = new MockCommand(['--service=test', '--pattern=success-10']);
      const transitions = cmd.config.transitions;
      
      expect(transitions).toHaveLength(2);
      expect(transitions[0]).toMatchObject({
        at: 2000,
        status: 'running',
        log: 'Service started'
      });
      expect(transitions[1]).toMatchObject({
        at: 10000,
        status: 'success',
        exit: 0,
        log: 'Completed successfully'
      });
    });

    test('should handle fail patterns correctly', () => {
      const cmd = new MockCommand(['--service=test', '--pattern=fail-5']);
      const transitions = cmd.config.transitions;
      
      expect(transitions).toHaveLength(2);
      expect(transitions[1]).toMatchObject({
        at: 5000,
        status: 'error',
        exit: 1,
        log: 'Service failed with error'
      });
    });

    test('should handle timeout patterns correctly', () => {
      const cmd = new MockCommand(['--service=test', '--pattern=timeout-15']);
      const transitions = cmd.config.transitions;
      
      expect(transitions).toHaveLength(2);
      expect(transitions[1]).toMatchObject({
        at: 15000,
        status: 'timeout',
        exit: 124,
        log: 'Operation timed out'
      });
    });

    test('should handle sleep patterns correctly', () => {
      const cmd = new MockCommand(['--service=test', '--pattern=sleep-10']);
      const transitions = cmd.config.transitions;
      
      expect(transitions).toHaveLength(2);
      expect(transitions[1]).toMatchObject({
        at: 10000,
        status: 'sleeping',
        log: 'Service is sleeping'
      });
    });

    test('should handle complex pattern correctly', () => {
      const cmd = new MockCommand(['--service=test', '--pattern=complex']);
      const transitions = cmd.config.transitions;
      
      expect(transitions).toHaveLength(6);
      expect(transitions[0]).toMatchObject({
        at: 2000,
        status: 'initializing'
      });
      expect(transitions[5]).toMatchObject({
        at: 60000,
        status: 'success',
        exit: 0
      });
    });

    test('should load configuration from file for known services', () => {
      const cmd = new MockCommand(['--service=backend-service']);
      
      // Should load from mock-config.json
      expect(cmd.config.associatedContainers).toEqual(['backend-db', 'backend-cache', 'backend-service-container']);
      expect(cmd.config.defaultPattern).toBe('infinite');
    });

    test('should prioritize explicit pattern over service default', () => {
      const cmd = new MockCommand(['--service=backend-service', '--pattern=success-5']);
      
      // Should use explicit pattern, not service default
      expect(cmd.config.pattern).toBe('success-5');
      const transitions = cmd.config.transitions;
      expect(transitions).toHaveLength(2);
      expect(transitions[1].at).toBe(5000);
    });

    test('should merge configurations correctly', () => {
      const cmd = new MockCommand(['--service=service-a', '--pattern=success-3']);
      
      // Should merge file config with arguments
      expect(cmd.config.service).toBe('service-a');
      expect(cmd.config.pattern).toBe('success-3');
      expect(cmd.config.associatedContainers).toBeDefined();
    });

    test('should initialize with proper properties', () => {
      const cmd = new MockCommand(['--service=test']);
      
      expect(cmd.startTime).toBeDefined();
      expect(cmd.statusFile).toBeDefined();
      expect(cmd.containerManager).toBeInstanceOf(ContainerManager);
      expect(cmd.isShuttingDown).toBe(false);
      expect(cmd.timers).toEqual([]);
    });

    test('should have proper status file path', () => {
      const cmd = new MockCommand(['--service=test-service']);
      
      expect(cmd.statusFile).toContain('/tmp/mock-status-test-service-');
      expect(cmd.statusFile).toContain(process.pid.toString());
    });
  });

  describe('ContainerManager', () => {
    test('should initialize with configuration', () => {
      const config = {
        service: 'test-service',
        associatedContainers: ['test-db', 'test-cache']
      };
      
      const manager = new ContainerManager(config);
      expect(manager.config).toEqual(config);
      expect(manager.containers).toBeInstanceOf(Set);
    });

    test('should have docker container management methods', () => {
      const manager = new ContainerManager({});
      expect(typeof manager.startContainers).toBe('function');
      expect(typeof manager.stopAll).toBe('function');
      expect(typeof manager.cleanup).toBe('function');
      expect(typeof manager.startContainer).toBe('function');
      expect(typeof manager.getContainerConfig).toBe('function');
      expect(typeof manager.buildDockerCommand).toBe('function');
    });

    test('should build proper docker commands', () => {
      const manager = new ContainerManager({});
      const config = {
        image: 'nginx:latest',
        command: 'nginx -g "daemon off;"',
        startupDelay: 2000,
        healthCheck: true
      };
      
      const command = manager.buildDockerCommand('test-container', config);
      
      expect(command).toContain('docker run -d --name "test-container" --rm');
      expect(command).toContain('nginx:latest');
      expect(command).toContain('--health-cmd="echo healthy"');
      expect(command).toContain('sleep 2');
    });

    test('should get default config for unknown containers', () => {
      const manager = new ContainerManager({});
      const defaultConfig = manager.getDefaultConfig();
      
      expect(defaultConfig).toEqual({
        image: 'alpine:latest',
        startupDelay: 0,
        healthCheck: true,
        command: 'sleep 3600'
      });
    });
  });

  describe('Pattern Management', () => {
    test('should handle all built-in patterns', () => {
      const patterns = ['infinite', 'success-10', 'success-30', 'fail-10', 'fail-15', 'timeout-45', 'sleep-20', 'complex'];
      
      patterns.forEach(pattern => {
        const cmd = new MockCommand(['--service=test', `--pattern=${pattern}`]);
        expect(cmd.config.transitions).toBeDefined();
        expect(cmd.config.transitions.length).toBeGreaterThan(0);
      });
    });

    test('should detect infinite patterns correctly', () => {
      const cmd1 = new MockCommand(['--service=test', '--pattern=infinite']);
      expect(cmd1.shouldRunIndefinitely()).toBe(true);
      
      const cmd2 = new MockCommand(['--service=test', '--pattern=success-10']);
      expect(cmd2.shouldRunIndefinitely()).toBe(false);
    });

    test('should detect exit transitions correctly', () => {
      const cmd1 = new MockCommand(['--service=test', '--pattern=infinite']);
      expect(cmd1.hasExitTransition()).toBe(false);
      
      const cmd2 = new MockCommand(['--service=test', '--pattern=success-10']);
      expect(cmd2.hasExitTransition()).toBe(true);
    });

    test('should fallback to infinite for unknown patterns', () => {
      const cmd = new MockCommand(['--service=test', '--pattern=unknown-pattern']);
      const transitions = cmd.config.transitions;
      
      expect(transitions).toHaveLength(2);
      expect(transitions[0]).toMatchObject({
        at: 2000,
        status: 'initializing'
      });
      expect(transitions[1]).toMatchObject({
        at: 5000,
        status: 'running'
      });
    });
  });

  describe('Command Execution', () => {
    test('should execute success pattern correctly', async () => {
      const result = await runMockCommand(['--service=test1', '--pattern=success-3'], 5000);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Service started');
      expect(result.stdout).toContain('Completed successfully');
    }, 10000);

    test('should execute failure pattern correctly', () => {
      const cmd = new MockCommand(['--service=test2', '--pattern=fail-3']);
      const transitions = cmd.config.transitions;
      
      expect(transitions).toHaveLength(2);
      expect(transitions[1]).toMatchObject({
        at: 3000,
        status: 'error',
        exit: 1,
        log: 'Service failed with error'
      });
    });

    test('should handle SIGTERM gracefully', async () => {
      const child = spawn('node', [
        path.join(__dirname, '../../../test-utils/commands/mock-command.js'),
        '--service=test-sigterm',
        '--pattern=infinite'
      ], { stdio: 'pipe' });

      let stdout = '';
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Wait for startup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Send SIGTERM
      child.kill('SIGTERM');
      
      // Wait for graceful shutdown
      const exitCode = await new Promise(resolve => {
        child.on('close', resolve);
      });

      expect(exitCode).toBe(0);
      expect(stdout).toContain('shutting down gracefully');
    }, 8000);

    test('should execute commands successfully', async () => {
      // Test basic command execution without file system dependencies
      const result = await runMockCommand(['--service=status-test', '--pattern=success-2'], 4000);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Starting status-test');
      expect(result.stdout).toContain('Completed successfully');
    }, 8000);

    test('should handle timeout pattern', () => {
      const cmd = new MockCommand(['--service=timeout-test', '--pattern=timeout-3']);
      const transitions = cmd.config.transitions;
      
      expect(transitions).toHaveLength(2);
      expect(transitions[1]).toMatchObject({
        at: 3000,
        status: 'timeout',
        exit: 124,
        log: 'Operation timed out'
      });
    });

    test('should log debug information when provided', async () => {
      const result = await runMockCommand(['--service=debug-test', '--pattern=success-2', '--debug=run', '--port=8080'], 4000);
      
      expect(result.stdout).toContain('Debug mode: run on port 8080');
      expect(result.code).toBe(0);
    }, 8000);

    test('should log mode information when provided', async () => {
      const result = await runMockCommand(['--service=mode-test', '--pattern=success-2', '--mode=container'], 4000);
      
      expect(result.stdout).toContain('Service mode: container');
      expect(result.code).toBe(0);
    }, 8000);
  });

  describe('Configuration Loading', () => {
    test('should load service configuration from file', () => {
      const cmd = new MockCommand(['--service=backend-service', '--pattern=success-2']);
      
      expect(cmd.config.associatedContainers).toEqual(['backend-db', 'backend-cache', 'backend-service-container']);
      expect(cmd.config.defaultPattern).toBe('infinite');
      
      const transitions = cmd.config.transitions;
      expect(transitions).toHaveLength(2);
      expect(transitions[1]).toMatchObject({
        at: 2000,
        status: 'success',
        exit: 0
      });
    });

    test('should respect environment variables', async () => {
      // Pass environment variable to child process
      const result = await runMockCommand(
        ['--service=testservice'], 
        3000, 
        { MOCK_TESTSERVICE_PATTERN: 'success-1' }
      );
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Completed successfully');
      expect(result.stdout).toContain('pattern: success-1');
    }, 8000);

    test('should handle configuration parsing', () => {
      // Test configuration loading without timing-sensitive operations
      const cmd = new MockCommand(['--service=envtest']);
      
      expect(cmd.config.service).toBe('envtest');
      expect(cmd.config.pattern).toBe('infinite');
      expect(cmd.config.logInterval).toBe(10000);
    });
  });

  describe('Container Management', () => {
    test('should handle services with containers', () => {
      const cmd = new MockCommand(['--service=backend-service', '--pattern=success-3']);
      
      expect(cmd.config.associatedContainers).toEqual(['backend-db', 'backend-cache', 'backend-service-container']);
      expect(cmd.containerManager).toBeDefined();
      expect(cmd.containerManager.config).toEqual(cmd.config);
      
      // Should have proper transitions for success pattern
      const transitions = cmd.config.transitions;
      expect(transitions).toHaveLength(2);
      expect(transitions[1]).toMatchObject({
        at: 3000,
        status: 'success',
        exit: 0
      });
    });

    test('should load container configuration from file', () => {
      const manager = new ContainerManager({});
      // Note: This test depends on mock-config.json having container configurations
      // We'll test the method exists and handles unknown containers gracefully
      const config = manager.getContainerConfig('unknown-container');
      expect(config).toBeDefined();
      expect(config.image).toBe('alpine:latest');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', () => {
      const cmd = new MockCommand(['--service=test', '--pattern=invalid-pattern']);
      
      // Should fallback to infinite pattern
      expect(cmd.config.transitions).toHaveLength(2);
      expect(cmd.config.transitions[1].status).toBe('running');
    });

    test('should handle malformed arguments', () => {
      const cmd = new MockCommand(['--invalid', '--service', '--pattern=']);
      
      // Should use defaults
      expect(cmd.config.service).toBe('unknown');
      expect(cmd.config.pattern).toBe('infinite');
    });

    test('should handle file loading errors gracefully', () => {
      // Mock a service that doesn't exist in config
      const cmd = new MockCommand(['--service=nonexistent-service']);
      
      // Should use defaults
      expect(cmd.config.service).toBe('nonexistent-service');
      expect(cmd.config.pattern).toBe('infinite');
      expect(cmd.config.logInterval).toBe(10000);
    });
  });
}); 