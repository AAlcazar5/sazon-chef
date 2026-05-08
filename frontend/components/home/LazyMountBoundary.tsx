// frontend/components/home/LazyMountBoundary.tsx
// ROADMAP 4.0 HX3.3 — generic lazy-mount primitive.
//
// Children render only after the boundary's `onLayout` reports a y-position
// within `triggerDistance` pixels of the visible viewport. Once mounted,
// children stay mounted — no flicker on scroll-back.
//
// Why not IntersectionObserver? React Native doesn't ship one. We mimic it
// with a parent ScrollView's onScroll + the boundary's own onLayout: the
// boundary records its absolute y on layout; the parent updates the shared
// scrollY. The boundary mounts when (boundaryY - triggerDistance) ≤
// scrollY + viewportHeight.
//
// This component supplies the local-state half. The shared scrollY +
// viewportHeight come in as props so the parent ScrollView controls them
// in one place.
import React, { useState, useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';

interface LazyMountBoundaryProps {
  children: React.ReactNode;
  /** Current scroll offset of the parent ScrollView (its scrollY). */
  scrollY: number;
  /** Visible viewport height (parent ScrollView's height). */
  viewportHeight: number;
  /**
   * Distance below the viewport at which children mount. Default 600px —
   * enough to start work before the user scrolls into view.
   */
  triggerDistance?: number;
  /** Optional style for the placeholder wrapper (matches expected size). */
  placeholderStyle?: ViewStyle;
  /** Test override: force `mounted=true` immediately. */
  forceMount?: boolean;
}

const DEFAULT_TRIGGER_DISTANCE = 600;

export const LazyMountBoundary: React.FC<LazyMountBoundaryProps> = ({
  children,
  scrollY,
  viewportHeight,
  triggerDistance = DEFAULT_TRIGGER_DISTANCE,
  placeholderStyle,
  forceMount,
}) => {
  const [mounted, setMounted] = useState<boolean>(Boolean(forceMount));
  const boundaryYRef = useRef<number | null>(null);

  const handleLayout = (e: LayoutChangeEvent): void => {
    boundaryYRef.current = e.nativeEvent.layout.y;
    if (shouldMount(boundaryYRef.current, scrollY, viewportHeight, triggerDistance)) {
      setMounted(true);
    }
  };

  useEffect(() => {
    if (mounted) return;
    if (boundaryYRef.current === null) return;
    if (shouldMount(boundaryYRef.current, scrollY, viewportHeight, triggerDistance)) {
      setMounted(true);
    }
  }, [scrollY, viewportHeight, triggerDistance, mounted]);

  if (mounted) {
    return <View onLayout={handleLayout}>{children}</View>;
  }

  return (
    <View
      onLayout={handleLayout}
      style={placeholderStyle}
      testID="lazy-mount-placeholder"
    />
  );
};

/**
 * Pure decision: should the boundary mount given its position vs the
 * viewport? Exported so the same logic that runs in production runs in
 * unit tests without React.
 */
export function shouldMount(
  boundaryY: number,
  scrollY: number,
  viewportHeight: number,
  triggerDistance: number
): boolean {
  return boundaryY - triggerDistance <= scrollY + viewportHeight;
}

export default LazyMountBoundary;
