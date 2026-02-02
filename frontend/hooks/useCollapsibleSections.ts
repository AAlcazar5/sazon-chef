// frontend/hooks/useCollapsibleSections.ts
// Custom hook for managing collapsible section state

import { useState, useCallback } from 'react';
import { HapticPatterns } from '../constants/Haptics';

interface UseCollapsibleSectionsOptions {
  /** Initial collapsed state for sections */
  initialState?: Record<string, boolean>;
  /** Whether to trigger haptic feedback on toggle */
  hapticFeedback?: boolean;
}

interface UseCollapsibleSectionsReturn {
  /** Current collapsed state for all sections */
  collapsedSections: Record<string, boolean>;
  /** Check if a specific section is collapsed */
  isCollapsed: (sectionKey: string) => boolean;
  /** Toggle a section's collapsed state */
  toggleSection: (sectionKey: string) => void;
  /** Collapse a specific section */
  collapseSection: (sectionKey: string) => void;
  /** Expand a specific section */
  expandSection: (sectionKey: string) => void;
  /** Collapse all sections */
  collapseAll: (sectionKeys: string[]) => void;
  /** Expand all sections */
  expandAll: (sectionKeys: string[]) => void;
}

export function useCollapsibleSections(
  options: UseCollapsibleSectionsOptions = {}
): UseCollapsibleSectionsReturn {
  const { initialState = {}, hapticFeedback = true } = options;

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(initialState);

  const isCollapsed = useCallback(
    (sectionKey: string) => !!collapsedSections[sectionKey],
    [collapsedSections]
  );

  const toggleSection = useCallback((sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
    if (hapticFeedback) {
      HapticPatterns.buttonPress();
    }
  }, [hapticFeedback]);

  const collapseSection = useCallback((sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: true,
    }));
  }, []);

  const expandSection = useCallback((sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: false,
    }));
  }, []);

  const collapseAll = useCallback((sectionKeys: string[]) => {
    setCollapsedSections(prev => {
      const newState = { ...prev };
      sectionKeys.forEach(key => {
        newState[key] = true;
      });
      return newState;
    });
  }, []);

  const expandAll = useCallback((sectionKeys: string[]) => {
    setCollapsedSections(prev => {
      const newState = { ...prev };
      sectionKeys.forEach(key => {
        newState[key] = false;
      });
      return newState;
    });
  }, []);

  return {
    collapsedSections,
    isCollapsed,
    toggleSection,
    collapseSection,
    expandSection,
    collapseAll,
    expandAll,
  };
}

export default useCollapsibleSections;
