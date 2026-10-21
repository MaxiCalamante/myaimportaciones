/** Bound local worker I/O while preserving SDK and caller cancellation. Never retries writes. */
export function boundedWorkerFetch(timeoutMs = 15000, fetcher: typeof fetch = fetch): typeof fetch {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error('Invalid worker request timeout');
  return (input, init) => {
    const signals = [AbortSignal.timeout(timeoutMs)];
    if (init?.signal) signals.push(init.signal);
    if (input instanceof Request) signals.push(input.signal);
    return fetcher(input, { ...init, signal: AbortSignal.any(signals) });
  };
}
