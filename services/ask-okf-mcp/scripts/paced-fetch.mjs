/** Verification-only pacing; no retry, response transformation or request logging. */
export function createPacedFetch(fetchImpl = fetch, {
  interval_ms = 750,
  now = () => performance.now(),
  sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
} = {}) {
  if (!Number.isSafeInteger(interval_ms) || interval_ms < 750 || interval_ms > 60000) {
    throw new Error('Verification pacing must be an integer from 750 to 60000 ms.');
  }
  let gate = Promise.resolve();
  let previousStart = null;
  const receipt = { interval_ms, request_count: 0, minimum_observed_interval_ms: null,
    automatic_retries: 0, network_failures: 0, response_status_counts: {} };
  async function pacedFetch(...args) {
    const admitted = gate.then(async () => {
      if (previousStart !== null) {
        let remaining = interval_ms - (now() - previousStart);
        while (remaining > 0) {
          await sleep(remaining);
          remaining = interval_ms - (now() - previousStart);
        }
      }
      const start = now();
      if (previousStart !== null) {
        const elapsed = start - previousStart;
        receipt.minimum_observed_interval_ms = receipt.minimum_observed_interval_ms === null
          ? elapsed : Math.min(receipt.minimum_observed_interval_ms, elapsed);
      }
      previousStart = start;
      receipt.request_count++;
    });
    gate = admitted.catch(() => {});
    await admitted;
    try {
      const response = await fetchImpl(...args);
      const status = String(response.status);
      receipt.response_status_counts[status] = (receipt.response_status_counts[status] ?? 0) + 1;
      return response;
    } catch (error) {
      receipt.network_failures++;
      throw error;
    }
  }
  return { fetch: pacedFetch, receipt };
}
