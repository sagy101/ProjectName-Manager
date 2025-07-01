/** @jest-environment node */
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Mock fs and dependencies
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn()
  }
}));

jest.mock('../../src/main-process/mainUtils', () => ({
  resolveEnvVars: jest.fn((str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/\$HOME/g, '/mock/home')
      .replace(/\$WORKSPACE/g, '/mock/workspace')
      .replace(/\$USER/g, 'mockuser');
  }),
  checkPathExists: jest.fn()
}));

const { resolvePathAndCheckExists } = require('../../src/main-process/environmentVerification');
const { checkPathExists } = require('../../src/main-process/mainUtils');

describe('resolvePathAndCheckExists', () => {
  const mockProjectRoot = '/mock/project/root';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Environment Variable Resolution', () => {
         it('should resolve env vars in ./ relative paths', async () => {
       const mockStats = { isDirectory: () => true, isFile: () => false };
       checkPathExists.mockResolvedValue('valid');
       
       const result = await resolvePathAndCheckExists('./config/$USER/settings', 'directory', mockProjectRoot);
       
       expect(checkPathExists).toHaveBeenCalledWith(mockProjectRoot, 'config/mockuser/settings', 'directory');
       expect(result.resolvedPath).toBe('/mock/project/root/config/mockuser/settings');
       expect(result.pathStatus).toBe('valid');
     });

         it('should resolve env vars in ../ relative paths', async () => {
       const mockStats = { isDirectory: () => true, isFile: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('../../$WORKSPACE/src/project', 'directory', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mock/mock/workspace/src/project');
       expect(result.resolvedPath).toBe('/mock/mock/workspace/src/project');
       expect(result.pathStatus).toBe('valid');
     });

         it('should resolve env vars in absolute paths', async () => {
       const mockStats = { isDirectory: () => true, isFile: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('$HOME/Documents/project', 'directory', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mock/home/Documents/project');
       expect(result.resolvedPath).toBe('/mock/home/Documents/project');
       expect(result.pathStatus).toBe('valid');
     });

         it('should handle multiple env vars in one path', async () => {
       const mockStats = { isFile: () => true, isDirectory: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('$HOME/$USER/config', 'file', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mock/home/mockuser/config');
       expect(result.resolvedPath).toBe('/mock/home/mockuser/config');
       expect(result.pathStatus).toBe('valid');
     });
  });

  describe('Relative Paths with ./', () => {
         it('should handle simple ./ paths', async () => {
       checkPathExists.mockResolvedValue('valid');
       
       const result = await resolvePathAndCheckExists('./src/components', 'directory', mockProjectRoot);
       
       expect(checkPathExists).toHaveBeenCalledWith(mockProjectRoot, 'src/components', 'directory');
       expect(result.resolvedPath).toBe('/mock/project/root/src/components');
       expect(result.pathStatus).toBe('valid');
     });

         it('should handle ./ paths with env vars', async () => {
       checkPathExists.mockResolvedValue('valid');
       
       const result = await resolvePathAndCheckExists('./config/$USER/app.json', 'file', mockProjectRoot);
       
       expect(checkPathExists).toHaveBeenCalledWith(mockProjectRoot, 'config/mockuser/app.json', 'file');
       expect(result.resolvedPath).toBe('/mock/project/root/config/mockuser/app.json');
       expect(result.pathStatus).toBe('valid');
     });
  });

  describe('Relative Paths with ../', () => {
         it('should handle single ../ paths', async () => {
       const mockStats = { isDirectory: () => true, isFile: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('../sibling-project', 'directory', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mock/project/sibling-project');
       expect(result.resolvedPath).toBe('/mock/project/sibling-project');
       expect(result.pathStatus).toBe('valid');
     });

    it('should handle multiple ../ sequences', async () => {
      const mockStats = { isDirectory: () => true, isFile: () => false };
      fs.stat.mockResolvedValue(mockStats);
      
      const result = await resolvePathAndCheckExists('../../../some/deep/path', 'directory', mockProjectRoot);
      
      expect(fs.stat).toHaveBeenCalledWith('/some/deep/path');
      expect(result.resolvedPath).toBe('/some/deep/path');
      expect(result.pathStatus).toBe('valid');
    });

         it('should handle ../ paths with env vars', async () => {
       const mockStats = { isDirectory: () => true, isFile: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('../../$WORKSPACE/src/myproject', 'directory', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mock/mock/workspace/src/myproject');
       expect(result.resolvedPath).toBe('/mock/mock/workspace/src/myproject');
       expect(result.pathStatus).toBe('valid');
     });
  });

  describe('Absolute Paths', () => {
         it('should handle regular absolute paths', async () => {
       const mockStats = { isFile: () => true, isDirectory: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('/mock/bin/node', 'file', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mock/bin/node');
       expect(result.resolvedPath).toBe('/mock/bin/node');
       expect(result.pathStatus).toBe('valid');
     });

         it('should handle absolute paths with env vars', async () => {
       const mockStats = { isDirectory: () => true, isFile: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('/mock/local/$USER/bin', 'directory', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mock/local/mockuser/bin');
       expect(result.resolvedPath).toBe('/mock/local/mockuser/bin');
       expect(result.pathStatus).toBe('valid');
     });
  });

  describe('Path Type Validation', () => {
    it('should validate directory type correctly', async () => {
      const mockStats = { isDirectory: () => true, isFile: () => false };
      fs.stat.mockResolvedValue(mockStats);
      
      const result = await resolvePathAndCheckExists('/some/directory', 'directory', mockProjectRoot);
      
      expect(result.pathStatus).toBe('valid');
    });

    it('should validate file type correctly', async () => {
      const mockStats = { isDirectory: () => false, isFile: () => true };
      fs.stat.mockResolvedValue(mockStats);
      
      const result = await resolvePathAndCheckExists('/some/file.txt', 'file', mockProjectRoot);
      
      expect(result.pathStatus).toBe('valid');
    });

    it('should validate any type (file or directory)', async () => {
      const mockStats = { isDirectory: () => false, isFile: () => true };
      fs.stat.mockResolvedValue(mockStats);
      
      const result = await resolvePathAndCheckExists('/some/path', undefined, mockProjectRoot);
      
      expect(result.pathStatus).toBe('valid');
    });

    it('should return invalid for wrong type', async () => {
      const mockStats = { isDirectory: () => true, isFile: () => false };
      fs.stat.mockResolvedValue(mockStats);
      
      const result = await resolvePathAndCheckExists('/some/directory', 'file', mockProjectRoot);
      
      expect(result.pathStatus).toBe('invalid');
    });
  });

  describe('Error Handling', () => {
         it('should handle non-existent paths', async () => {
       fs.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'));
       
       const result = await resolvePathAndCheckExists('/mock/non/existent/path', 'directory', mockProjectRoot);
       
       expect(result.pathStatus).toBe('invalid');
       expect(result.resolvedPath).toBe('/mock/non/existent/path');
     });

    it('should handle checkPathExists errors for ./ paths', async () => {
      checkPathExists.mockResolvedValue('invalid');
      
      const result = await resolvePathAndCheckExists('./non/existent', 'directory', mockProjectRoot);
      
      expect(result.pathStatus).toBe('invalid');
    });

    it('should handle fs.stat errors for ../ paths', async () => {
      fs.stat.mockRejectedValue(new Error('Permission denied'));
      
      const result = await resolvePathAndCheckExists('../restricted/path', 'directory', mockProjectRoot);
      
      expect(result.pathStatus).toBe('invalid');
    });
  });

  describe('Complex Real-world Scenarios', () => {
         it('should handle complex relative path case', async () => {
       const mockStats = { isDirectory: () => true, isFile: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('../../workspace/nested/project', 'directory', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mock/workspace/nested/project');
       expect(result.resolvedPath).toBe('/mock/workspace/nested/project');
       expect(result.pathStatus).toBe('valid');
     });

         it('should handle complex path with env vars and multiple ../', async () => {
       const mockStats = { isFile: () => true, isDirectory: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('../../../$USER/config.json', 'file', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mockuser/config.json');
       expect(result.resolvedPath).toBe('/mockuser/config.json');
       expect(result.pathStatus).toBe('valid');
     });

         it('should handle nested project path with env vars', async () => {
       checkPathExists.mockResolvedValue('valid');
       
       const result = await resolvePathAndCheckExists('./projects/$USER/app', 'directory', mockProjectRoot);
       
       expect(checkPathExists).toHaveBeenCalledWith(mockProjectRoot, 'projects/mockuser/app', 'directory');
       expect(result.resolvedPath).toBe('/mock/project/root/projects/mockuser/app');
       expect(result.pathStatus).toBe('valid');
     });
  });

  describe('Edge Cases', () => {
         it('should handle empty path', async () => {
       fs.stat.mockRejectedValue(new Error('Empty path'));
       
       const result = await resolvePathAndCheckExists('', 'directory', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('');
       expect(result.resolvedPath).toBe('');
       expect(result.pathStatus).toBe('invalid');
     });

         it('should handle path with only env vars', async () => {
       const mockStats = { isDirectory: () => true, isFile: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('$HOME', 'directory', mockProjectRoot);
       
       expect(fs.stat).toHaveBeenCalledWith('/mock/home');
       expect(result.resolvedPath).toBe('/mock/home');
       expect(result.pathStatus).toBe('valid');
     });

         it('should handle path with consecutive slashes', async () => {
       const mockStats = { isDirectory: () => true, isFile: () => false };
       fs.stat.mockResolvedValue(mockStats);
       
       const result = await resolvePathAndCheckExists('../double//slash', 'directory', mockProjectRoot);
       
       expect(result.pathStatus).toBe('valid');
       expect(result.resolvedPath).toBe('/mock/project/double/slash');
     });
  });
}); 