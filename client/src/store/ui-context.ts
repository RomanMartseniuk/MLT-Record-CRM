/**
 * The UI context: its type, the context object and the `useUi` hook.
 *
 * Kept apart from the provider component (ui-store.tsx) so that file exports
 * only a component, which the fast-refresh tooling requires.
 */

import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ToastItem {
  id: number
  title: string
  description?: string
  tone: 'default' | 'success' | 'error'
}

export interface UiContextValue {
  theme: Theme
  toggleTheme: () => void
  /** Forced mobile mode, for demos from a laptop. */
  forceMobile: boolean
  setForceMobile: (value: boolean) => void
  isMobile: boolean
  /** The real window is narrow (a phone), as opposed to the forced mode. */
  isNarrow: boolean
  /** Draw the phone frame: forced mode on a wide screen. */
  showDeviceFrame: boolean
  toasts: ToastItem[]
  toast: (title: string, options?: { description?: string; tone?: ToastItem['tone'] }) => void
  dismissToast: (id: number) => void
}

export const UiContext = createContext<UiContextValue | null>(null)

/** The UI state: theme, mobile mode and toasts. Must be used inside `UiProvider`. */
export function useUi(): UiContextValue {
  const context = useContext(UiContext)
  if (!context) throw new Error('useUi must be used inside UiProvider')
  return context
}
