// Tier P P8 — bounded defaults for list endpoints. Unpaginated branches
// use MAX_UNPAGINATED_LIST_SIZE as a hard ceiling so any user-facing
// findMany cannot run unbounded against the recipe / saved / feedback
// tables. Frontends use the paginated path (`?page=N&limit=L`) for
// real lists; this is the safety net for legacy callers.

export const MAX_UNPAGINATED_LIST_SIZE = 500;
