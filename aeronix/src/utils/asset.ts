/** Resolve a file in /public against the configured base URL (works for root and relative builds). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
