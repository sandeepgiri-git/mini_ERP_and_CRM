// Helper to safely cast query param to string
export function qs(param: unknown): string | undefined {
  if (typeof param === 'string') return param || undefined;
  if (Array.isArray(param)) return param[0] || undefined;
  return undefined;
}
