/** Forward a same-origin browser request as a same-origin request to the API.
 * Keep foreign Origins intact so the backend still rejects cross-site callers.
 */
export function apiProxyOrigin(origin: string | undefined, host: string | undefined, target: string): string | undefined {
  if (!origin || !host) return origin;
  try {
    const source = new URL(origin);
    if (source.origin !== origin || !['http:', 'https:'].includes(source.protocol) || source.host !== host.toLowerCase()) return origin;
    return new URL(target).origin;
  } catch { return origin; }
}
