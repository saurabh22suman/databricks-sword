"use client"

import { useSyncNow } from "@/components/auth"
import { SyncProgressDialog } from "@/components/auth/SyncProgressDialog"
import { ConnectionForm, ConnectionStatus } from "@/components/databricks"
import { DeploymentManager } from "@/components/deployments/DeploymentManager"
import { RankBadge } from "@/components/gamification/RankBadge"
import { getRankForXp } from "@/lib/gamification"
import type { SandboxData } from "@/lib/sandbox"
import { loadSandbox, saveSandbox, updateSandbox } from "@/lib/sandbox"
import { useDisconnect } from "@/lib/sandbox/useDisconnect"
import { SETTINGS_STORAGE_KEY, useSettings } from "@/lib/settings"
import { resetOnboarding } from "@/lib/onboarding/state"
import { ReducedMotionToggle } from "@/components/settings/ReducedMotionToggle"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  Database,
  Download,
  Eye,
  EyeOff,
  HardDrive,
  Monitor,
  Music,
  Shield,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"

/**
 * Settings page — account, preferences, data management.
 */
export default function SettingsPage(): React.ReactElement {
  const { data: session } = useSession()
  const { settings, updateSetting, resetSettings } = useSettings()
  const { disconnect, isSyncing } = useDisconnect()
  const { syncNow } = useSyncNow()
  const [sandbox, setSandbox] = useState<SandboxData | null>(null)
  const [showDangerConfirm, setShowDangerConfirm] = useState(false)
  const [exportMsg, setExportMsg] = useState("")
  const [databricksUrl, setDatabricksUrl] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [isRedeemingCoupon, setIsRedeemingCoupon] = useState(false)
  const [couponStatus, setCouponStatus] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true)
  const [isUpdatingLeaderboardOptIn, setIsUpdatingLeaderboardOptIn] =
    useState(false)
  const [leaderboardStatus, setLeaderboardStatus] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [isBulkCleaningAssets, setIsBulkCleaningAssets] = useState(false)
  const [bulkCleanupStatus, setBulkCleanupStatus] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  useEffect(() => {
    setSandbox(loadSandbox())
  }, [])

  // Fetch existing Databricks connection on mount
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchConnection = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/databricks/status`)
        const data = await response.json()

        if (response.ok && data.connected && data.workspaceUrl) {
          setDatabricksUrl(data.workspaceUrl)
          setConnectionError(null)
        } else if (!response.ok) {
          setConnectionError(data.error || "Failed to fetch connection")
        }
      } catch (err) {
        setConnectionError(err instanceof Error ? err.message : "Connection failed")
      }
    }

    fetchConnection()
  }, [session?.user?.id])

  const totalXp = sandbox?.userStats.totalXp ?? 0
  const rank = getRankForXp(totalXp)

  useEffect(() => {
    if (!session?.user?.id) return

    const loadProfilePreferences = async (): Promise<void> => {
      try {
        const response = await fetch("/api/user/profile")
        if (!response.ok) return

        const data = await response.json()
        if (data && typeof data.leaderboardOptIn === "boolean") {
          setLeaderboardOptIn(data.leaderboardOptIn)
        }
      } catch {
        // Ignore errors and keep default
      }
    }

    void loadProfilePreferences()
  }, [session?.user?.id])

  const handleLeaderboardOptInChange = useCallback(
    async (nextValue: boolean): Promise<void> => {
      if (!session?.user?.id || isUpdatingLeaderboardOptIn) return

      const previousValue = leaderboardOptIn
      setLeaderboardOptIn(nextValue)
      setIsUpdatingLeaderboardOptIn(true)
      setLeaderboardStatus(null)

      try {
        const response = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leaderboardOptIn: nextValue }),
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          setLeaderboardOptIn(previousValue)
          setLeaderboardStatus({
            type: "error",
            message: payload?.error ?? "Unable to update leaderboard setting.",
          })
          return
        }

        const persistedValue =
          typeof payload?.leaderboardOptIn === "boolean"
            ? payload.leaderboardOptIn
            : nextValue

        setLeaderboardOptIn(persistedValue)
        setLeaderboardStatus({
          type: "success",
          message: "Leaderboard setting updated.",
        })
      } catch {
        setLeaderboardOptIn(previousValue)
        setLeaderboardStatus({
          type: "error",
          message: "Unable to update leaderboard setting.",
        })
      } finally {
        setIsUpdatingLeaderboardOptIn(false)
      }
    },
    [isUpdatingLeaderboardOptIn, leaderboardOptIn, session?.user?.id],
  )

  const handleRedeemCoupon = useCallback(async (): Promise<void> => {
    const normalizedCode = couponCode.trim().toUpperCase()
    if (!normalizedCode) {
      setCouponStatus({ type: "error", message: "Enter a coupon code." })
      return
    }

    setIsRedeemingCoupon(true)
    setCouponStatus(null)

    try {
      const response = await fetch("/api/user/coupon/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode }),
      })

      const payload = await response.json().catch(() => null)

      if (response.status === 401) {
        setCouponStatus({
          type: "error",
          message: "Sign in required to redeem coupons.",
        })
        return
      }

      if (payload?.reason === "invalid_code") {
        setCouponStatus({ type: "error", message: "Invalid coupon code." })
        return
      }

      if (!response.ok) {
        setCouponStatus({
          type: "error",
          message: payload?.error ?? "Unable to redeem coupon.",
        })
        return
      }

      if (
        payload?.applied === false &&
        payload?.reason === "already_redeemed"
      ) {
        setCouponStatus({ type: "error", message: "Coupon already redeemed." })
        return
      }

      if (payload?.applied && typeof payload?.xpAwarded === "number") {
        const code = normalizedCode
        const xpAwarded = payload.xpAwarded
        const redeemedAt = new Date().toISOString()
        updateSandbox((data) => ({
          ...data,
          userStats: {
            ...data.userStats,
            totalXp: data.userStats.totalXp + xpAwarded,
          },
          redeemedCoupons: [
            ...(data.redeemedCoupons ?? []),
            { code, xp: xpAwarded, redeemedAt },
          ],
        }))

        const refreshedSandbox = loadSandbox()
        setSandbox(refreshedSandbox)
        setCouponCode("")

        const syncSuccess = await syncNow()
        if (!syncSuccess) {
          setCouponStatus({
            type: "error",
            message:
              "Coupon applied but sync failed. Your XP will sync when you next visit the site.",
          })
          return
        }

        setCouponStatus({
          type: "success",
          message: `Coupon applied! +${payload.xpAwarded.toLocaleString()} XP`,
        })
        return
      }

      setCouponStatus({ type: "error", message: "Unable to redeem coupon." })
    } catch {
      setCouponStatus({ type: "error", message: "Unable to redeem coupon." })
    } finally {
      setIsRedeemingCoupon(false)
    }
  }, [couponCode, syncNow])

  const handleBulkCleanupAssets = useCallback(async (): Promise<void> => {
    const idempotencyKey = crypto.randomUUID()
    const requestId = crypto.randomUUID()
    const correlationId = requestId
    if (isBulkCleaningAssets) {
      return
    }

    const confirmed = window.confirm(
      "Clean up all Field Ops Databricks assets for your deployments? This cannot be undone.",
    )

    if (!confirmed) {
      return
    }

    setIsBulkCleaningAssets(true)
    setBulkCleanupStatus(null)

    try {
      const response = await fetch("/api/field-ops/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          "X-Request-Id": requestId,
          "X-Correlation-Id": correlationId,
        },
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 409 && payload?.failed) {
          setBulkCleanupStatus({
            type: "error",
            message: `Cleanup completed with ${payload.failed} failure${payload.failed === 1 ? "" : "s"}.`,
          })
          return
        }

        setBulkCleanupStatus({
          type: "error",
          message: payload?.error ?? "Unable to clean up assets.",
        })
        return
      }

      if (typeof payload?.cleaned === "number") {
        setBulkCleanupStatus({
          type: "success",
          message: `Cleanup finished. ${payload.cleaned} deployment${payload.cleaned === 1 ? "" : "s"} cleaned.`,
        })
        return
      }

      setBulkCleanupStatus({
        type: "success",
        message: payload?.message ?? "Cleanup finished.",
      })
    } catch {
      setBulkCleanupStatus({
        type: "error",
        message: "Unable to clean up assets.",
      })
    } finally {
      setIsBulkCleaningAssets(false)
    }
  }, [isBulkCleaningAssets])

  /**
   * Export progress as JSON file.
   */
  const handleExport = useCallback((): void => {
    const data = loadSandbox()
    if (!data) {
      setExportMsg("No progress data to export.")
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `databricks-sword-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg("Progress exported!")
    setTimeout(() => setExportMsg(""), 3000)
  }, [])

  /**
   * Import progress from JSON file.
   */
  const handleImport = useCallback((): void => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as SandboxData
          saveSandbox(data)
          setSandbox(data)
          setExportMsg("Progress imported successfully!")
          setTimeout(() => setExportMsg(""), 3000)
        } catch {
          setExportMsg("Invalid file format.")
          setTimeout(() => setExportMsg(""), 3000)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  /**
   * Reset all local progress.
   */
  const handleReset = useCallback((): void => {
    localStorage.removeItem("dbsword-sandbox")
    resetSettings()
    setSandbox(null)
    setShowDangerConfirm(false)
    setExportMsg("All local data cleared.")
    setTimeout(() => setExportMsg(""), 3000)
  }, [resetSettings])

  const storageUsed = (() => {
    if (typeof window === "undefined") return "0"
    try {
      const sandboxStr = localStorage.getItem("dbsword-sandbox") ?? ""
      const settingsStr = localStorage.getItem(SETTINGS_STORAGE_KEY) ?? ""
      const bytes = new Blob([sandboxStr, settingsStr]).size
      return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
    } catch {
      return "N/A"
    }
  })()

  return (
    <div className="bg-anime-950 cyber-grid min-h-screen pt-20">
      <div className="grain-overlay pointer-events-none fixed inset-0" />

      <div className="relative z-10 container mx-auto max-w-3xl px-4 py-16">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <div className="border-anime-700 text-anime-cyan mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs tracking-widest uppercase">
            <Monitor className="h-3 w-3" />
            System Config
          </div>
          <h1 className="font-heading text-anime-100 mb-3 text-5xl font-black">
            <span className="text-anime-cyan">SETTINGS</span>
          </h1>
          <p className="text-anime-400 text-lg">
            Configure your training environment.
          </p>
        </div>

        {/* Account Section */}
        <section className="mb-8">
          <SectionHeader
            label="Account"
            icon={<Shield className="h-4 w-4" />}
          />
          <div className="bg-anime-900 border-anime-700 cut-corner rounded-lg border p-6">
            {session?.user ? (
              <div className="flex items-center gap-4">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="border-anime-cyan h-14 w-14 rounded-full border-2"
                  />
                ) : (
                  <div className="bg-anime-800 border-anime-cyan flex h-14 w-14 items-center justify-center rounded-full border-2">
                    <Shield className="text-anime-cyan h-6 w-6" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-anime-100 text-lg font-bold">
                    {session.user.name ?? "Agent"}
                  </div>
                  <div className="text-anime-400 font-mono text-sm">
                    {session.user.email ?? "No email"}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <RankBadge rank={rank} size={16} />
                    <span className="text-anime-cyan text-xs font-bold">
                      {rank.title}
                    </span>
                    <span className="text-anime-400 text-xs">
                      — {totalXp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => void disconnect()}
                  disabled={isSyncing}
                  className="bg-anime-accent/20 border-anime-accent text-anime-accent hover:bg-anime-accent/30 rounded-lg border px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sign out account
                </button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-anime-400 mb-2">
                  Not signed in. Progress is stored locally.
                </p>
                <p className="text-anime-700 font-mono text-xs">
                  Sign in from the header to enable cross-device sync.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-8">
          <SectionHeader
            label="Preferences"
            icon={<Zap className="h-4 w-4" />}
          />
          <div className="bg-anime-900 border-anime-700 divide-anime-700 cut-corner divide-y overflow-hidden rounded-lg border">
            <ToggleRow
              icon={
                settings.sfxEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )
              }
              label="Sound Effects"
              description="XP gain, achievement unlock sounds"
              enabled={settings.sfxEnabled}
              onChange={(v) => updateSetting("sfxEnabled", v)}
            />
            <ToggleRow
              icon={<Music className="h-4 w-4" />}
              label="Background Music"
              description="Ambient cyberpunk soundtrack"
              enabled={settings.musicEnabled}
              onChange={(v) => updateSetting("musicEnabled", v)}
            />
            {settings.musicEnabled && (
              <div className="bg-anime-950/30 flex items-center gap-4 px-6 py-4">
                <div className="text-anime-cyan">
                  <Volume2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-anime-100 text-sm font-bold">
                    Music Volume
                  </div>
                  <div className="text-anime-400 text-xs">
                    Adjust ambient music level
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="text-anime-500 h-3 w-3" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={settings.musicVolume}
                    onChange={(e) =>
                      updateSetting("musicVolume", Number(e.target.value))
                    }
                    className="accent-anime-cyan w-28"
                  />
                  <Volume2 className="text-anime-500 h-3 w-3" />
                  <span className="text-anime-cyan w-8 text-right font-mono text-sm">
                    {settings.musicVolume}
                  </span>
                </div>
              </div>
            )}
            <ToggleRow
              icon={<Zap className="h-4 w-4" />}
              label="Animations"
              description="Glitch, scan-line, and hologram effects"
              enabled={settings.animationsEnabled}
              onChange={(v) => updateSetting("animationsEnabled", v)}
            />

            {/* Reduced motion override (system / reduce / full motion) */}
            <div className="px-6 py-4">
              <ReducedMotionToggle />
            </div>

            {/* Replay onboarding tour */}
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="text-anime-cyan">
                <Monitor className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-anime-100 text-sm font-bold">
                  Onboarding Tour
                </div>
                <div className="text-anime-400 text-xs">
                  Replay the 4-step new-operator walkthrough
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetOnboarding()
                  window.location.href = "/onboarding"
                }}
                className="bg-anime-800 border-anime-700 text-anime-cyan hover:border-anime-cyan/50 rounded-lg border px-4 py-2 text-sm font-bold transition-all"
              >
                Replay tour
              </button>
            </div>
            <ToggleRow
              icon={
                settings.showHints ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )
              }
              label="Show Hints"
              description="Display hint buttons in challenges"
              enabled={settings.showHints}
              onChange={(v) => updateSetting("showHints", v)}
            />
            {session?.user && (
              <>
                <ToggleRow
                  icon={<Shield className="h-4 w-4" />}
                  label="Participate in Leaderboard"
                  description="Show your profile on the global leaderboard"
                  enabled={leaderboardOptIn}
                  onChange={(v) => {
                    void handleLeaderboardOptInChange(v)
                  }}
                  disabled={isUpdatingLeaderboardOptIn}
                />
                {leaderboardStatus && (
                  <div
                    className={`px-6 py-2 text-xs ${leaderboardStatus.type === "success" ? "text-anime-green" : "text-anime-accent"}`}
                  >
                    {leaderboardStatus.message}
                  </div>
                )}
              </>
            )}

            {/* Font Size Slider */}
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="text-anime-cyan">
                <Monitor className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-anime-100 text-sm font-bold">
                  Editor Font Size
                </div>
                <div className="text-anime-400 text-xs">
                  Code playground text size
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={24}
                  step={1}
                  value={settings.codeEditorFontSize}
                  onChange={(e) =>
                    updateSetting("codeEditorFontSize", Number(e.target.value))
                  }
                  className="accent-anime-cyan w-24"
                />
                <span className="text-anime-cyan w-8 text-right font-mono text-sm">
                  {settings.codeEditorFontSize}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Databricks Workspace Section */}
        <section className="mb-8">
          <SectionHeader
            label="Databricks Workspace"
            icon={<Database className="h-4 w-4" />}
          />
          <div className="bg-anime-900 border-anime-700 cut-corner rounded-lg border p-6">
            {session?.user ? (
              connectionError ? (
                <div className="space-y-3">
                  <div className="p-4 bg-anime-accent/10 border border-anime-accent rounded-lg">
                    <p className="text-anime-accent text-sm font-medium">
                      Error: {connectionError}
                    </p>
                  </div>
                  <p className="text-anime-400 text-sm">
                    Connect your Databricks workspace to run code against real clusters.
                  </p>
                  <ConnectionForm
                    userId={session.user.id ?? ""}
                    onConnect={(url) => {
                      setDatabricksUrl(url)
                      setConnectionError(null)
                    }}
                  />
                </div>
              ) : databricksUrl ? (
                <ConnectionStatus
                  userId={session.user.id ?? ""}
                  onDisconnect={() => {
                    setDatabricksUrl(null)
                    setConnectionError(null)
                  }}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-anime-400 text-sm">
                    Connect your Databricks workspace to run code against real
                    clusters. Your Personal Access Token is encrypted at rest.
                  </p>
                  <ConnectionForm
                    userId={session.user.id ?? ""}
                    onConnect={(url) => setDatabricksUrl(url)}
                  />
                </div>
              )
            ) : (
              <p className="text-anime-400 py-3 text-center text-sm">
                Sign in to connect a Databricks workspace.
              </p>
            )}
          </div>

          {/* Auto-cleanup toggle */}
          {session?.user && (
            <div className="bg-anime-900 border-anime-700 cut-corner mt-4 space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-anime-100 flex items-center gap-2 text-sm font-bold">
                    <Zap className="text-anime-cyan h-4 w-4" />
                    Auto-cleanup Deployments
                  </div>
                  <div className="text-anime-400 mt-1 text-xs">
                    Automatically clean up Field Operations deployments on next visit (24h+ old)
                  </div>
                  {settings.lastAutoCleanupAt && (
                    <div className="text-anime-500 text-xs mt-1">
                      Last cleaned: {new Date(settings.lastAutoCleanupAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    // Will clean on next app load - just mark toggle
                    updateSetting(
                      "fieldOpsAutoCleanup",
                      !settings.fieldOpsAutoCleanup,
                    )
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    settings.fieldOpsAutoCleanup
                      ? "bg-anime-cyan"
                      : "bg-anime-700",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.fieldOpsAutoCleanup
                        ? "translate-x-6"
                        : "translate-x-1",
                    )}
                  />
                </button>
              </div>

              <div className="border-anime-700 border-t pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-anime-100 text-sm font-bold">
                      Clean up assets
                    </div>
                    <div className="text-anime-400 text-xs">
                      Destroy Databricks assets from all your eligible Field Ops
                      deployments.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      void handleBulkCleanupAssets()
                    }}
                    disabled={isBulkCleaningAssets}
                    className="bg-anime-accent/20 border-anime-accent text-anime-accent hover:bg-anime-accent/30 rounded-lg border px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBulkCleaningAssets
                      ? "Cleaning up..."
                      : "Clean up assets"}
                  </button>
                </div>
                {bulkCleanupStatus && (
                  <p
                    className={`mt-3 text-xs ${bulkCleanupStatus.type === "success" ? "text-anime-green" : "text-anime-accent"}`}
                  >
                    {bulkCleanupStatus.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Deployment Manager */}
        {databricksUrl && session?.user && (
          <section className="mb-8">
            <SectionHeader
              label="Deployments"
              icon={<Database className="h-4 w-4" />}
            />
            <div className="bg-anime-900 border-anime-700 cut-corner rounded-lg border p-6">
              <DeploymentManager />
            </div>
          </section>
        )}

        {/* Coupon Redemption */}
        <section className="mb-8">
          <SectionHeader label="Coupons" icon={<Zap className="h-4 w-4" />} />
          <div className="bg-anime-900 border-anime-700 cut-corner rounded-lg border p-6">
            <div className="mx-auto max-w-xl">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Enter code"
                  className="bg-anime-800 border-anime-700 text-anime-cyan placeholder:text-anime-purple/70 flex-1 rounded-lg border px-4 py-2 uppercase"
                />
                <button
                  onClick={() => {
                    void handleRedeemCoupon()
                  }}
                  disabled={isRedeemingCoupon}
                  className="bg-anime-cyan text-anime-950 rounded-lg px-4 py-2 font-bold disabled:opacity-60"
                >
                  {isRedeemingCoupon ? "Redeeming..." : "Redeem"}
                </button>
              </div>
              {couponStatus && (
                <p
                  className={`mt-3 text-center text-sm ${
                    couponStatus.type === "success"
                      ? "text-anime-green"
                      : "text-anime-accent"
                  }`}
                >
                  {couponStatus.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Data Management Section */}
        <section className="mb-8">
          <SectionHeader
            label="Data Management"
            icon={<HardDrive className="h-4 w-4" />}
          />
          <div className="bg-anime-900 border-anime-700 cut-corner space-y-4 rounded-lg border p-6">
            {/* Storage Info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-anime-400">Local Storage Used</span>
              <span className="text-anime-cyan font-mono">{storageUsed}</span>
            </div>

            {exportMsg && (
              <div className="text-anime-green bg-anime-green/10 border-anime-green/30 rounded-lg border py-2 text-center font-mono text-sm">
                {exportMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="bg-anime-800 border-anime-700 text-anime-cyan hover:border-anime-cyan/50 hover:bg-anime-800/80 flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition-all"
              >
                <Download className="h-4 w-4" />
                Export Progress
              </button>
              <button
                onClick={handleImport}
                className="bg-anime-800 border-anime-700 text-anime-purple hover:border-anime-purple/50 hover:bg-anime-800/80 flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition-all"
              >
                <Upload className="h-4 w-4" />
                Import Progress
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mb-8">
          <SectionHeader
            label="Danger Zone"
            icon={<AlertTriangle className="h-4 w-4" />}
            accent="anime-accent"
          />
          <div className="bg-anime-900 border-anime-accent/50 cut-corner rounded-lg border p-6">
            <p className="text-anime-400 mb-4 text-sm">
              This will permanently delete all local progress, achievements, and
              settings. This action cannot be undone.
            </p>

            {!showDangerConfirm ? (
              <button
                onClick={() => setShowDangerConfirm(true)}
                className="bg-anime-accent/20 border-anime-accent text-anime-accent hover:bg-anime-accent/30 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Reset All Data
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-anime-accent text-sm font-bold">
                  Are you sure?
                </span>
                <button
                  onClick={handleReset}
                  className="bg-anime-accent text-anime-950 hover:bg-anime-accent/80 rounded-lg px-4 py-2 text-sm font-black transition-all"
                >
                  YES, DELETE EVERYTHING
                </button>
                <button
                  onClick={() => setShowDangerConfirm(false)}
                  className="bg-anime-800 border-anime-700 text-anime-400 hover:text-anime-100 rounded-lg border px-4 py-2 text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>

        {/* App Info Footer */}
        <div className="text-anime-700 mt-16 space-y-1 text-center font-mono text-xs">
          <p>DATABRICKS SWORD v1.0.0</p>
          <p>BUILT WITH NEXT.JS 15 + TURSO + DRIZZLE</p>
          <p className="text-anime-400">
            Dark-only. No telemetry. Your data stays yours.
          </p>
        </div>
      </div>

      {/* Sync progress dialog — shown during sign-out */}
      <SyncProgressDialog open={isSyncing} />
    </div>
  )
}

/* ===========================================================================
   Sub-components
   =========================================================================== */

/**
 * Section header with icon + label.
 */
function SectionHeader({
  label,
  icon,
  accent = "anime-cyan",
}: {
  label: string
  icon: React.ReactNode
  accent?: string
}): React.ReactElement {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className={cn("text-" + accent)}>{icon}</div>
      <h2 className="font-heading text-anime-100 text-lg font-bold">{label}</h2>
    </div>
  )
}

/**
 * Toggle row for boolean settings.
 */
function ToggleRow({
  icon,
  label,
  description,
  enabled,
  onChange,
  disabled = false,
}: {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}): React.ReactElement {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="text-anime-cyan">{icon}</div>
      <div className="flex-1">
        <div className="text-anime-100 text-sm font-bold">{label}</div>
        <div className="text-anime-400 text-xs">{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200",
          enabled ? "bg-anime-cyan" : "bg-anime-700",
          disabled && "cursor-not-allowed opacity-60",
        )}
        aria-label={`Toggle ${label}`}
      >
        <div
          className={cn(
            "bg-anime-950 absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform duration-200",
            enabled && "translate-x-5",
          )}
        />
      </button>
    </div>
  )
}
