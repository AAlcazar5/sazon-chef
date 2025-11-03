// Anthropic Claude Provider Implementation
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, RecipeGenerationRequest, AIProviderError } from './AIProvider';
import type { GeneratedRecipe } from '../aiRecipeService';

export class ClaudeProvider extends AIProvider {
  private anthropic: Anthropic | null = null;

  constructor() {
    super('Claude (Anthropic)');
    if (this.isConfigured) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  checkConfiguration(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async generateRecipe(request: RecipeGenerationRequest): Promise<GeneratedRecipe> {
    if (!this.anthropic) {
      throw new Error('Claude is not configured');
    }

    try {
      // Claude temperature range is 0-1, clamp it
      const claudeTemperature = Math.max(0, Math.min(1, request.temperature || 1.1));
      
      // Use Claude 3 Haiku (the only model available for this account)
      const message = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: request.maxTokens || 4000,
        temperature: claudeTemperature,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Claude');
      }

      // Claude returns text, we need to extract and clean JSON from it
      const text = content.text;
      let recipe: GeneratedRecipe;

      try {
        // Try multiple JSON extraction strategies
        recipe = this.extractAndParseJSON(text);
      } catch (parseError: any) {
        console.error('❌ [Claude] JSON parsing failed:', parseError.message);
        console.error('📄 [Claude] Full raw response length:', text.length);
        console.error('📄 [Claude] Raw response (first 1000 chars):', text.substring(0, 1000));
        console.error('📄 [Claude] Raw response (last 500 chars):', text.substring(Math.max(0, text.length - 500)));
        // Save full response for debugging
        console.error('📄 [Claude] Full response saved to error log above');
        throw new Error(`Failed to parse Claude response as JSON: ${parseError.message}`);
      }

      console.log(`✅ [Claude] Recipe generated: ${recipe.title}`);
      return recipe;
    } catch (error: any) {
      throw this.normalizeError(error, 'generateRecipe');
    }
  }

  /**
   * Extract and parse JSON from Claude's response
   * Claude sometimes wraps JSON in markdown or adds extra text
   */
  private extractAndParseJSON(text: string): GeneratedRecipe {
    // Strategy 1: Try parsing directly
    try {
      return JSON.parse(text.trim()) as GeneratedRecipe;
    } catch (e1) {
      // Strategy 2: Extract from markdown code blocks (with multiline support)
      const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          const cleaned = this.cleanJSON(codeBlockMatch[1]);
          return JSON.parse(cleaned) as GeneratedRecipe;
        } catch (e2) {
          // Continue to next strategy
        }
      }

      // Strategy 3: Find first { to last } and try to parse
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = text.substring(firstBrace, lastBrace + 1);
        try {
          // Clean up common JSON issues
          const cleaned = this.cleanJSON(jsonCandidate);
          return JSON.parse(cleaned) as GeneratedRecipe;
        } catch (e3) {
          // Try with more aggressive cleaning
          try {
            const aggressivelyCleaned = this.cleanJSONAggressively(jsonCandidate);
            return JSON.parse(aggressivelyCleaned) as GeneratedRecipe;
          } catch (e4) {
            // Continue to final error
          }
        }
      }

      // Strategy 4: Try to find JSON object with balanced braces
      const balancedMatch = this.findBalancedJSON(text);
      if (balancedMatch) {
        try {
          const cleaned = this.cleanJSON(balancedMatch);
          return JSON.parse(cleaned) as GeneratedRecipe;
        } catch (e5) {
          // Final attempt with aggressive cleaning
          try {
            const aggressivelyCleaned = this.cleanJSONAggressively(balancedMatch);
            return JSON.parse(aggressivelyCleaned) as GeneratedRecipe;
          } catch (e6) {
            // All attempts failed
          }
        }
      }

      // All strategies failed
      throw new Error('Could not extract valid JSON from response');
    }
  }

  /**
   * Find JSON object with properly balanced braces
   */
  private findBalancedJSON(text: string): string | null {
    let braceCount = 0;
    let startIdx = -1;
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (braceCount === 0) startIdx = i;
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIdx !== -1) {
          return text.substring(startIdx, i + 1);
        }
      }
    }
    
    return null;
  }

  /**
   * Clean up common JSON formatting issues from AI responses
   */
  private cleanJSON(jsonStr: string): string {
    let cleaned = jsonStr.trim();

    // FIX FRACTIONS: Convert fractions like 1/2, 1/4, 3/4 to decimals
    cleaned = cleaned.replace(/:\s*(\d+)\/(\d+)/g, (match, num, denom) => {
      const decimal = parseFloat(num) / parseFloat(denom);
      return `: ${decimal}`;
    });

    // Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // Remove comments (// and /* */)
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

    // Fix single quotes to double quotes for keys only
    cleaned = cleaned.replace(/'([^']+)':/g, '"$1":');

    return cleaned;
  }

  /**
   * More aggressive JSON cleaning for problematic responses
   */
  private cleanJSONAggressively(jsonStr: string): string {
    let cleaned = jsonStr.trim();

    // Remove all leading/trailing whitespace
    cleaned = cleaned.trim();

    // Remove any text before first {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) {
      cleaned = cleaned.substring(firstBrace);
    }

    // Remove any text after last }
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }

    // FIX FRACTIONS: Convert fractions like 1/2, 1/4, 3/4 to decimals
    cleaned = cleaned.replace(/:\s*(\d+)\/(\d+)/g, (match, num, denom) => {
      const decimal = parseFloat(num) / parseFloat(denom);
      return `: ${decimal}`;
    });

    // Remove trailing commas (more comprehensive)
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    cleaned = cleaned.replace(/,(\s*$)/gm, '');

    // Remove comments
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

    // Fix common escape issues
    cleaned = cleaned.replace(/\\'/g, "'");
    cleaned = cleaned.replace(/\\"/g, '"');

    // Fix single quotes in keys (more aggressive)
    cleaned = cleaned.replace(/'([^']+)':\s*/g, '"$1": ');
    cleaned = cleaned.replace(/'([^']+)':/g, '"$1":');

    // Try to fix unclosed strings (add closing quote if missing before comma/brace)
    cleaned = cleaned.replace(/:\s*"([^"]*?)([,}\]])\s*/g, (match, content, closer) => {
      // If content doesn't end with quote and closer is not part of string, might be missing quote
      return `: "${content}"${closer}`;
    });

    return cleaned;
  }
}

