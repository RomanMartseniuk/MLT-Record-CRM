/**
 * Result of a write operation.
 *
 * A business rule violation (not enough stock, a reason is missing, the
 * purchase cannot be cancelled) is NOT an exception: it comes back as
 * `{ ok: false, error }` with a message that is ready to show to the user.
 * A real HTTP client maps a 4xx response with a message to the same shape,
 * so pages handle errors identically for the mock and for the real server.
 */
export type ApiResult<T = void> = { ok: true; value: T } | { ok: false; error: string }
