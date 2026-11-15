/**
 * Public entry point of the API layer.
 *
 * Pages and components import everything they need from '@/api' and never
 * from '@/api/mock/*' (enforced by an ESLint rule). To connect a real
 * server, change `active-client.ts`; nothing else in the app changes.
 */

/** The active API client (mock now, HTTP later). */
export { api } from './active-client'

export { ApiProvider } from './hooks/api-provider'
export { queryClient } from './hooks/query-client'
export { ALL_PERMISSIONS, EMPTY_FILTER, ROLE_PERMISSIONS } from './contract/constants'

// Hooks: the way pages read and write data.
export { useDemoUsers, useLogin, useLoginAsDemo, useLogout, useSession } from './hooks/use-session'
export { useResetDemoData, useSettings, useUpdateSettings } from './hooks/use-settings'
export { useReference } from './hooks/use-reference'
export { useCreateUser, useUpdateUser, useUsers } from './hooks/use-users'
export {
  useAdjustStock,
  useCreateProduct,
  useFifoPreview,
  useProduct,
  useStock,
  useStockTotals,
  useUpdateProduct,
} from './hooks/use-warehouse'
export { useCancelPurchase, useCreatePurchase, usePurchase, usePurchases } from './hooks/use-purchases'
export { useAudit } from './hooks/use-audit'
export { useAnalytics, useDashboard } from './hooks/use-reports'
export { useIntegrationStatus, useSync } from './hooks/use-integration'
export { useOrder, useOrders } from './hooks/use-orders'
export { useAddAllocation, useReleaseAllocation, useTransferAllocation } from './hooks/use-allocations'
export {
  useCategories,
  useCreateCategory,
  useCreateSupplier,
  useSuppliers,
  useUpdateCategory,
  useUpdateSupplier,
} from './hooks/use-catalog'

// The contract: entity types, request/response shapes and the client interface.
export type * from './contract/types'
export type * from './contract/dto'
export type * from './contract/client'
export type { ApiResult } from './contract/result'
