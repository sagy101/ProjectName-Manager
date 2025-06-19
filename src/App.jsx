import React from 'react';
import ProjectConfiguration from './components/ProjectConfiguration';
import TerminalContainer from './components/TerminalContainer';
import EnvironmentVerification from './components/EnvironmentVerification';
import LoadingScreen from './components/LoadingScreen';
import Notification from './components/Notification';
import FloatingTerminal from './components/FloatingTerminal';
import AppControlSidebar from './components/AppControlSidebar';
import TabInfoPanel from './components/TabInfoPanel';
import ImportStatusScreen from './components/ImportStatusScreen';
import HealthReportScreen from './components/HealthReportScreen';
import AutoSetupScreen from './components/AutoSetupScreen';
import FixCommandConfirmation from './components/FixCommandConfirmation';
import './styles/app.css';

// Import custom hooks
import { useAppState } from './hooks/useAppState';
import { useFloatingTerminals } from './hooks/useFloatingTerminals';
import { useConfigurationManagement } from './hooks/useConfigurationManagement';
import { useAppEventHandlers } from './hooks/useAppEventHandlers';
import { useAppEffects } from './hooks/useAppEffects';
import { useFixCommands } from './hooks/useFixCommands';
import { useAutoSetup } from './hooks/useAutoSetup';
import useHealthReport from './hooks/useHealthReport';

// Constants for sidebar dimensions
const SIDEBAR_EXPANDED_WIDTH = 280; // From app-control-sidebar.css
const SIDEBAR_COLLAPSED_WIDTH = 50; // From app-control-sidebar.css

const App = () => {
  // Initialize all state using custom hook
  const appState = useAppState();
  const { setAppNotification } = appState;

  // Create a callback for showAppNotification that will be available to useAppEffects
  const showAppNotificationCallback = React.useCallback((message, type = 'info', autoCloseTime = 3000) => {
    debugLog('App: showAppNotification called with:', { message, type, autoCloseTime });
    setAppNotification({
      isVisible: true,
      message,
      type,
      autoCloseTime
    });
  }, [setAppNotification]);

  // Initialize effects and get triggerGitRefresh
  const { triggerGitRefresh } = useAppEffects({
    projectName: appState.projectName,
    isLoading: appState.isLoading,
    verificationStatuses: appState.verificationStatuses,
    setVerificationStatuses: appState.setVerificationStatuses,
    setGeneralVerificationConfig: appState.setGeneralVerificationConfig,
    setGeneralHeaderConfig: appState.setGeneralHeaderConfig,
    setDiscoveredVersions: appState.setDiscoveredVersions,
    setLoadingStatus: appState.setLoadingStatus,
    setLoadingProgress: appState.setLoadingProgress,
    setIsLoading: appState.setIsLoading,
    setAppNotification: appState.setAppNotification,
    terminalRef: appState.terminalRef,
    showAppNotification: showAppNotificationCallback
  });

  // Initialize event handlers
  const eventHandlers = useAppEventHandlers({
    setVerificationStatuses: appState.setVerificationStatuses,
    initializeVerificationStatuses: appState.initializeVerificationStatuses,
    setGeneralVerificationConfig: appState.setGeneralVerificationConfig,
    setConfigState: appState.setConfigState,
    setAppIsProjectRunning: appState.setAppIsProjectRunning,
    setAppNotification: appState.setAppNotification,
    setIsMainTerminalWritable: appState.setIsMainTerminalWritable,
    setIsConfigCollapsed: appState.setIsConfigCollapsed,
    setShowTestSections: appState.setShowTestSections,
    setNoRunMode: appState.setNoRunMode,
    triggerGitRefresh,
    setGlobalDropdownValues: appState.setGlobalDropdownValues
  });

  // Initialize floating terminal management
  const floatingTerminalHandlers = useFloatingTerminals({
    floatingTerminals: appState.floatingTerminals,
    setFloatingTerminals: appState.setFloatingTerminals,
    activeFloatingTerminalId: appState.activeFloatingTerminalId,
    setActiveFloatingTerminalId: appState.setActiveFloatingTerminalId,
    nextZIndex: appState.nextZIndex,
    setNextZIndex: appState.setNextZIndex,
    positionOffset: appState.positionOffset,
    isFloatingSidebarExpanded: appState.isFloatingSidebarExpanded,
    setIsFloatingSidebarExpanded: appState.setIsFloatingSidebarExpanded,
    infoPanelState: appState.infoPanelState,
    setInfoPanelState: appState.setInfoPanelState,
    configState: appState.configState,
    noRunMode: appState.noRunMode
  });

  // Initialize configuration management
  const configManagement = useConfigurationManagement({
    projectConfigRef: appState.projectConfigRef,
    globalDropdownValues: appState.globalDropdownValues,
    verificationStatuses: appState.verificationStatuses,
    configSidebarSections: appState.configSidebarSections,
    showAppNotification: eventHandlers.showAppNotification,
    setImportResult: appState.setImportResult,
    setImportGitBranches: appState.setImportGitBranches,
    setShowImportStatusScreen: appState.setShowImportStatusScreen,
    setIsPerformingImport: appState.setIsPerformingImport,
    setGlobalDropdownValues: appState.setGlobalDropdownValues,
    setConfigState: appState.setConfigState,
    importResult: appState.importResult,
    isPerformingImport: appState.isPerformingImport
  });

  // Initialize fix command management
  const fixCommands = useFixCommands({
    appState,
    eventHandlers,
    floatingTerminalHandlers
  });

  // Initialize auto setup management
  const autoSetup = useAutoSetup({
    verificationStatuses: appState.verificationStatuses,
    generalVerificationConfig: appState.generalVerificationConfig,
    configSidebarAbout: require(
      process.env.CONFIG_SIDEBAR_ABOUT || './configurationSidebarAbout.json'
    ),
    showTestSections: appState.showTestSections,
    onOpenFloatingTerminal: floatingTerminalHandlers.openFloatingTerminal,
    onCommandComplete: fixCommands.handleFixCommandComplete,
    onVerificationRerun: (verificationId) => {
      // Re-run verification after successful fix
      if (window.electron?.rerunSingleVerification) {
        window.electron.rerunSingleVerification(verificationId);
      }
    },
    showAppNotification: eventHandlers.showAppNotification
  });

  // Get live terminal data
  const [liveTerminals, setLiveTerminals] = React.useState([]);
  
  // Update live terminals data
  React.useEffect(() => {
    const updateTerminals = () => {
      const terminals = appState.terminalRef.current?.getTerminals ? appState.terminalRef.current.getTerminals() : [];
      setLiveTerminals(terminals);
    };
    
    // Initial update
    updateTerminals();
    
    // Update every second for live data
    const interval = setInterval(updateTerminals, 1000);
    
    return () => clearInterval(interval);
  }, [appState.terminalRef]);

  // Initialize health report management
  const healthReport = useHealthReport({
    terminals: liveTerminals,
    isHealthReportVisible: appState.isHealthReportVisible,
    setIsHealthReportVisible: appState.setIsHealthReportVisible,
    onFocusTerminal: (terminalId) => {
      if (appState.terminalRef.current?.focusTab) {
        appState.terminalRef.current.focusTab(terminalId);
      }
    },
    onRefreshTerminal: (terminalId) => {
      if (appState.terminalRef.current?.refreshTab) {
        appState.terminalRef.current.refreshTab(terminalId);
      }
    }
  });

  // Log appNotification state changes
  React.useEffect(() => {
    debugLog('App: appNotification state updated:', appState.appNotification);
  }, [appState.appNotification]);

  // Show loading screen while loading
  if (appState.isLoading) {
    return (
      <LoadingScreen 
        progress={appState.loadingProgress} 
        statusMessage={appState.loadingStatus} 
        projectName={appState.projectName}
      />
    );
  }

  return (
    <>
      {/* Main application content */}
      <div style={{ height: '100vh', position: 'relative', display: 'flex' }}>
        {/* app-content-wrapper now correctly receives padding for the collapsed sidebar */}
        <div
          className="app-content-wrapper"
          style={{
            flexGrow: 1,
            paddingRight: appState.isFloatingSidebarExpanded ? `${SIDEBAR_EXPANDED_WIDTH}px` : `${SIDEBAR_COLLAPSED_WIDTH}px`,
            transition: 'padding-right 0.3s ease-in-out',
            height: '100%', // Use 100% to fill parent flex item
            display: 'flex', // For its children .sidebar and .main-content
            overflow: 'hidden',
          }}
        >
          <div className={`sidebar ${appState.isConfigCollapsed ? 'collapsed' : ''}`}> {/* ProjectConfiguration's wrapper */}
            <ProjectConfiguration
              ref={appState.projectConfigRef}
              projectName={appState.projectName}
              globalDropdownValues={appState.globalDropdownValues}
              discoveredVersions={appState.discoveredVersions}
              terminalRef={appState.terminalRef}
              verificationStatuses={appState.verificationStatuses}
              onTriggerRefresh={triggerGitRefresh}
              showTestSections={appState.showTestSections}
              onConfigStateChange={eventHandlers.handleConfigStateChange}
              onIsRunningChange={eventHandlers.handleProjectRunStateChange}
              openFloatingTerminal={floatingTerminalHandlers.openFloatingTerminal}
              onBranchChangeError={eventHandlers.showAppNotification}
              showAppNotification={eventHandlers.showAppNotification}
              onFixCommand={fixCommands.handleFixCommand}
              isCollapsed={appState.isConfigCollapsed}
            />
          </div>
          <button 
            className={`config-collapse-btn ${appState.isConfigCollapsed ? 'collapsed' : ''}`}
            onClick={() => appState.setIsConfigCollapsed(prev => !prev)}
            title={appState.isConfigCollapsed ? 'Expand Configuration' : 'Collapse Configuration'}
          >
            {appState.isConfigCollapsed ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            )}
          </button>
          <div className="main-content"> {/* TerminalContainer etc. */}
            <EnvironmentVerification
              projectName={appState.projectName}
              statusMap={appState.verificationStatuses.general}
              verificationConfig={appState.generalVerificationConfig}
              headerConfig={appState.generalHeaderConfig}
              globalDropdownValues={appState.globalDropdownValues}
              onGlobalDropdownChange={eventHandlers.handleGlobalDropdownChange}
              onInitiateRefresh={eventHandlers.handleInitiateRefresh}
              onFixCommand={fixCommands.handleFixCommand}
            />
            <TerminalContainer 
              ref={appState.terminalRef} 
              noRunMode={appState.noRunMode} 
              configState={appState.configState} 
              projectName={appState.projectName} 
              isReadOnly={!appState.isMainTerminalWritable} // Pass inverse for isReadOnly prop
            />
          </div>
        </div> {/* End of app-content-wrapper */}

        {/* FloatingTerminalSidebar is a direct child of the outer flex container,
            allowing it to be fixed to the right without being affected by app-content-wrapper's padding. */}
        {!appState.isLoading && (
          <AppControlSidebar
            floatingTerminals={appState.floatingTerminals}
            onShowTerminal={floatingTerminalHandlers.showFloatingTerminal}
            onCloseTerminal={floatingTerminalHandlers.closeFloatingTerminal}
            onToggleMinimize={floatingTerminalHandlers.toggleMinimizeFloatingTerminal}
            onOpenAbout={floatingTerminalHandlers.showFloatingTerminalInfoPanel}
            activeFloatingTerminalId={appState.activeFloatingTerminalId}
            isExpanded={appState.isFloatingSidebarExpanded}
            onToggleExpand={floatingTerminalHandlers.toggleFloatingSidebarExpand}
            showTestSections={appState.showTestSections}
            noRunMode={appState.noRunMode}
            isProjectRunning={appState.appIsProjectRunning}
            onToggleTestSections={() => appState.setShowTestSections(prev => !prev)}
            onToggleNoRunMode={() => appState.setNoRunMode(prev => !prev)}
            showAppNotification={eventHandlers.showAppNotification}
            isMainTerminalWritable={appState.isMainTerminalWritable}
            onToggleMainTerminalWritable={() => appState.setIsMainTerminalWritable(prev => !prev)}
            onExportConfig={configManagement.handleExportConfig}
            onImportConfig={configManagement.handleImportConfig}
            onToggleAllVerifications={fixCommands.handleToggleAllVerifications}
            healthStatus={healthReport.healthStatus}
            onOpenHealthReport={healthReport.handleOpenHealthReport}
            autoSetupStatus={autoSetup.autoSetupStatus}
            onOpenAutoSetup={autoSetup.openAutoSetup}
          />
        )}
      </div> {/* End of the main flex container for isLoading=false case */}

      {/* Global Modals & Notifications: These render on top of everything, outside the main layout flow. */}
      {/* istanbul ignore next */}
      <Notification
        isVisible={appState.appNotification.isVisible}
        message={appState.appNotification.message}
        type={appState.appNotification.type}
        onClose={eventHandlers.hideAppNotification}
        autoCloseTime={appState.appNotification.autoCloseTime}
      />
      {/* istanbul ignore next */}
      <FixCommandConfirmation
        verification={appState.pendingFixVerification}
        onConfirm={fixCommands.executePendingFixCommand}
        onCancel={() => appState.setPendingFixVerification(null)}
      />
      {/* Import Status Screen */}
      {/* istanbul ignore next */}
      <ImportStatusScreen
        isVisible={appState.showImportStatusScreen}
        projectName={appState.projectName}
        onClose={configManagement.closeImportStatusScreen}
        gitBranches={appState.importGitBranches}
        onImportComplete={configManagement.performImport}
      />
      {/* Health Report Screen */}
      {/* istanbul ignore next */}
      <HealthReportScreen
        isVisible={healthReport.isHealthReportVisible}
        projectName={appState.projectName}
        onClose={healthReport.handleCloseHealthReport}
        terminals={liveTerminals}
        noRunMode={appState.noRunMode}
        onRefreshTerminal={healthReport.handleRefreshTerminal}
        onFocusTerminal={healthReport.handleFocusTerminal}
      />
      {/* Auto Setup Screen */}
      <AutoSetupScreen
        isVisible={autoSetup.isAutoSetupVisible}
        projectName={appState.projectName}
        onClose={autoSetup.closeAutoSetup}
        autoSetupStatus={autoSetup.autoSetupStatus}
        commandGroups={autoSetup.commandGroups}
        commandStatuses={autoSetup.commandStatuses}
        activeTerminals={autoSetup.activeTerminals}
        floatingTerminals={appState.floatingTerminals}
        commandTimeouts={autoSetup.commandTimeouts}
        progress={autoSetup.progress}
        onStartAutoSetup={autoSetup.startAutoSetup}
        onStopAutoSetup={autoSetup.stopAutoSetup}
        onStartPriorityGroup={autoSetup.startPriorityGroup}
        onRetryCommand={autoSetup.retryCommand}
        onTerminateCommand={autoSetup.terminateCommand}
        onViewTerminal={floatingTerminalHandlers.showFloatingTerminal}
        noRunMode={appState.noRunMode}
      />
      {/* Render FloatingTerminals */}
      {/* istanbul ignore next */}
      {appState.floatingTerminals.map(terminal => (
        <FloatingTerminal
          key={terminal.id}
          id={terminal.id}
          title={terminal.title}
          command={terminal.command}
          isVisible={terminal.isVisible}
          isMinimized={terminal.isMinimized}
          onClose={floatingTerminalHandlers.closeFloatingTerminal}
          onFocus={floatingTerminalHandlers.focusFloatingTerminal}
          zIndex={terminal.zIndex}
          initialPosition={terminal.position}
          onMinimize={floatingTerminalHandlers.toggleMinimizeFloatingTerminal}
          onOpenInfo={floatingTerminalHandlers.showFloatingTerminalInfoPanel}
          isFixCommand={terminal.isFixCommand || false}
          isAutoSetup={terminal.isAutoSetup || false}
          onShowNotification={eventHandlers.showAppNotification}
          onCommandComplete={(terminalId, status, exitCode) => {
          console.log('🟣 APP_LEVEL: onCommandComplete called with:', terminalId, status, exitCode);
          const handler = terminal.onCommandComplete || fixCommands.handleFixCommandComplete;
          console.log('🟣 APP_LEVEL: Using handler:', handler.name || 'anonymous');
          handler(terminalId, status, exitCode);
        }}
          isReadOnly={false}
          noRunMode={appState.noRunMode}
        />
      ))}
      {/* Render TabInfoPanel for Floating Terminals */}
      {/* istanbul ignore next */}
      {appState.infoPanelState.isVisible && appState.infoPanelState.terminalData && (() => {
        // Get the live terminal data from floatingTerminals
        const liveTerminal = appState.floatingTerminals.find(t => t.id === appState.infoPanelState.terminalData.id);
        if (!liveTerminal) return null;
        
        // Merge the live status data with the static panel data
        const terminalDataWithLiveStatus = {
          ...appState.infoPanelState.terminalData,
          status: liveTerminal.status,
          exitStatus: liveTerminal.exitStatus,
          exitCode: liveTerminal.exitCode,
          processStates: liveTerminal.processStates,
          processCount: liveTerminal.processCount
        };

          return (
            <TabInfoPanel
              terminal={terminalDataWithLiveStatus}
              position={appState.infoPanelState.position}
              onClose={floatingTerminalHandlers.closeFloatingTerminalInfoPanel}
              onRefresh={() => debugLog('Refresh clicked for floating term info - no-op')}
              configState={appState.configState}
              noRunMode={appState.noRunMode}
              detailsPopupOpen={appState.infoPanelState.detailsOpen}
              onOpenDetailsPopup={floatingTerminalHandlers.openInfoPanelDetails}
              onCloseDetailsPopup={floatingTerminalHandlers.closeInfoPanelDetails}
            />
          );
      })()}
    </>
  );
};

export default App;
