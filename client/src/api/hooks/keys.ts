/**
 * Query keys of the cache, one place for all of them.
 *
 * A key identifies a cached response. After a write, the hook invalidates
 * the keys the write may have changed, so every view that shows that data
 * refetches it. Keys of one family share their first element, so one
 * invalidation of the family (`['audit']`) covers all its variants.
 */
export const queryKeys = {
  session: ['session'] as const,
  demoUsers: ['demo-users'] as const,
  settings: ['settings'] as const,
  reference: ['reference'] as const,
  users: ['users'] as const,
  categories: ['categories'] as const,
  suppliers: ['suppliers'] as const,
  /** Family: stock list, product cards, FIFO previews and warehouse totals. */
  warehouse: ['warehouse'] as const,
  purchases: ['purchases'] as const,
  orders: ['orders'] as const,
  integration: ['integration'] as const,
  // Derived views that almost every write changes:
  audit: ['audit'] as const,
  dashboard: ['dashboard'] as const,
  analytics: ['analytics'] as const,
}

/** The report-like views that depend on the whole history of operations. */
export const reportKeys = [queryKeys.audit, queryKeys.dashboard, queryKeys.analytics] as const
