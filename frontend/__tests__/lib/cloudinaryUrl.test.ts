// P3: Cloudinary transform helper.
//
// Verifies cldUrl(rawUrl, opts) injects f_auto,q_auto,w_<w>,dpr_<dpr>
// transforms into Cloudinary URLs while passing non-Cloudinary URLs
// through untouched. Idempotent — calling twice does not stack transforms.

import { cldUrl } from '../../lib/cloudinaryUrl';

const RAW = 'https://res.cloudinary.com/sazon/image/upload/v1700000000/recipes/abc.jpg';
const WITH_TRANSFORM =
  'https://res.cloudinary.com/sazon/image/upload/w_800,q_70/v1700000000/recipes/abc.jpg';
const UNSPLASH = 'https://images.unsplash.com/photo-12345?w=400';

describe('P3: cldUrl', () => {
  it('injects f_auto,q_auto and width into a bare Cloudinary URL', () => {
    const out = cldUrl(RAW, { width: 400 });
    expect(out).toMatch(/\/upload\/[^/]*f_auto/);
    expect(out).toMatch(/\/upload\/[^/]*q_auto/);
    expect(out).toMatch(/\/upload\/[^/]*w_400/);
    expect(out).toContain('/v1700000000/recipes/abc.jpg');
  });

  it('replaces existing transforms instead of stacking them', () => {
    const out = cldUrl(WITH_TRANSFORM, { width: 400 });
    // Old w_800 should be gone, new w_400 should be present.
    const transformsSeg = out.split('/upload/')[1].split('/')[0];
    expect(transformsSeg).not.toContain('w_800');
    expect(transformsSeg).toContain('w_400');
    expect(transformsSeg).toContain('f_auto');
    expect(transformsSeg).toContain('q_auto');
    expect(out).toContain('/v1700000000/recipes/abc.jpg');
  });

  it('is idempotent — running cldUrl twice yields the same output', () => {
    const once = cldUrl(RAW, { width: 400, dpr: 2 });
    const twice = cldUrl(once, { width: 400, dpr: 2 });
    expect(twice).toBe(once);
  });

  it('appends dpr when provided', () => {
    const out = cldUrl(RAW, { width: 400, dpr: 3 });
    expect(out).toContain('dpr_3');
  });

  it('appends c_fill when both width and height are set', () => {
    const out = cldUrl(RAW, { width: 400, height: 300 });
    expect(out).toContain('w_400');
    expect(out).toContain('h_300');
    expect(out).toContain('c_fill');
  });

  it('returns Unsplash and other URLs unchanged', () => {
    expect(cldUrl(UNSPLASH, { width: 400 })).toBe(UNSPLASH);
    expect(cldUrl('https://example.com/x.jpg', { width: 400 })).toBe('https://example.com/x.jpg');
  });

  it('returns empty string for null / undefined / empty input', () => {
    expect(cldUrl(null, { width: 400 })).toBe('');
    expect(cldUrl(undefined, { width: 400 })).toBe('');
    expect(cldUrl('', { width: 400 })).toBe('');
  });

  it('rounds fractional width / height to integer pixel values', () => {
    const out = cldUrl(RAW, { width: 399.6, height: 240.4 });
    expect(out).toContain('w_400');
    expect(out).toContain('h_240');
  });
});
