/**
 * Provides the UI state that is not business data: theme, mobile mode and
 * toast notifications. The context type and the `useUi` hook are in
 * ./ui-context.ts.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { UiContext } from './ui-context'
import type { Theme, ToastItem, UiContextValue } from './ui-context'

const THEME_KEY = 'mlt-oblik:theme:v1'

/** The saved theme, or dark by default. */
function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage is blocked: fall through to the default.
  }
  // The palette is designed dark, so without a saved choice we start with the dark theme.
  return 'dark'
}

let toastSeq = 0

export function UiProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => initialTheme())
  const [forceMobile, setForceMobile] = useState(false)
  const [narrow, setNarrow] = useState(() => (typeof window === 'undefined' ? false : window.innerWidth < 768))
  const [toasts, setToasts] = useState<ToastItem[]>([])

  // Apply the theme to the page and remember it.
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Storage is blocked: the theme lives only until the page is reloaded.
    }
  }, [theme])

  // A window narrower than 768px is treated as a phone.
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id))
  }, [])

  /** Shows a toast that disappears by itself after a few seconds. */
  const toast = useCallback((title: string, options?: { description?: string; tone?: ToastItem['tone'] }) => {
    toastSeq += 1
    const id = toastSeq
    setToasts((items) => [...items, { id, title, description: options?.description, tone: options?.tone ?? 'default' }])
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id))
    }, 4500)
  }, [])

  const value = useMemo<UiContextValue>(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
      forceMobile,
      setForceMobile,
      isMobile: forceMobile || narrow,
      isNarrow: narrow,
      showDeviceFrame: forceMobile && !narrow,
      toasts,
      toast,
      dismissToast,
    }),
    [theme, forceMobile, narrow, toasts, toast, dismissToast],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}
