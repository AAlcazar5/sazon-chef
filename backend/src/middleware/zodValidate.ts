// backend/src/middleware/zodValidate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Generic Zod validation middleware factory.
 * Validates req.body against the provided schema and returns 400 on failure.
 *
 * Usage:
 *   router.post('/recipes', zodValidate(createRecipeSchema), recipeController.create)
 */
export function zodValidate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Zod v4: error.message is an array of issue objects
      const rawIssues: unknown = result.error.message;
      const issues = Array.isArray(rawIssues) ? rawIssues : [];
      const details = issues.map((issue: any) => ({
        field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? ''),
        message: issue.message ?? 'Invalid value',
      }));
      res.status(400).json({ error: 'Validation failed', details });
      return;
    }
    req.body = result.data;
    next();
  };
}
