// backend/tests/services/recipeImportService.test.ts
// Tests for URL validation, JSON-LD extraction, and error handling

import { importRecipeFromUrl, RecipeImportError } from '../../src/services/recipeImportService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeJsonLdHtml(recipe: Record<string, any>): string {
  return `<html><head>
    <script type="application/ld+json">${JSON.stringify(recipe)}</script>
  </head><body>Recipe page</body></html>`;
}

function mockFetchOk(html: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => html,
  } as any);
}

const VALID_RECIPE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: 'Spaghetti Bolognese',
  description: 'A classic Italian pasta dish.',
  cookTime: 'PT30M',
  recipeYield: '4 servings',
  recipeCuisine: 'Italian',
  recipeCategory: 'Dinner',
  recipeIngredient: [
    '400g spaghetti',
    '500g ground beef',
    '1 can crushed tomatoes',
  ],
  recipeInstructions: [
    { '@type': 'HowToStep', text: 'Boil pasta according to package instructions.' },
    { '@type': 'HowToStep', text: 'Brown the beef in a pan.' },
    { '@type': 'HowToStep', text: 'Add tomatoes and simmer for 20 minutes.' },
  ],
  image: 'https://example.com/bolognese.jpg',
};

// ── URL Validation ─────────────────────────────────────────────────────────────

describe('importRecipeFromUrl — URL validation', () => {
  it('throws INVALID_URL for a plain string', async () => {
    await expect(importRecipeFromUrl('not-a-url'))
      .rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('throws INVALID_URL for a ftp:// URL', async () => {
    await expect(importRecipeFromUrl('ftp://example.com/recipe'))
      .rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('throws INVALID_URL for localhost', async () => {
    await expect(importRecipeFromUrl('http://localhost/recipe'))
      .rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('throws INVALID_URL for 127.0.0.1', async () => {
    await expect(importRecipeFromUrl('http://127.0.0.1/recipe'))
      .rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('throws INVALID_URL for 192.168.x.x private IP', async () => {
    await expect(importRecipeFromUrl('http://192.168.1.1/recipe'))
      .rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('throws INVALID_URL for 10.x.x.x private IP', async () => {
    await expect(importRecipeFromUrl('http://10.0.0.1/recipe'))
      .rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('throws INVALID_URL for raw IPv4 address', async () => {
    await expect(importRecipeFromUrl('http://1.2.3.4/recipe'))
      .rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('passes validation for a public HTTPS URL', async () => {
    // Just ensure it gets past validation (will fail at fetch)
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error: fetch failed'));
    await expect(importRecipeFromUrl('https://www.allrecipes.com/recipe/123'))
      .rejects.toMatchObject({ code: 'FETCH_FAILED' });
  });

  it('passes validation for a public HTTP URL', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error: fetch failed'));
    await expect(importRecipeFromUrl('http://www.foodnetwork.com/recipe/123'))
      .rejects.toMatchObject({ code: 'FETCH_FAILED' });
  });

  it('RecipeImportError has correct name and code', async () => {
    await expect(importRecipeFromUrl('not-a-url'))
      .rejects.toMatchObject({
        name: 'RecipeImportError',
        code: 'INVALID_URL',
      });
  });
});

// ── Fetch error handling ──────────────────────────────────────────────────────

describe('importRecipeFromUrl — fetch errors', () => {
  it('throws FETCH_FAILED for non-OK HTTP response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => 'text/html' },
    } as any);

    await expect(importRecipeFromUrl('https://example.com/recipe'))
      .rejects.toMatchObject({ code: 'FETCH_FAILED' });
  });

  it('throws FETCH_FAILED for non-HTML content-type', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/pdf' },
      text: async () => '%PDF',
    } as any);

    await expect(importRecipeFromUrl('https://example.com/recipe.pdf'))
      .rejects.toMatchObject({ code: 'FETCH_FAILED' });
  });

  it('throws FETCH_FAILED when network throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('fetch failed'));

    await expect(importRecipeFromUrl('https://example.com/recipe'))
      .rejects.toMatchObject({ code: 'FETCH_FAILED' });
  });
});

// ── JSON-LD extraction ────────────────────────────────────────────────────────

describe('importRecipeFromUrl — JSON-LD extraction', () => {
  it('extracts recipe from valid JSON-LD', async () => {
    mockFetchOk(makeJsonLdHtml(VALID_RECIPE_JSON_LD));

    const result = await importRecipeFromUrl('https://example.com/bolognese');

    expect(result.title).toBe('Spaghetti Bolognese');
    expect(result.description).toBe('A classic Italian pasta dish.');
    expect(result.cookTime).toBe(30);
    expect(result.cuisine).toBe('Italian');
    expect(result.servings).toBe(4);
    expect(result.ingredients).toHaveLength(3);
    expect(result.instructions).toHaveLength(3);
    expect(result.imageUrl).toBe('https://example.com/bolognese.jpg');
    expect(result.sourceUrl).toBe('https://example.com/bolognese');
    expect(result.sourceName).toBe('example.com');
  });

  it('parses cookTime PT1H30M as 90 minutes', async () => {
    mockFetchOk(makeJsonLdHtml({ ...VALID_RECIPE_JSON_LD, cookTime: 'PT1H30M' }));
    const result = await importRecipeFromUrl('https://example.com/recipe');
    expect(result.cookTime).toBe(90);
  });

  it('defaults cookTime to 30 when missing', async () => {
    const { cookTime: _, ...noTime } = VALID_RECIPE_JSON_LD;
    mockFetchOk(makeJsonLdHtml(noTime));
    const result = await importRecipeFromUrl('https://example.com/recipe');
    expect(result.cookTime).toBe(30);
  });

  it('handles numeric recipeYield', async () => {
    mockFetchOk(makeJsonLdHtml({ ...VALID_RECIPE_JSON_LD, recipeYield: 6 }));
    const result = await importRecipeFromUrl('https://example.com/recipe');
    expect(result.servings).toBe(6);
  });

  it('defaults cuisine to "General" when missing', async () => {
    const { recipeCuisine: _, ...noCuisine } = VALID_RECIPE_JSON_LD;
    mockFetchOk(makeJsonLdHtml(noCuisine));
    const result = await importRecipeFromUrl('https://example.com/recipe');
    expect(result.cuisine).toBe('General');
  });

  it('handles @graph wrapper in JSON-LD', async () => {
    const graphHtml = `<html><head>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', name: 'Recipe Page' },
          VALID_RECIPE_JSON_LD,
        ],
      })}</script>
    </head><body></body></html>`;
    mockFetchOk(graphHtml);

    const result = await importRecipeFromUrl('https://example.com/bolognese');
    expect(result.title).toBe('Spaghetti Bolognese');
  });

  it('handles string-format recipeInstructions', async () => {
    const withStringInstructions = {
      ...VALID_RECIPE_JSON_LD,
      recipeInstructions: 'Boil pasta.\nBrown beef.\nAdd tomatoes.',
    };
    mockFetchOk(makeJsonLdHtml(withStringInstructions));
    const result = await importRecipeFromUrl('https://example.com/recipe');
    expect(result.instructions.length).toBeGreaterThanOrEqual(3);
  });

  it('skips JSON-LD blocks that are missing name or ingredients', async () => {
    const incomplete = {
      '@type': 'Recipe',
      name: 'Incomplete',
      // missing recipeIngredient and recipeInstructions
    };
    // No valid JSON-LD → should fall through to AI (which we mock)
    mockFetchOk(makeJsonLdHtml(incomplete));

    // AI fallback: mock Anthropic SDK
    jest.mock('@anthropic-ai/sdk', () => ({
      default: jest.fn().mockImplementation(() => ({
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [{ text: JSON.stringify({
              title: 'AI Recipe',
              description: '',
              cookTime: 30,
              servings: 4,
              cuisine: 'General',
              mealType: null,
              ingredients: ['ingredient'],
              instructions: ['step 1'],
              imageUrl: null,
            }) }],
          }),
        },
      })),
    }));

    // If AI also throws (Anthropic not configured), we expect an error
    // The important thing is that the incomplete JSON-LD was skipped
    await expect(importRecipeFromUrl('https://example.com/recipe'))
      .rejects.toBeDefined();
  });

  it('extracts image from array format', async () => {
    const withArrayImage = {
      ...VALID_RECIPE_JSON_LD,
      image: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    };
    mockFetchOk(makeJsonLdHtml(withArrayImage));
    const result = await importRecipeFromUrl('https://example.com/recipe');
    expect(result.imageUrl).toBe('https://example.com/image1.jpg');
  });

  it('extracts image from object format with url property', async () => {
    const withObjectImage = {
      ...VALID_RECIPE_JSON_LD,
      image: { '@type': 'ImageObject', url: 'https://example.com/image.jpg' },
    };
    mockFetchOk(makeJsonLdHtml(withObjectImage));
    const result = await importRecipeFromUrl('https://example.com/recipe');
    expect(result.imageUrl).toBe('https://example.com/image.jpg');
  });

  it('sets sourceName from URL hostname (strips www.)', async () => {
    mockFetchOk(makeJsonLdHtml(VALID_RECIPE_JSON_LD));
    const result = await importRecipeFromUrl('https://www.allrecipes.com/recipe/123');
    expect(result.sourceName).toBe('allrecipes.com');
  });

  it('handles malformed JSON-LD gracefully (skips block)', async () => {
    const badJsonHtml = `<html><head>
      <script type="application/ld+json">{ invalid json {{ </script>
      <script type="application/ld+json">${JSON.stringify(VALID_RECIPE_JSON_LD)}</script>
    </head><body></body></html>`;
    mockFetchOk(badJsonHtml);

    const result = await importRecipeFromUrl('https://example.com/recipe');
    expect(result.title).toBe('Spaghetti Bolognese');
  });
});
