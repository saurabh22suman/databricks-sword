/**
 * @file AutoCleanupRunner.tsx
 * @description Tracks auto-cleanup timestamps for Field Ops
 * Note: Actual cleanup is manual via settings page
 */

"use client"

import { useEffect, useState } from "react"
import { useSettings } from "@/lib/settings"

const CLEANUP_CHECK_INTERVAL_MS = 60 * 60 * 1000 // Check once per hour when app is open

/**
 * AutoCleanupRunner - tracks when cleanup was last attempted
 * Shows cleanup opportunity on next visit but actual cleanup is manual
 */
export function AutoCleanupRunner(): React.ReactElement {
  const { settings, updateSetting } = useSettings()
  const [cleanupDue, setCleanupDue] = useState(false)

  useEffect(() => {
    // Skip if auto-cleanup is disabled or never been cleaned
    if (!settings.fieldOpsAutoCleanup || !settings.lastAutoCleanupAt) {
      if (settings.fieldOpsAutoCleanup && !settings.lastAutoCleanupAt) {
        // First time - mark as needing cleanup check
        setCleanupDue(true)
      }
      return
    }

    const lastCleanup = new Date(settings.lastAutoCleanupAt).getTime()
    const now = Date.now()
    const hoursSinceCleanup = (now - lastCleanup) / (1000 * 60 * 60)

    // Show notification if 24h+ since last cleanup
    if (hoursSinceCleanup >= 24) {
      setCleanupDue(true)
      console.log(
        `[AutoCleanup] ${hoursSinceCleanup.toFixed(1)}h since last cleanup - reminder shown`,
      )
    }
  }, [settings.fieldOpsAutoCleanup, settings.lastAutoCleanupAt])

  // On unmount or after showing reminder, update timestamp
  useEffect(() => {
    if (cleanupDue && settings.fieldOpsAutoCleanup) {
      // Just track that we checked - actual cleanup is manual
      updateSetting("lastAutoCleanupAt", new Date().toISOString())
    }
  }, [cleanupDue, settings.fieldOpsAutoCleanup, updateSetting])

  return <></> // Silent - no UI shown
}