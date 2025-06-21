import React, { useEffect, useState, useCallback } from 'react';
import './styles/import-status-screen.css';
import { loggers } from '../common/utils/debugUtils.js';

const logger = loggers.app;

const ImportStatusScreen = ({ isVisible, projectName, onClose, gitBranches, onImportComplete }) => {
  const [importStatus, setImportStatus] = useState({
    config: { status: 'waiting', message: 'Configuration import' },
    gitBranches: {}
  });
  const [isComplete, setIsComplete] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    if (!isVisible) {
      // Reset status when not visible
      setImportStatus({
        config: { status: 'waiting', message: 'Configuration import' },
        gitBranches: {}
      });
      setIsComplete(false);
      setIsImporting(false);
      return;
    }

    // Initialize status for all git branches only once when screen becomes visible
    const initialGitBranches = {};
    if (gitBranches) {
      Object.entries(gitBranches).forEach(([sectionId, branchName]) => {
        initialGitBranches[sectionId] = {
          sectionId,
          branchName,
          status: 'waiting',
          message: `Switch to ${branchName}`
        };
      });
    }

    setImportStatus({
      config: { status: 'waiting', message: 'Configuration import' },
      gitBranches: initialGitBranches
    });
  }, [isVisible]); // Remove gitBranches dependency to prevent multiple triggers

  // Update git branch status
  const updateGitBranchStatus = (sectionId, status, message = '') => {
    setImportStatus(prev => ({
      ...prev,
      gitBranches: {
        ...prev.gitBranches,
        [sectionId]: {
          ...prev.gitBranches[sectionId],
          status,
          message: message || prev.gitBranches[sectionId]?.message || ''
        }
      }
    }));
  };

  // Update config status
  const updateConfigStatus = (status, message) => {
    setImportStatus(prev => ({
      ...prev,
      config: { status, message }
    }));
  };

  // Start import process
  const startImport = useCallback(async () => {
    // Prevent multiple simultaneous imports
    if (isImporting) {
      logger.debug('Import already in progress, skipping...');
      return;
    }

    try {
      setIsImporting(true);
      logger.debug('Starting import process...');
      
      // Start config import
      updateConfigStatus('importing', 'Importing configuration...');
      
      // Start git branch switches
      if (gitBranches) {
        Object.keys(gitBranches).forEach(sectionId => {
          updateGitBranchStatus(sectionId, 'switching', 'Switching branch...');
        });
      }

      // Call the actual import function
      if (onImportComplete) {
        const result = await onImportComplete(updateGitBranchStatus, updateConfigStatus);
        
        // Mark as complete
        setIsComplete(true);
      }
    } catch (error) {
      logger.error('Import failed:', error);
      setImportMessage(`Import failed: ${error.message}`);
      updateConfigStatus('error', 'Import failed');
      setIsComplete(true);
    } finally {
      setIsImporting(false);
    }
  }, [isImporting, gitBranches, onImportComplete, updateGitBranchStatus, updateConfigStatus]);

  // Start import when screen becomes visible
  useEffect(() => {
    if (isVisible && !isComplete && !isImporting) {
      // Small delay to allow UI to render
      const timeoutId = setTimeout(startImport, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, isComplete, isImporting]); // Remove startImport from dependencies

  // Check if all operations are complete
  useEffect(() => {
    const configComplete = importStatus.config.status === 'success' || importStatus.config.status === 'error';
    const allBranchesComplete = Object.values(importStatus.gitBranches).every(
      branch => branch.status === 'success' || branch.status === 'error' || branch.status === 'skipped'
    );
    
    const hasConfig = true; // Always have config
    const hasBranches = Object.keys(importStatus.gitBranches).length > 0;
    
    if (isVisible && configComplete && (!hasBranches || allBranchesComplete) && !isComplete) {
      setIsComplete(true);
    }
  }, [importStatus, isVisible, isComplete]);

  if (!isVisible) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting':
        return (
          <svg className="status-icon waiting" viewBox="0 0 24 24" width="14" height="14">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'switching':
      case 'importing':
        return (
          <svg className="status-icon importing spinning" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" 
                  d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
          </svg>
        );
      case 'success':
        return (
          <svg className="status-icon success" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M20 6L9 17l-5-5" />
          </svg>
        );
      case 'skipped':
        return (
          <svg className="status-icon skipped" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="status-icon error" viewBox="0 0 24 24" width="14" height="14">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  d="M18 6L6 18M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const branchCount = Object.keys(importStatus.gitBranches).length;
  const branchesComplete = Object.values(importStatus.gitBranches).filter(
    b => b.status === 'success' || b.status === 'error' || b.status === 'skipped'
  ).length;
  const branchesSuccessful = Object.values(importStatus.gitBranches).filter(b => b.status === 'success').length;

  return (
    <div className="import-status-overlay">
      <div className="import-status-container">
        <div className="import-header">
          <h2>Importing Configuration</h2>
          <div className="import-progress">
            <div className="progress-item">
              <span className="progress-label">Configuration:</span>
              <span className="progress-value">
                {importStatus.config.status === 'success' ? '✓' : importStatus.config.status === 'error' ? '✗' : '...'}
              </span>
            </div>
            {branchCount > 0 && (
              <div className="progress-item">
                <span className="progress-label">Git Branches:</span>
                <span className="progress-value">{branchesComplete} / {branchCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="import-content">
          <div className="status-section">
            <h3>Configuration Import</h3>
            <div className="status-list">
              <div className={`status-item ${importStatus.config.status}`}>
                {getStatusIcon(importStatus.config.status)}
                <span className="item-name">Settings & Preferences</span>
                <span className={`status-label ${importStatus.config.status}`}>
                  {importStatus.config.status === 'waiting' && 'Waiting'}
                  {importStatus.config.status === 'importing' && 'Importing...'}
                  {importStatus.config.status === 'success' && 'Imported'}
                  {importStatus.config.status === 'error' && 'Failed'}
                </span>
              </div>
            </div>
          </div>

          {branchCount > 0 && (
            <div className="status-section">
              <h3>Git Branch Switching</h3>
              <div className="status-list">
                {Object.entries(importStatus.gitBranches).map(([sectionId, branch]) => (
                  <div key={sectionId} className={`status-item ${branch.status}`}>
                    {getStatusIcon(branch.status)}
                    <span className="item-name">
                      {sectionId}
                      <span className="item-detail">
                        → {branch.branchName}
                      </span>
                    </span>
                    <span className={`status-label ${branch.status}`}>
                      {branch.status === 'waiting' && 'Waiting'}
                      {branch.status === 'switching' && 'Switching...'}
                      {branch.status === 'success' && 'Switched'}
                      {branch.status === 'skipped' && 'Already current'}
                      {branch.status === 'error' && 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="import-footer">
          {!isComplete ? (
            <>
              <div className="import-spinner">
                <svg className="spinner" viewBox="0 0 24 24" width="20" height="20">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" 
                          strokeDasharray="31.4" strokeDashoffset="10" />
                </svg>
              </div>
              <span>Please wait while configuration is imported...</span>
            </>
          ) : (
            <div className="import-complete">
              <svg className="complete-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      d="M20 6L9 17l-5-5" />
              </svg>
              <span>
                {branchCount > 0 
                  ? `Configuration imported with ${branchesSuccessful}/${branchCount} git branches switched`
                  : 'Configuration imported successfully'
                }
              </span>
              <button className="close-button" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportStatusScreen; 