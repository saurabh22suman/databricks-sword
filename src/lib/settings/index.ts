/**
 * Settings module — user preferences stored in localStorage.
 *
 * @example
 * ```tsx
 * import { useSettings, DEFAULT_SETTINGS } from "@/lib/settings"
 * const { settings, updateSetting } = useSettings()
 * ```
 */
export { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "./types"
export type { UserSettings } from "./types"
export { getSettingValue, useSettings } from "./useSettings"

