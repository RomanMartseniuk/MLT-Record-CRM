import { useCallback, useRef, useState } from 'react'

/**
 * Protects a write action from being started twice.
 *
 * A fast double click, or Enter pressed twice, fires the handler again before
 * the first request has finished. For a write (create a purchase, add an
 * allocation) that would duplicate the record. The mock API answers after
 * a short delay, so this really happens; a real server has the same latency.
 *
 * `run(task)` starts the task unless one is already running; a repeated
 * call while it runs is ignored (returns `undefined`). The guard is a ref, so
 * it works instantly, without waiting for a re-render. Do NOT rely on the
 * mutation's own `isPending` for this: it updates asynchronously, so the
 * second click can slip through.
 *
 * `pending` is a normal state for disabling buttons and showing progress.
 */
export function useSingleFlight() {
  const running = useRef(false)
  const [pending, setPending] = useState(false)

  const run = useCallback(async <R,>(task: () => Promise<R>): Promise<R | undefined> => {
    if (running.current) return undefined
    running.current = true
    setPending(true)
    try {
      return await task()
    } finally {
      running.current = false
      setPending(false)
    }
  }, [])

  return { run, pending }
}
