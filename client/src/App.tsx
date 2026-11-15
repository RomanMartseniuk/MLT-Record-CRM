/**
 * Routes of the app and its two guards.
 *
 * - RequireAuth sends signed-out users to /login;
 * - Guard shows "no access" for a page the user lacks the permission for.
 * The server checks permissions again on every request.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { FullPageLoading, NoAccess } from '@/components/common/page'
import { Toaster } from '@/components/ui/toaster'
import { useSession } from '@/api'
import type { Permission } from '@/api'
import { UiProvider } from '@/store/ui-store'

import { LoginPage } from '@/pages/login-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { OrdersPage } from '@/pages/orders-page'
import { OrderDetailPage } from '@/pages/order-detail-page'
import { PurchasesPage } from '@/pages/purchases-page'
import { PurchaseNewPage } from '@/pages/purchase-new-page'
import { PurchaseDetailPage } from '@/pages/purchase-detail-page'
import { InventoryPage } from '@/pages/inventory-page'
import { SuppliersPage } from '@/pages/suppliers-page'
import { CategoriesPage } from '@/pages/categories-page'
import { AnalyticsPage } from '@/pages/analytics-page'
import { AuditPage } from '@/pages/audit-page'
import { UsersPage } from '@/pages/users-page'
import { IntegrationPage } from '@/pages/integration-page'
import { SettingsPage } from '@/pages/settings-page'
import { NotFoundPage } from '@/pages/not-found-page'

/**
 * Lets only signed-in users through to the app shell.
 * While the session is still being loaded nothing is decided yet, so a
 * placeholder is shown instead of flashing the login page.
 */
function RequireAuth() {
  const { session, isLoading } = useSession()
  if (isLoading) return <FullPageLoading />
  if (!session) return <Navigate to="/login" replace />
  return <AppShell />
}

/** Shows the page only to users who have the permission (the server checks it again). */
function Guard({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useSession()
  if (!can(permission)) return <NoAccess />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route
          path="/purchases"
          element={
            <Guard permission="purchases.view">
              <PurchasesPage />
            </Guard>
          }
        />
        <Route
          path="/purchases/new"
          element={
            <Guard permission="purchases.create">
              <PurchaseNewPage />
            </Guard>
          }
        />
        <Route
          path="/purchases/:id"
          element={
            <Guard permission="purchases.view">
              <PurchaseDetailPage />
            </Guard>
          }
        />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/unallocated" element={<Navigate to="/inventory" replace />} />
        <Route
          path="/suppliers"
          element={
            <Guard permission="purchases.view">
              <SuppliersPage />
            </Guard>
          }
        />
        <Route
          path="/categories"
          element={
            <Guard permission="purchases.view">
              <CategoriesPage />
            </Guard>
          }
        />
        <Route
          path="/analytics"
          element={
            <Guard permission="reports.view">
              <AnalyticsPage />
            </Guard>
          }
        />
        <Route
          path="/audit"
          element={
            <Guard permission="reports.view">
              <AuditPage />
            </Guard>
          }
        />
        <Route
          path="/users"
          element={
            <Guard permission="users.manage">
              <UsersPage />
            </Guard>
          }
        />
        <Route
          path="/integration"
          element={
            <Guard permission="settings.manage">
              <IntegrationPage />
            </Guard>
          }
        />
        <Route
          path="/settings"
          element={
            <Guard permission="settings.manage">
              <SettingsPage />
            </Guard>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <UiProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </UiProvider>
  )
}
