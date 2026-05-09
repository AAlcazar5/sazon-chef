import { useArcDimensions } from '../../hooks/useArcDimensions';

describe('useArcDimensions', () => {
  it('computes radius as half of (size - strokeWidth)', () => {
    expect(useArcDimensions(100, 10).radius).toBe(45);
    expect(useArcDimensions(60, 8).radius).toBe(26);
  });

  it('computes circumference as 2πr', () => {
    expect(useArcDimensions(100, 10).circumference).toBeCloseTo(2 * Math.PI * 45);
  });

  it('computes center as size / 2', () => {
    expect(useArcDimensions(100, 10).center).toBe(50);
    expect(useArcDimensions(60, 8).center).toBe(30);
  });

  it('handles zero strokeWidth', () => {
    const { radius, circumference, center } = useArcDimensions(100, 0);
    expect(radius).toBe(50);
    expect(circumference).toBeCloseTo(2 * Math.PI * 50);
    expect(center).toBe(50);
  });

  it('returns negative radius gracefully when strokeWidth > size', () => {
    expect(useArcDimensions(10, 20).radius).toBe(-5);
  });
});
