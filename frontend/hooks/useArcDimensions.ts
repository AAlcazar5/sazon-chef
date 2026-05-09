// frontend/hooks/useArcDimensions.ts
// K18: shared SVG arc geometry math for circular progress components.
// Centralizes the (size, strokeWidth) → (radius, circumference, center)
// derivation that AnimatedRing + ProgressRing both ran inline.

export interface ArcDimensions {
  radius: number;
  circumference: number;
  center: number;
}

export function useArcDimensions(size: number, strokeWidth: number): ArcDimensions {
  const radius = (size - strokeWidth) / 2;
  return {
    radius,
    circumference: 2 * Math.PI * radius,
    center: size / 2,
  };
}
