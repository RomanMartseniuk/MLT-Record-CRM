/** Small hooks shared by the navigation parts of the app shell. */

import { useSession, useSettings } from '@/api'
import { NAV_ITEMS } from './nav'

/** Navigation entries the signed-in user has the permission for. */
export function useVisibleNav() {
  const { can } = useSession()
  return NAV_ITEMS.filter((item) => !item.permission || can(item.permission))
}

/** Organisation name for the header, empty until settings are loaded. */
export function useOrgName(): string {
  const { data } = useSettings()
  return data?.orgName ?? ''
}
