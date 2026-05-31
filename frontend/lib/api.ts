// P9 — `lib/api.ts` is a re-export barrel. Domain Apis live in `lib/api/*`.
// Single source of truth lives in `lib/api/core.ts` (axios instance, auth
// callbacks, error classifier). Each domain file imports `apiClient` from
// `./api/core` only — there are no cross-domain imports.

export * from './api/core';
export * from './api/recipe';
export * from './api/meal';
export * from './api/user';
export * from './api/search';
export * from './api/shopping';
export * from './api/today';
export * from './api/food';
export * from './api/plate';
export * from './api/coach';
export * from './api/feedback';
