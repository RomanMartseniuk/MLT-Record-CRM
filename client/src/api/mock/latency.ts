/**
 * Simulated network latency for the mock API.
 *
 * Every mock handler awaits `delay()` before touching the data, so the UI
 * meets the same loading states it will meet with a real server. Without it
 * missing loading/disabled-button handling would only show up after the
 * backend is connected.
 *
 * The delay is configured with the `VITE_MOCK_LATENCY_MS` environment
 * variable (milliseconds). It defaults to 150 ms; `0` disables the delay.
 */

const DEFAULT_LATENCY_MS = 150

/** Reads the configured latency, falling back to the default on bad input. */
function configuredLatencyMs(): number {
  const raw = import.meta.env.VITE_MOCK_LATENCY_MS
  if (raw === undefined || raw === '') return DEFAULT_LATENCY_MS
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LATENCY_MS
}

/** Resolves after the configured latency. */
export function delay(): Promise<void> {
  const ms = configuredLatencyMs()
  if (ms === 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}
