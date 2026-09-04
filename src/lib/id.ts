export function uid(prefix = ''): string {
  const c = globalThis.crypto as Crypto | undefined;
  const base =
    c && 'randomUUID' in c
      ? c.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${base}` : base;
}
