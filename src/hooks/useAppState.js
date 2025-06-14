import { useState, useRef } from 'react';
import { STATUS } from '../constants/verificationConstants';
import appConfig from '../configurationSidebarSections.json';

const { displaySettings, sections: configSidebarSections } = appConfig;

export const useAppState = () => {
  // Project Name state
  const [projectName, setProjectName] = useState(displaySettings?.projectName || 'App');

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  // State for general verification configuration from verifications.json
  const [generalVerificationConfig, setGeneralVerificationConfig] = useState([]);
  const [generalHeaderConfig, setGeneralHeaderConfig] = useState({});
  
  // State for showing/hiding test sections
  const [showTestSections, setShowTestSections] = useState(false);

  // State for no-run mode
  const [noRunMode, setNoRunMode] = useState(false);
  
  // State for Project running status from ProjectConfiguration
  const [appIsProjectRunning, setAppIsProjectRunning] = useState(false);
  
  // State for app-level notifications
  const [appNotification, setAppNotification] = useState({
    isVisible: false,
    message: '',
    type: 'info',
    autoCloseTime: 3000
  });
  
  // State for configuration from ProjectConfiguration
  const [configState, setConfigState] = useState({});

  // State for floating terminals
  const [floatingTerminals, setFloatingTerminals] = useState([]);
  const [activeFloatingTerminalId, setActiveFloatingTerminalId] = useState(null);

  // State for the "About" box for floating terminals - REPLACED
  const [infoPanelState, setInfoPanelState] = useState({
    isVisible: false,
    terminalData: null,
    position: { x: 0, y: 0 },
    detailsOpen: false // For the "More Details" popup within TabInfoPanel
  });

  // State for FloatingTerminalSidebar expansion
  const [isFloatingSidebarExpanded, setIsFloatingSidebarExpanded] = useState(false);

  // State for import status screen
  const [showImportStatusScreen, setShowImportStatusScreen] = useState(false);
  const [importGitBranches, setImportGitBranches] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [isPerformingImport, setIsPerformingImport] = useState(false);

  // Z-index and position management for floating terminals
  const [nextZIndex, setNextZIndex] = useState(1001); // Start above default elements
  const lastPosition = useRef({ x: 50, y: 50 }); // Initial spawn position
  const positionOffset = 30; // Pixels to offset new windows

  // State for main terminal writability (default to read-only)
  const [isMainTerminalWritable, setIsMainTerminalWritable] = useState(false);

  // State for versions
  const [discoveredVersions, setDiscoveredVersions] = useState({});

  // State for ProjectConfiguration collapse
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);

  // Initialize verification statuses dynamically from JSON
  const initializeVerificationStatuses = () => {
    const statuses = {
      general: {}
    };
    
    // Initialize each section from JSON
    configSidebarSections.forEach(section => {
      const sectionKey = section.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      statuses[sectionKey] = { [sectionKey]: STATUS.WAITING, gitBranch: STATUS.WAITING };
    });
    
    return statuses;
  };

  // Track status of each indicator group
  const [verificationStatuses, setVerificationStatuses] = useState(initializeVerificationStatuses());

  // Global state for dropdown values (generic, not specific to any tool)
  const [globalDropdownValues, setGlobalDropdownValues] = useState({});

  const terminalRef = useRef(null);
  const projectConfigRef = useRef(null);

  return {
    // State values
    projectName,
    isLoading,
    loadingProgress,
    loadingStatus,
    generalVerificationConfig,
    generalHeaderConfig,
    showTestSections,
    noRunMode,
    appIsProjectRunning,
    appNotification,
    configState,
    floatingTerminals,
    activeFloatingTerminalId,
    infoPanelState,
    isFloatingSidebarExpanded,
    showImportStatusScreen,
    importGitBranches,
    importResult,
    isPerformingImport,
    nextZIndex,
    lastPosition,
    positionOffset,
    isMainTerminalWritable,
    discoveredVersions,
    isConfigCollapsed,
    verificationStatuses,
    globalDropdownValues,
    terminalRef,
    projectConfigRef,
    
    // State setters
    setProjectName,
    setIsLoading,
    setLoadingProgress,
    setLoadingStatus,
    setGeneralVerificationConfig,
    setGeneralHeaderConfig,
    setShowTestSections,
    setNoRunMode,
    setAppIsProjectRunning,
    setAppNotification,
    setConfigState,
    setFloatingTerminals,
    setActiveFloatingTerminalId,
    setInfoPanelState,
    setIsFloatingSidebarExpanded,
    setShowImportStatusScreen,
    setImportGitBranches,
    setImportResult,
    setIsPerformingImport,
    setNextZIndex,
    setIsMainTerminalWritable,
    setDiscoveredVersions,
    setIsConfigCollapsed,
    setVerificationStatuses,
    setGlobalDropdownValues,
    
    // Utility functions
    initializeVerificationStatuses,
    configSidebarSections
  };
}; 