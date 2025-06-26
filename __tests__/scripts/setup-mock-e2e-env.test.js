const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('setup-mock-e2e-env.sh', () => {
  let testDir;
  let originalPath;
  let originalHome;
  let scriptPath;
  let parentDir;
  let repoRoot;

  beforeEach(() => {
    // Create isolated test environment
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-e2e-test-'));
    repoRoot = path.join(testDir, 'ProjectName-Manager');
    parentDir = testDir;
    
    // Copy the script and helper to test directory
    fs.mkdirSync(path.join(repoRoot, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    
    scriptPath = path.join(repoRoot, 'scripts', 'setup-mock-e2e-env.sh');
    const helperScriptPath = path.join(repoRoot, 'scripts', 'extract-mock-commands.js');
    
    // Copy the main script
    const originalScriptPath = path.join(__dirname, '../../scripts/setup-mock-e2e-env.sh');
    fs.copyFileSync(originalScriptPath, scriptPath);
    fs.chmodSync(scriptPath, '755');
    
    // Copy the helper script
    const originalHelperPath = path.join(__dirname, '../../scripts/extract-mock-commands.js');
    fs.copyFileSync(originalHelperPath, helperScriptPath);
    
    // Copy the JSON configuration files that the helper needs
    const srcDirs = [
      'src/environment-verification',
      'src/project-config/config'
    ];
    
    srcDirs.forEach(dir => {
      const originalDir = path.join(__dirname, '../..', dir);
      const testDir = path.join(repoRoot, dir);
      
      if (fs.existsSync(originalDir)) {
        fs.mkdirSync(testDir, { recursive: true });
        const files = fs.readdirSync(originalDir);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            fs.copyFileSync(
              path.join(originalDir, file),
              path.join(testDir, file)
            );
          }
        });
      }
    });
    
    // Save original environment
    originalPath = process.env.PATH;
    originalHome = process.env.HOME;
    
    // Set test HOME to avoid affecting real home directory
    process.env.HOME = path.join(testDir, 'home');
    fs.mkdirSync(process.env.HOME, { recursive: true });
  });

  afterEach(() => {
    // Restore environment
    process.env.PATH = originalPath;
    process.env.HOME = originalHome;
    
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Directory Creation', () => {
    test('creates all required project directories', () => {
      // Run the script
      execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        env: { ...process.env, HOME: process.env.HOME }
      });

      // Check that all expected directories exist
      const expectedDirs = [
        'project-a/agent',
        'project-c/subproject-a', 
        'project-c/subproject-b',
        'project-infrastructure',
        'project-d',
        'project-e',
        'project-b'
      ];

      expectedDirs.forEach(dir => {
        const fullPath = path.join(parentDir, dir);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.statSync(fullPath).isDirectory()).toBe(true);
      });
    });

    test('does not create project-f directory', () => {
      // Run the script
      execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        env: { ...process.env, HOME: process.env.HOME }
      });

      const projectFPath = path.join(parentDir, 'project-f');
      expect(fs.existsSync(projectFPath)).toBe(false);
    });

    test('creates Go directories', () => {
      // Run the script
      execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        env: { ...process.env, HOME: process.env.HOME }
      });

      const goBinPath = path.join(process.env.HOME, 'go', 'bin');
      const projectBPath = path.join(repoRoot, 'project-b');
      
      expect(fs.existsSync(goBinPath)).toBe(true);
      expect(fs.existsSync(projectBPath)).toBe(true);
    });
  });

  describe('File Creation', () => {
    test('creates executable gradlew files', () => {
      // Run the script
      execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        env: { ...process.env, HOME: process.env.HOME }
      });

      const gradlewFiles = [
        'project-a/gradlew',
        'project-c/subproject-a/gradlew',
        'project-c/subproject-b/gradlew',
        'project-d/gradlew'
      ];

      gradlewFiles.forEach(gradlewPath => {
        const fullPath = path.join(parentDir, gradlewPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.statSync(fullPath).isFile()).toBe(true);
        
        // Check if file is executable
        const stats = fs.statSync(fullPath);
        expect(stats.mode & parseInt('111', 8)).toBeTruthy();
      });
    });

    test('creates mock_bin directory and executables', () => {
      // Run the script
      execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        env: { ...process.env, HOME: process.env.HOME }
      });

      const mockBinPath = path.join(repoRoot, 'mock_bin');
      expect(fs.existsSync(mockBinPath)).toBe(true);
      expect(fs.statSync(mockBinPath).isDirectory()).toBe(true);

      const expectedMocks = [
        'gcloud', 'kubectl', 'kubectx', 'docker', 'go', 
        'java', 'brew', 'rdctl', 'chromium', 'nvm'
      ];

      expectedMocks.forEach(mockName => {
        const mockPath = path.join(mockBinPath, mockName);
        expect(fs.existsSync(mockPath)).toBe(true);
        expect(fs.statSync(mockPath).isFile()).toBe(true);
        
        // Check if file is executable
        const stats = fs.statSync(mockPath);
        expect(stats.mode & parseInt('111', 8)).toBeTruthy();
      });
    });
  });

  describe('Mock Commands', () => {
    let mockBinPath;

    beforeEach(() => {
      // Run the script to set up mocks
      execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        env: { ...process.env, HOME: process.env.HOME }
      });
      
      mockBinPath = path.join(repoRoot, 'mock_bin');
    });

    const testCasesWithOutput = [
      ['gcloud', '--version', 'Google Cloud SDK 450.0.0', 'stdout'],
      ['kubectl', 'version --client', 'Client Version: v1.28.4', 'stdout'],
      ['go', 'version', 'go version go1.21.4 linux/amd64', 'stdout'],
      ['brew', '--version', 'Homebrew 4.1.20', 'stdout'],
      ['rdctl', 'version', 'rdctl version 1.10.1', 'stdout'],
      ['chromium', '--version', 'Chromium 125.0.6422.141', 'stdout'],
    ];

    const testCasesJustSuccess = [
      ['kubectx', '--help'],
    ];

    test.each(testCasesWithOutput)('%s %s returns expected output', (cmd, args, expected, stream) => {
      const mockCmd = path.join(mockBinPath, cmd);
      const result = execSync(`"${mockCmd}" ${args}`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      expect(result.trim()).toContain(expected);
    });

    test.each(testCasesJustSuccess)('%s %s executes successfully', (cmd, args) => {
      const mockCmd = path.join(mockBinPath, cmd);
      const result = execSync(`"${mockCmd}" ${args}`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      expect(result).toBeDefined();
    });

    test('java -version outputs to stderr', () => {
      // java -version outputs to stderr and exits with 0, but execSync treats this as success
      // We need to capture stderr explicitly
      const mockJava = path.join(mockBinPath, 'java');
      const result = execSync(`"${mockJava}" -version 2>&1`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      expect(result).toContain('openjdk version "17.0.8" 2023-07-18');
    });

    test('docker command handles multiple argument patterns', () => {
      const mockDocker = path.join(mockBinPath, 'docker');
      
      // Test docker info --format
      const dockerInfoResult = execSync(`"${mockDocker}" info --format "{{.ServerVersion}}"`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      expect(dockerInfoResult.trim()).toBe('24.0.7');

      // Test docker ps
      const dockerPsResult = execSync(`"${mockDocker}" ps`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      expect(dockerPsResult).toContain('CONTAINER ID');
      expect(dockerPsResult).toContain('IMAGE');

      // Test docker version (default)
      const dockerVersionResult = execSync(`"${mockDocker}" version`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      expect(dockerVersionResult).toContain('Docker version 24.0.7, build afdd53b');
    });

    test('nvm command works correctly (with real nvm fallback)', () => {
      const mockNvm = path.join(mockBinPath, 'nvm');
      
      // The nvm mock is designed to fall back to real nvm if available
      // Test that it executes successfully and produces version output
      const nvmLsResult = execSync(`"${mockNvm}" ls`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      // Verify that it runs and contains some version info (works with both real and mock nvm)
      expect(nvmLsResult).toMatch(/v\d+\.\d+\.\d+/);
      expect(nvmLsResult).toContain('default');
    });

    test('nvm mock behavior when real nvm not available', () => {
      // This test demonstrates what happens when real nvm is not available
      // We can't easily test this in isolation, but we can verify the mock file exists
      const mockNvm = path.join(mockBinPath, 'nvm');
      expect(fs.existsSync(mockNvm)).toBe(true);
      
      // Test that the mock script contains the expected fallback logic
      const mockContent = fs.readFileSync(mockNvm, 'utf8');
      expect(mockContent).toContain('if [ -s "$HOME/.nvm/nvm.sh" ]');
      expect(mockContent).toContain('0.39.7');
      expect(mockContent).toContain('v15.5.1');
      expect(mockContent).toContain('v22.16.0');
    });
  });

  describe('Environment Setup', () => {
      test('sets up Project B HOME correctly', () => {
    // Test with default Project B HOME
      execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        env: { ...process.env, HOME: process.env.HOME }
      });

          const expectedProjectBPath = path.join(repoRoot, 'project-b');
    expect(fs.existsSync(expectedProjectBPath)).toBe(true);
    });

      test('respects existing Project B HOME environment variable', () => {
    const customProjectBHome = path.join(testDir, 'custom-project-b');
      
      execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        env: { 
          ...process.env, 
          HOME: process.env.HOME,
          GOPM_HOME: customProjectBHome
        }
      });

      expect(fs.existsSync(customProjectBHome)).toBe(true);
    });

    test('handles GITHUB_PATH environment variable', () => {
      const githubPathFile = path.join(testDir, 'github_path');
      fs.writeFileSync(githubPathFile, '');
      
      execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        env: { 
          ...process.env, 
          HOME: process.env.HOME,
          GITHUB_PATH: githubPathFile
        }
      });

      const pathContent = fs.readFileSync(githubPathFile, 'utf8');
      expect(pathContent).toContain(path.join(repoRoot, 'mock_bin'));
    });
  });

  describe('Script Output', () => {
    test('displays completion message', () => {
      const result = execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });

      expect(result).toContain('Mock environment setup complete');
      expect(result).toContain('Add');
      expect(result).toContain('mock_bin to your PATH');
    });

    test('displays directory creation message', () => {
      const result = execSync(`cd "${repoRoot}" && bash "${scriptPath}"`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });

      expect(result).toContain('Creating mock project directories...');
    });
  });

  describe('Error Handling', () => {
    test('script exits with error code on failure', () => {
      // Create a modified script that will fail
      const failingScript = scriptPath.replace('.sh', '-failing.sh');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      const failingContent = scriptContent.replace('set -e', 'set -e\nfalse # Force failure');
      fs.writeFileSync(failingScript, failingContent);
      fs.chmodSync(failingScript, '755');

      expect(() => {
        execSync(`cd "${repoRoot}" && bash "${failingScript}"`, { 
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });
}); 