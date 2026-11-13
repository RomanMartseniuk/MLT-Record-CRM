import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

const THEME_KEY = 'mlt-oblik:theme:v1'

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
  /** Примусовий мобільний режим для демонстрації з ноутбука. */
  forceMobile: boolean
  setForceMobile: (value: boolean) => void
  isMobile: boolean
  /** Справжнє вікно вузьке (телефон), а не примусовий режим. */
  isNarrow: boolean
  /** Малювати рамку телефона: примусовий режим на широкому екрані. */
  showDeviceFrame: boolean
  toasts: ToastItem[]
  toast: (title: string, options?: { description?: string; tone?: ToastItem['tone'] }) => void
  dismissToast: (id: number) => void
}

const UiContext = createContext<UiContextValue | null>(null)

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // ignore
  }
  // Палітра задумана темною, тому без збереженого вибору стартуємо з темної теми.
  return 'dark'
}

let toastSeq = 0

export function UiProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => initialTheme())
  const [forceMobile, setForceMobile] = useState(false)
  const [narrow, setNarrow] = useState(() => (typeof window === 'undefined' ? false : window.innerWidth < 768))
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (title: string, options?: { description?: string; tone?: ToastItem['tone'] }) => {
      toastSeq += 1
      const id = toastSeq
      setToasts((items) => [...items, { id, title, description: options?.description, tone: options?.tone ?? 'default' }])
      window.setTimeout(() => {
        setToasts((items) => items.filter((item) => item.id !== id))
      }, 4500)
    },
    [],
  )

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

export function useUi(): UiContextValue {
  const context = useContext(UiContext)
  if (!context) throw new Error('useUi має використовуватись у середині UiProvider')
  return context
}
