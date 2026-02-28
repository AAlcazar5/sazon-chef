// backend/src/services/recipeImportService.ts
// Imports a recipe from a URL using JSON-LD structured data (primary) or Claude Haiku (fallback)

import Anthropic from '@anthropic-ai/sdk';

export interface ImportedRecipe {
  title: string;
  description: string;
  cookTime: number;
  servings: number;
  cuisine: string;
  mealType: string | null;
  ingredients: string[];
  instructions: string[];
  imageUrl: string | null;
  sourceUrl: string;
  sourceName: string;
}

export class RecipeImportError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_URL' | 'FETCH_FAILED' | 'PARSE_FAILED' | 'EXTRACTION_FAILED'
  ) {
    super(message);
    this.name = 'RecipeImportError';
  }
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return 'Unknown Source';
  }
}

function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new RecipeImportError('Invalid URL format', 'INVALID_URL');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new RecipeImportError('Only HTTP/HTTPS URLs are supported', 'INVALID_URL');
  }

  // Block private/internal IPs and localhost
  const hostname = parsed.hostname;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname === '0.0.0.0' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) // Block raw IPs
  ) {
    throw new RecipeImportError('Private or internal URLs are not allowed', 'INVALID_URL');
  }
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SazonChef/1.0; recipe-importer)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new RecipeImportError(
        `Failed to fetch URL: HTTP ${response.status}`,
        'FETCH_FAILED'
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('html') && !contentType.includes('text')) {
      throw new RecipeImportError('URL does not point to an HTML page', 'FETCH_FAILED');
    }

    return await response.text();
  } catch (error: any) {
    if (error instanceof RecipeImportError) throw error;
    if (error.name === 'AbortError') {
      throw new RecipeImportError('Request timed out after 10 seconds', 'FETCH_FAILED');
    }
    throw new RecipeImportError(`Network error: ${error.message}`, 'FETCH_FAILED');
  }
}

function tryExtractJsonLd(html: string): ImportedRecipe | null {
  // Find all JSON-LD script tags
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of jsonLdMatches) {
    try {
      const raw = match[1].trim();
      const data = JSON.parse(raw);

      // Handle @graph arrays (common in schema.org)
      const candidates: any[] = Array.isArray(data['@graph'])
        ? data['@graph']
        : Array.isArray(data)
        ? data
        : [data];

      for (const item of candidates) {
        const type = item['@type'];
        const isRecipe =
          type === 'Recipe' ||
          (Array.isArray(type) && type.includes('Recipe'));

        if (!isRecipe) continue;

        const ingredients: string[] = Array.isArray(item.recipeIngredient)
          ? item.recipeIngredient.map((i: any) => String(i)).filter(Boolean)
          : [];

        const instructions: string[] = [];
        if (Array.isArray(item.recipeInstructions)) {
          for (const inst of item.recipeInstructions) {
            if (typeof inst === 'string') {
              instructions.push(inst);
            } else if (inst['@type'] === 'HowToStep') {
              instructions.push(String(inst.text || inst.name || ''));
            } else if (inst['@type'] === 'HowToSection' && Array.isArray(inst.itemListElement)) {
              for (const step of inst.itemListElement) {
                if (step['@type'] === 'HowToStep') {
                  instructions.push(String(step.text || step.name || ''));
                }
              }
            }
          }
        } else if (typeof item.recipeInstructions === 'string') {
          // Some sites put instructions as a single string; split on numbered patterns
          instructions.push(...item.recipeInstructions.split(/\n+/).filter((s: string) => s.trim()));
        }

        if (!item.name || ingredients.length === 0 || instructions.length === 0) continue;

        // Parse cook time (ISO 8601 duration: PT25M, PT1H30M)
        const cookTime = parseDuration(item.cookTime || item.totalTime || item.prepTime || '');

        // Parse servings
        const yield_ = item.recipeYield;
        let servings = 4;
        if (typeof yield_ === 'number') servings = yield_;
        else if (typeof yield_ === 'string') {
          const match = yield_.match(/(\d+)/);
          if (match) servings = parseInt(match[1], 10);
        } else if (Array.isArray(yield_) && yield_.length > 0) {
          const match = String(yield_[0]).match(/(\d+)/);
          if (match) servings = parseInt(match[1], 10);
        }

        // Extract image
        let imageUrl: string | null = null;
        if (item.image) {
          if (typeof item.image === 'string') imageUrl = item.image;
          else if (Array.isArray(item.image)) imageUrl = typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url || null;
          else if (item.image.url) imageUrl = item.image.url;
        }

        return {
          title: String(item.name).trim(),
          description: String(item.description || '').trim(),
          cookTime,
          servings: Math.max(1, servings),
          cuisine: Array.isArray(item.recipeCuisine)
            ? item.recipeCuisine[0] || 'General'
            : String(item.recipeCuisine || 'General'),
          mealType: Array.isArray(item.recipeCategory)
            ? item.recipeCategory[0] || null
            : String(item.recipeCategory || '') || null,
          ingredients,
          instructions: instructions.filter(Boolean),
          imageUrl,
          sourceUrl: '',
          sourceName: '',
        };
      }
    } catch {
      // Malformed JSON-LD — skip and try next block
    }
  }

  return null;
}

function parseDuration(iso: string): number {
  if (!iso) return 30;
  // ISO 8601: PT25M, PT1H30M, P0DT25M
  const hours = iso.match(/(\d+)H/i);
  const minutes = iso.match(/(\d+)M/i);
  const h = hours ? parseInt(hours[1], 10) : 0;
  const m = minutes ? parseInt(minutes[1], 10) : 0;
  const total = h * 60 + m;
  return total > 0 ? total : 30;
}

function cleanHtmlForAi(html: string): string {
  // Strip script, style, nav, footer, header, aside blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')   // Strip remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, '\n\n')  // Collapse whitespace
    .trim();

  // Limit to first ~8000 chars (enough context for AI, within token budget)
  return text.substring(0, 8000);
}

async function extractWithAi(url: string, pageText: string): Promise<ImportedRecipe> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new RecipeImportError('AI extraction unavailable: missing API key', 'EXTRACTION_FAILED');
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = `Extract the recipe from this webpage text. Return ONLY valid JSON with this exact structure:

{
  "title": "Recipe name",
  "description": "Brief 1-2 sentence description",
  "cookTime": 30,
  "servings": 4,
  "cuisine": "Italian",
  "mealType": "dinner",
  "ingredients": ["1 cup flour", "2 eggs"],
  "instructions": ["Mix flour and eggs", "Bake at 350F for 25 minutes"],
  "imageUrl": null
}

Rules:
- cookTime: total minutes (number), default 30 if unknown
- servings: number, default 4 if unknown
- cuisine: single string (e.g. "Italian", "Mexican", "General")
- mealType: "breakfast", "lunch", "dinner", "snack", "dessert" or null
- ingredients: array of strings, each with quantity + unit + name
- instructions: array of strings, one step per string
- imageUrl: string URL if found in page, otherwise null
- If this is not a recipe page, return {"error": "not_a_recipe"}

Webpage text:
${pageText}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new RecipeImportError('Unexpected AI response format', 'EXTRACTION_FAILED');
    }

    // Extract JSON from response
    const text = content.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new RecipeImportError('AI did not return valid JSON', 'EXTRACTION_FAILED');
    }

    const data = JSON.parse(jsonMatch[0]);

    if (data.error === 'not_a_recipe') {
      throw new RecipeImportError('This URL does not appear to be a recipe page', 'PARSE_FAILED');
    }

    if (!data.title || !Array.isArray(data.ingredients) || !Array.isArray(data.instructions)) {
      throw new RecipeImportError('AI extracted incomplete recipe data', 'EXTRACTION_FAILED');
    }

    return {
      title: String(data.title).trim(),
      description: String(data.description || '').trim(),
      cookTime: Math.max(1, Number(data.cookTime) || 30),
      servings: Math.max(1, Number(data.servings) || 4),
      cuisine: String(data.cuisine || 'General'),
      mealType: data.mealType || null,
      ingredients: data.ingredients.filter(Boolean).map(String),
      instructions: data.instructions.filter(Boolean).map(String),
      imageUrl: data.imageUrl || null,
      sourceUrl: '',
      sourceName: '',
    };
  } catch (error: any) {
    if (error instanceof RecipeImportError) throw error;
    throw new RecipeImportError(`AI extraction failed: ${error.message}`, 'EXTRACTION_FAILED');
  }
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  console.log('🔗 Importing recipe from URL:', url);

  // 1. Validate URL
  validateUrl(url);

  // 2. Fetch HTML
  const html = await fetchHtml(url);
  console.log('✅ Fetched HTML, size:', html.length, 'chars');

  // 3. Try JSON-LD extraction first
  const jsonLdResult = tryExtractJsonLd(html);
  if (jsonLdResult) {
    console.log('✅ Extracted recipe via JSON-LD:', jsonLdResult.title);
    jsonLdResult.sourceUrl = url;
    jsonLdResult.sourceName = extractSourceName(url);
    return jsonLdResult;
  }

  // 4. Fallback: AI extraction
  console.log('⚠️ JSON-LD not found, falling back to AI extraction...');
  const pageText = cleanHtmlForAi(html);
  const aiResult = await extractWithAi(url, pageText);
  aiResult.sourceUrl = url;
  aiResult.sourceName = extractSourceName(url);
  console.log('✅ Extracted recipe via AI:', aiResult.title);

  return aiResult;
}
