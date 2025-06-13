import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import ConfigSection from './ConfigSection';
import Notification from './Notification';
import StoppingStatusScreen from './StoppingStatusScreen';
import { STATUS } from '../constants/verificationConstants';
import configSidebarSections from '../configurationSidebarSections.json';
import configSidebarCommands from '../configurationSidebarCommands.json';
import { generateCommandList } from '../utils/evalUtils';
import { useProjectConfig } from '../hooks/useProjectConfig';
import RunButton from './RunButton';
import '../styles/project-configuration.css';

const configSidebarSectionsActual = configSidebarSections.sections;

const ProjectConfiguration = forwardRef(({ projectName, globalDropdownValues, terminalRef, verificationStatuses, onTriggerRefresh, showTestSections = false, onConfigStateChange, onIsRunningChange, openFloatingTerminal, discoveredVersions, onBranchChangeError, showAppNotification, isCollapsed }, ref) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showStoppingScreen, setShowStoppingScreen] = useState(false);
  const [currentTerminalId, setCurrentTerminalId] = useState(null);
  const isMounted = useRef(false);
  const [notification, setNotification] = useState({ message: '', type: 'info', isVisible: false });

  const {
    configState,
    attachState,
    warningState,
    initialized,
    setConfigState,
    setAttachState,
    toggleSectionEnabled,
    toggleSubSectionEnabled,
    setMode,
    handleAttachToggle,
    setSectionDropdownValue,
  } = useProjectConfig(globalDropdownValues, showTestSections, setNotification);

  const visibleSections = configSidebarSectionsActual.filter(section => showTestSections || !section.testSection);

  useEffect(() => {
    if (notification.isVisible) {
      const timer = setTimeout(() => hideNotification(), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.isVisible, notification.message]);

  const updateIsRunning = (runningStatus) => {
    setIsRunning(runningStatus);
    onIsRunningChange?.(runningStatus);
  };

  useEffect(() => {
    updateIsRunning(false);
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  
  useEffect(() => {
    if (!isMounted.current || !currentTerminalId) return;
    
    if (window.electron) {
      const processEndedHandler = (data) => {
        if (data.terminalId === currentTerminalId && isMounted.current) {
          updateIsRunning(false);
          setCurrentTerminalId(null);
        }
      };
      const removeEndedListener = window.electron.onProcessEnded(processEndedHandler);
      return () => removeEndedListener();
    }
  }, [currentTerminalId]);

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const stopProjectExecution = async () => {
    setIsStopping(true);
    setShowStoppingScreen(true);
    
    if (terminalRef.current?.killAllTerminals) {
      await terminalRef.current.killAllTerminals();
    }
    
    if (terminalRef.current?.clearTabs) {
      terminalRef.current.clearTabs();
    }

    updateIsRunning(false);
    setCurrentTerminalId(null);
    setIsStopping(false);
  };

  const handleCloseStoppingScreen = () => {
    setShowStoppingScreen(false);
  };

  const runProjectConfiguration = () => {
    if (isStopping) return;

    if (isRunning) {
      stopProjectExecution();
    } else {
      const commandList = generateCommandList(
        configState,
        globalDropdownValues,
        {
          attachState,
          configSidebarCommands,
          configSidebarSectionsActual,
          showTestSections,
          discoveredVersions
        }
      );
      if (terminalRef.current) {
        updateIsRunning(true);
        terminalRef.current.openTabs(commandList);
      }
    }
  };
  
  const getSectionPathStatus = (sectionId, statuses) => {
    if (!statuses) return STATUS.WAITING;
    const cacheKey = sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const sectionStatus = statuses[cacheKey];
    if (!sectionStatus) return STATUS.WAITING;
    if (sectionStatus.status === 'no_specific_checks') return STATUS.VALID;
    return sectionStatus;
  };

  const getSectionGitBranch = (sectionId, statuses) => {
    if (!statuses) return 'waiting';
    const cacheKey = sectionId.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    return statuses[cacheKey]?.gitBranch || 'N/A';
  };

  useEffect(() => {
    if (onConfigStateChange && initialized) {
      onConfigStateChange(configState);
    }
  }, [configState, onConfigStateChange, initialized]);

  useImperativeHandle(ref, () => ({
    getCurrentState: () => ({ configState, attachState }),
    setStateFromImport: ({ configState: newConfig, attachState: newAttach }) => {
      if (newConfig) setConfigState(newConfig);
      if (newAttach) setAttachState(newAttach);
    }
  }));

  return (
    <div className="config-container">
      <Notification 
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
      
      <StoppingStatusScreen
        terminals={terminalRef.current?.getTerminals ? terminalRef.current.getTerminals() : []}
        isVisible={showStoppingScreen}
        projectName={projectName}
        onClose={handleCloseStoppingScreen}
      />
      
      <div id="config-sections" className={isCollapsed ? 'hidden' : ''}>
        {visibleSections.map(section => (
          <ConfigSection
            key={section.id}
            section={section}
            config={configState[section.id] || {}}
            toggleEnabled={(sectionId, enabled) => {
              if (isRunning) {
                setNotification({ message: 'Cannot change settings while the project is running.', type: 'error', isVisible: true });
                return;
              }
              toggleSectionEnabled(sectionId, enabled);
            }}
            setMode={(sectionId, mode, subSectionId) => {
              if (isRunning) {
                setNotification({ message: 'Cannot change deployment type while the project is running.', type: 'error', isVisible: true });
                return;
              }
              setMode(sectionId, mode, subSectionId);
            }}
            setSectionDropdownValue={setSectionDropdownValue}
            globalDropdownValues={globalDropdownValues}
            isAttached={attachState[section.id] || false}
            onAttachToggle={(attached) => handleAttachToggle(section.id, attached)}
            isAttachWarning={warningState[section.id] || false}
            isLocked={isRunning}
            sectionPathStatus={getSectionPathStatus(section.id, verificationStatuses)}
            sectionGitBranch={getSectionGitBranch(section.id, verificationStatuses)}
            onTriggerRefresh={onTriggerRefresh}
            attachState={attachState}
            configState={configState}
            toggleSubSectionEnabled={(sectionId, subSectionId, enabled) => {
                if (isRunning) {
                  setNotification({ message: 'Cannot change settings while the project is running.', type: 'error', isVisible: true });
                  return;
                }
                toggleSubSectionEnabled(sectionId, subSectionId, enabled);
            }}
            openFloatingTerminal={openFloatingTerminal}
            configSidebarCommands={configSidebarCommands}
            onBranchChangeError={onBranchChangeError}
            showAppNotification={showAppNotification}
          />
        ))}
      </div>
      
      <div className="run-button-container">
        <RunButton
          isStopping={isStopping}
          isRunning={isRunning}
          projectName={projectName}
          onClick={runProjectConfiguration}
          disabled={
            isStopping ||
            (!isRunning &&
              generateCommandList(
                configState,
                globalDropdownValues,
                {
                  attachState,
                  configSidebarCommands,
                  configSidebarSectionsActual,
                  showTestSections,
                  discoveredVersions
                }
              ).length === 0)
          }
        />
      </div>
    </div>
  );
});

export default ProjectConfiguration;