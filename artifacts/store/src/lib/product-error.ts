/**
 * The API returns `{ error }` payloads (e.g. 409 when a product is tied to
 * existing orders); prefer that text over the generic "HTTP 409" message.
 */
export function productErrorMessage(err: unknown): string | undefined {
  const data = (err as { data?: unknown } | null)?.data;
  if (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string') {
    return (data as { error: string }).error;
  }
  return err instanceof Error ? err.message : undefined;
}
