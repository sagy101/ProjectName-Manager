import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CodeBracketIcon, CheckIcon, XMarkIcon, ArrowPathIcon, MagnifyingGlassIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import '../styles/git-branch-switcher.css';

const GitBranchSwitcher = ({ 
  projectPath,
  currentBranch,
  onBranchChangeSuccess,
  onBranchChangeError,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false); // For dropdown visibility
  const [searchTerm, setSearchTerm] = useState('');
  const [newBranchName, setNewBranchName] = useState(currentBranch);
  const [localBranches, setLocalBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const wrapperRef = useRef(null); // Ref for the entire component for outside click
  const inputRef = useRef(null); // Ref for the search/create input

  // Debug: Log when currentBranch changes
  useEffect(() => {
    debugLog(`GitBranchSwitcher [${projectPath}]: currentBranch changed to "${currentBranch}"`);
  }, [currentBranch, projectPath]);

  // Update newBranchName when currentBranch prop changes (e.g., after successful checkout)
  useEffect(() => {
    setNewBranchName(currentBranch);
  }, [currentBranch]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setError(null); // Clear error when closing
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const fetchLocalBranches = useCallback(async () => {
    if (!projectPath) return;
    setBranchesLoading(true);
    setError(null);
    try {
      const result = await window.electron.gitListLocalBranches(projectPath);
      if (result.success) {
        setLocalBranches(result.branches || []);
      } else {
        setError(result.error || 'Failed to list branches.');
        setLocalBranches([]);
      }
    } catch (err) {
      console.error('Error during git list branches IPC call:', err);
      setError('IPC Error: ' + err.message);
      setLocalBranches([]);
    }
    setBranchesLoading(false);
  }, [projectPath]);

  const handleToggleDropdown = () => {
    if (disabled) return; // Prevent opening if disabled
    const nextOpenState = !isOpen;
    setIsOpen(nextOpenState);
    if (nextOpenState) {
      fetchLocalBranches();
      setSearchTerm(''); // Reset search term on open
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 0); // Focus input after dropdown opens
    } else {
      setError(null); // Clear error when closing manually
    }
  };

  const handleBranchSelect = (branch) => {
    setNewBranchName(branch);
    // Automatically trigger checkout if a branch from the list is clicked
    // and it's different from the current branch.
    if (branch !== currentBranch) {
        handleCheckout(branch); 
    }
    setIsOpen(false); // Close dropdown after selection
  };

  const handleCheckout = async (branchToCheckout) => {
    const targetBranch = (branchToCheckout || searchTerm || newBranchName).trim();

    if (!targetBranch || targetBranch === currentBranch) {
      setIsOpen(false);
      setError(null);
      return;
    }

    setCheckoutLoading(true);
    setError(null);
    try {
      const result = await window.electron.gitCheckoutBranch(projectPath, targetBranch);
      if (result.success) {
        setIsOpen(false); // Close dropdown
        if (onBranchChangeSuccess) {
          onBranchChangeSuccess(); // Trigger global refresh
        }
      } else {
        const errorMessage = result.error || 'Failed to checkout branch.';
        setError(errorMessage);
        if (onBranchChangeError) {
          onBranchChangeError(`Branch switch failed: ${errorMessage}`, 'error');
        }
      }
    } catch (err) {
      console.error('Error during git checkout IPC call:', err);
      const errorMessage = 'IPC Error: ' + err.message;
      setError(errorMessage);
      if (onBranchChangeError) {
        onBranchChangeError(`Branch switch failed: ${errorMessage}`, 'error');
      }
    }
    setCheckoutLoading(false);
  };
  
  const filteredBranches = localBranches.filter(branch => 
    branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Determine if the search term could be a new branch
  const isPotentialRemoteBranch = searchTerm.trim() !== '' && !localBranches.includes(searchTerm.trim());

  // Determine the display text and loading state
  const isLoading = checkoutLoading;
  const displayText = checkoutLoading ? 'Switching...' : currentBranch;

  return (
    <div className="git-branch-switcher-wrapper" ref={wrapperRef}>
      <button 
        className={`git-branch-switcher-display-button ${isOpen ? 'open' : ''}`}
        onClick={handleToggleDropdown}
        title={`Current branch: ${currentBranch}. Click to switch.`}
        disabled={isLoading || disabled}
      >
        <CodeBracketIcon className="icon display-icon" />
        <span>{displayText}</span>
        <ChevronUpDownIcon className="icon chevron-icon" />
      </button>

      {isOpen && (
        <div className="git-branch-dropdown">
          <div className="dropdown-header">
            <span>Switch branches/tags</span>
            <button onClick={() => setIsOpen(false)} className="close-button">
              <XMarkIcon className="icon" />
            </button>
          </div>
          <div className="search-input-wrapper">
            <MagnifyingGlassIcon className="icon search-icon" />
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Find or checkout a branch..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckout()} // Checkout on Enter
              className="branch-search-input"
              disabled={disabled} // Disable input if component is disabled
            />
          </div>
          {branchesLoading && <div className="loading-branches-text">Loading branches... <ArrowPathIcon className='icon spin'/></div>}
          {error && <div className="dropdown-error-message">{error}</div>}
          {!branchesLoading && !error && (
            <ul className="branch-list">
              {filteredBranches.map(branch => (
                <li 
                  key={branch} 
                  onClick={() => !disabled && handleBranchSelect(branch)} // Prevent action if disabled
                  className={`${branch === currentBranch ? 'current' : ''} ${disabled ? 'disabled-item' : ''}`}
                  title={branch}
                >
                  {branch === currentBranch && <CheckIcon className="icon check-icon-list"/>}
                  <span className="branch-name-in-list">{branch}</span>
                </li>
              ))}
              {isPotentialRemoteBranch && (
                <li className="no-results-item">
                  Not a local branch. Press Enter to checkout from remote.
                </li>
              )}
              {filteredBranches.length === 0 && !isPotentialRemoteBranch && !branchesLoading && (
                <li className="no-results-item">No matching branches found.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default GitBranchSwitcher; 