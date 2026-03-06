// frontend/__tests__/utils/imageUtils.test.ts
import { optimizedImageUrl } from '../../utils/imageUtils';

const UNSPLASH = 'https://images.unsplash.com/photo-12345678';

describe('optimizedImageUrl', () => {
  // ── Null / falsy inputs ───────────────────────────────────────────────────

  it('returns empty string for null', () => {
    expect(optimizedImageUrl(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(optimizedImageUrl(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(optimizedImageUrl('')).toBe('');
  });

  // ── Non-Unsplash URLs pass through unchanged ─────────────────────────────

  it('passes through a plain HTTPS URL unchanged', () => {
    const url = 'https://example.com/image.jpg';
    expect(optimizedImageUrl(url)).toBe(url);
  });

  it('passes through an S3 URL unchanged', () => {
    const url = 'https://mybucket.s3.amazonaws.com/recipe.png';
    expect(optimizedImageUrl(url)).toBe(url);
  });

  it('passes through a Cloudinary URL unchanged', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    expect(optimizedImageUrl(url)).toBe(url);
  });

  // ── Unsplash URL sizing ───────────────────────────────────────────────────

  it('appends default w=800 to a bare Unsplash URL', () => {
    expect(optimizedImageUrl(UNSPLASH)).toBe(`${UNSPLASH}?w=800`);
  });

  it('appends custom width to a bare Unsplash URL', () => {
    expect(optimizedImageUrl(UNSPLASH, 400)).toBe(`${UNSPLASH}?w=400`);
  });

  it('uses & separator when URL already has query parameters', () => {
    const url = `${UNSPLASH}?auto=format&fit=crop`;
    expect(optimizedImageUrl(url)).toBe(`${url}&w=800`);
  });

  // ── Does not double-apply width ───────────────────────────────────────────

  it('does not re-add w= when already present via ?', () => {
    const url = `${UNSPLASH}?w=400`;
    expect(optimizedImageUrl(url)).toBe(url);
  });

  it('does not re-add w= when already present via &', () => {
    const url = `${UNSPLASH}?auto=format&w=600`;
    expect(optimizedImageUrl(url)).toBe(url);
  });

  it('preserves existing params when adding width', () => {
    const url = `${UNSPLASH}?ixlib=rb-4.0.3&ixid=abc`;
    const result = optimizedImageUrl(url, 800);
    expect(result).toContain('ixlib=rb-4.0.3');
    expect(result).toContain('w=800');
  });
});
