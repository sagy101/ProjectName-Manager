import { useState, useEffect, useCallback } from 'react';

export const useTabManagement = (tabsContainerRef, terminals, activeTerminalId) => {
    const [visibleTabs, setVisibleTabs] = useState([]);
    const [overflowTabs, setOverflowTabs] = useState([]);
    const [overflowTabsOpen, setOverflowTabsOpen] = useState(false);

    const recalculateVisibleTabs = useCallback(() => {
        if (!tabsContainerRef.current) return;

        setVisibleTabs(terminals);
        setOverflowTabs([]);

        setTimeout(() => {
            if (!tabsContainerRef.current) return;

            const containerWidth = tabsContainerRef.current.clientWidth;
            const tabElements = Array.from(tabsContainerRef.current.querySelectorAll('.tab:not(.overflow-indicator)'));

            let width = 0;
            let visibleCount = 0;
            const maxWidth = containerWidth - 40; 

            for (const tab of tabElements) {
                width += tab.offsetWidth;
                if (width <= maxWidth) {
                    visibleCount++;
                } else {
                    break;
                }
            }

            if (visibleCount >= terminals.length) {
                setVisibleTabs(terminals);
                setOverflowTabs([]);
            } else {
                const activeTabIndex = terminals.findIndex(t => t.id === activeTerminalId);
                if (activeTabIndex >= visibleCount) {
                    const newVisibleTabs = [
                        terminals[activeTabIndex],
                        ...terminals.slice(0, activeTabIndex).slice(0, visibleCount - 1)
                    ];
                    const newOverflowTabs = [
                        ...terminals.slice(0, activeTabIndex).slice(visibleCount - 1),
                        ...terminals.slice(activeTabIndex + 1)
                    ];
                    setVisibleTabs(newVisibleTabs);
                    setOverflowTabs(newOverflowTabs);
                } else {
                    setVisibleTabs(terminals.slice(0, visibleCount));
                    setOverflowTabs(terminals.slice(visibleCount));
                }
            }
        }, 0);
    }, [terminals, activeTerminalId, tabsContainerRef]);

    useEffect(() => {
        setVisibleTabs(terminals);
    }, [terminals]);

    useEffect(() => {
        recalculateVisibleTabs();
        const handleResize = () => recalculateVisibleTabs();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [terminals, activeTerminalId, recalculateVisibleTabs]);

    const toggleOverflowTabs = useCallback((e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setOverflowTabsOpen(prev => !prev);
    }, []);

    useEffect(() => {
        if (!overflowTabsOpen) return;
        const handleClickOutside = (e) => {
            const overflowButton = tabsContainerRef.current?.querySelector('.overflow-indicator');
            const dropdownEl = document.querySelector('[data-testid="overflow-dropdown"]');
            const tabInfoPanelEl = document.querySelector('.tab-info-panel');
            const commandPopupEl = document.querySelector('.command-popup-overlay');

            const clickedOnKeeperElement = 
                (overflowButton && overflowButton.contains(e.target)) ||
                (dropdownEl && dropdownEl.contains(e.target)) ||
                (tabInfoPanelEl && tabInfoPanelEl.contains(e.target)) ||
                (commandPopupEl && commandPopupEl.contains(e.target));

            if (!clickedOnKeeperElement) {
                setOverflowTabsOpen(false);
            }
        };

        const timerId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);

        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [overflowTabsOpen, tabsContainerRef]);

    return {
        visibleTabs,
        overflowTabs,
        overflowTabsOpen,
        setOverflowTabsOpen,
        toggleOverflowTabs
    };
}; 