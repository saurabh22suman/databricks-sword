"use client"

import { ConnectionForm, ConnectionStatus } from "@/components/databricks"
import { RankBadge } from "@/components/gamification/RankBadge"
import { getRankForXp } from "@/lib/gamification"
import type { SandboxData } from "@/lib/sandbox"
import { loadSandbox, saveSandbox } from "@/lib/sandbox"
import { SETTINGS_STORAGE_KEY, useSettings } from "@/lib/settings"
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
    Zap
} from "lucide-react"
import { useDisconnect } from "@/lib/sandbox/useDisconnect"
import { SyncProgressDialog } from "@/components/auth/SyncProgressDialog"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"

/**
 * Settings page — account, preferences, data management.
 */
export default function SettingsPage(): React.ReactElement {
  const { data: session } = useSession()
  const { settings, updateSetting, resetSettings } = useSettings()
  const { disconnect, isSyncing } = useDisconnect()
  const [sandbox, setSandbox] = useState<SandboxData | null>(null)
  const [showDangerConfirm, setShowDangerConfirm] = useState(false)
  const [exportMsg, setExportMsg] = useState("")
  const [databricksUrl, setDatabricksUrl] = useState<string | null>(null)

  useEffect(() => {
    setSandbox(loadSandbox())
  }, [])

  // Fetch existing Databricks connection on mount
  useEffect(() => {
    if (!session?.user?.id) return
    
    const fetchConnection = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/databricks/status`)
        if (response.ok) {
          const data = await response.json()
          if (data.connected && data.workspaceUrl) {
            setDatabricksUrl(data.workspaceUrl)
          }
        }
      } catch {
        // Ignore errors - user just won't see connected status
      }
    }
    
    fetchConnection()
  }, [session?.user?.id])

  const totalXp = sandbox?.userStats.totalXp ?? 0
  const rank = getRankForXp(totalXp)

  /**
   * Export progress as JSON file.
   */
  const handleExport = useCallback((): void => {
    const data = loadSandbox()
    if (!data) {
      setExportMsg("No progress data to export.")
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
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
      return bytes < 1024
        ? `${bytes} B`
        : `${(bytes / 1024).toFixed(1)} KB`
    } catch {
      return "N/A"
    }
  })()

  return (
    <div className="min-h-screen bg-anime-950 cyber-grid pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-3xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-anime-700 rounded-full mb-4 text-xs tracking-widest uppercase text-anime-cyan font-mono">
            <Monitor className="w-3 h-3" />
            System Config
          </div>
          <h1 className="font-heading text-5xl font-black text-anime-100 mb-3">
            <span className="text-anime-cyan">SETTINGS</span>
          </h1>
          <p className="text-anime-400 text-lg">
            Configure your training environment.
          </p>
        </div>

        {/* Account Section */}
        <section className="mb-8">
          <SectionHeader label="Account" icon={<Shield className="w-4 h-4" />} />
          <div className="bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner">
            {session?.user ? (
              <div className="flex items-center gap-4">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-14 h-14 rounded-full border-2 border-anime-cyan"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-anime-800 border-2 border-anime-cyan flex items-center justify-center">
                    <Shield className="w-6 h-6 text-anime-cyan" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-lg font-bold text-anime-100">{session.user.name ?? "Agent"}</div>
                  <div className="text-sm text-anime-400 font-mono">{session.user.email ?? "No email"}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <RankBadge rank={rank} size={16} />
                    <span className="text-xs text-anime-cyan font-bold">{rank.title}</span>
                    <span className="text-xs text-anime-400">— {totalXp.toLocaleString()} XP</span>
                  </div>
                </div>
                <button
                  onClick={() => void disconnect()}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-anime-accent/20 border border-anime-accent text-anime-accent rounded-lg text-sm font-bold hover:bg-anime-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-anime-400 mb-2">Not signed in. Progress is stored locally.</p>
                <p className="text-xs text-anime-700 font-mono">
                  Sign in from the header to enable cross-device sync.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-8">
          <SectionHeader label="Preferences" icon={<Zap className="w-4 h-4" />} />
          <div className="bg-anime-900 border border-anime-700 rounded-lg divide-y divide-anime-700 cut-corner overflow-hidden">
            <ToggleRow
              icon={settings.sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              label="Sound Effects"
              description="XP gain, achievement unlock sounds"
              enabled={settings.sfxEnabled}
              onChange={(v) => updateSetting("sfxEnabled", v)}
            />
            <ToggleRow
              icon={<Music className="w-4 h-4" />}
              label="Background Music"
              description="Ambient cyberpunk soundtrack"
              enabled={settings.musicEnabled}
              onChange={(v) => updateSetting("musicEnabled", v)}
            />
            {settings.musicEnabled && (
              <div className="flex items-center gap-4 px-6 py-4 bg-anime-950/30">
                <div className="text-anime-cyan">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-anime-100">Music Volume</div>
                  <div className="text-xs text-anime-400">Adjust ambient music level</div>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="w-3 h-3 text-anime-500" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={settings.musicVolume}
                    onChange={(e) => updateSetting("musicVolume", Number(e.target.value))}
                    className="w-28 accent-anime-cyan"
                  />
                  <Volume2 className="w-3 h-3 text-anime-500" />
                  <span className="text-sm font-mono text-anime-cyan w-8 text-right">
                    {settings.musicVolume}
                  </span>
                </div>
              </div>
            )}
            <ToggleRow
              icon={<Zap className="w-4 h-4" />}
              label="Animations"
              description="Glitch, scan-line, and hologram effects"
              enabled={settings.animationsEnabled}
              onChange={(v) => updateSetting("animationsEnabled", v)}
            />
            <ToggleRow
              icon={settings.showHints ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              label="Show Hints"
              description="Display hint buttons in challenges"
              enabled={settings.showHints}
              onChange={(v) => updateSetting("showHints", v)}
            />

            {/* Font Size Slider */}
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="text-anime-cyan">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-anime-100">Editor Font Size</div>
                <div className="text-xs text-anime-400">Code playground text size</div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={24}
                  step={1}
                  value={settings.codeEditorFontSize}
                  onChange={(e) => updateSetting("codeEditorFontSize", Number(e.target.value))}
                  className="w-24 accent-anime-cyan"
                />
                <span className="text-sm font-mono text-anime-cyan w-8 text-right">
                  {settings.codeEditorFontSize}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Databricks Workspace Section */}
        <section className="mb-8">
          <SectionHeader label="Databricks Workspace" icon={<Database className="w-4 h-4" />} />
          <div className="bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner">
            {session?.user ? (
              databricksUrl ? (
                <ConnectionStatus
                  userId={session.user.id ?? ""}
                  validate
                  onDisconnect={() => setDatabricksUrl(null)}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-anime-400">
                    Connect your Databricks workspace to run code against real clusters.
                    Your Personal Access Token is encrypted at rest.
                  </p>
                  <ConnectionForm
                    userId={session.user.id ?? ""}
                    onConnect={(url) => setDatabricksUrl(url)}
                  />
                </div>
              )
            ) : (
              <p className="text-sm text-anime-400 text-center py-3">
                Sign in to connect a Databricks workspace.
              </p>
            )}
          </div>
          
          {/* Auto-cleanup toggle */}
          {session?.user && (
            <div className="mt-4 bg-anime-900 border border-anime-700 rounded-lg p-4 cut-corner">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-bold text-anime-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-anime-cyan" />
                    Auto-cleanup Deployments
                  </div>
                  <div className="text-xs text-anime-400 mt-1">
                    Automatically clean up Field Operations deployments 24 hours after completion
                  </div>
                </div>
                <button
                  onClick={() => updateSetting("fieldOpsAutoCleanup", !settings.fieldOpsAutoCleanup)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    settings.fieldOpsAutoCleanup ? "bg-anime-cyan" : "bg-anime-700"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.fieldOpsAutoCleanup ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Data Management Section */}
        <section className="mb-8">
          <SectionHeader label="Data Management" icon={<HardDrive className="w-4 h-4" />} />
          <div className="bg-anime-900 border border-anime-700 rounded-lg p-6 cut-corner space-y-4">
            {/* Storage Info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-anime-400">Local Storage Used</span>
              <span className="font-mono text-anime-cyan">{storageUsed}</span>
            </div>

            {exportMsg && (
              <div className="text-sm text-anime-green font-mono text-center py-2 bg-anime-green/10 border border-anime-green/30 rounded-lg">
                {exportMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-anime-800 border border-anime-700 rounded-lg text-sm font-bold text-anime-cyan hover:border-anime-cyan/50 hover:bg-anime-800/80 transition-all"
              >
                <Download className="w-4 h-4" />
                Export Progress
              </button>
              <button
                onClick={handleImport}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-anime-800 border border-anime-700 rounded-lg text-sm font-bold text-anime-purple hover:border-anime-purple/50 hover:bg-anime-800/80 transition-all"
              >
                <Upload className="w-4 h-4" />
                Import Progress
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mb-8">
          <SectionHeader label="Danger Zone" icon={<AlertTriangle className="w-4 h-4" />} accent="anime-accent" />
          <div className="bg-anime-900 border border-anime-accent/50 rounded-lg p-6 cut-corner">
            <p className="text-sm text-anime-400 mb-4">
              This will permanently delete all local progress, achievements, and settings.
              This action cannot be undone.
            </p>

            {!showDangerConfirm ? (
              <button
                onClick={() => setShowDangerConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-anime-accent/20 border border-anime-accent text-anime-accent rounded-lg text-sm font-bold hover:bg-anime-accent/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Reset All Data
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-anime-accent font-bold">Are you sure?</span>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-anime-accent text-anime-950 rounded-lg text-sm font-black hover:bg-anime-accent/80 transition-all"
                >
                  YES, DELETE EVERYTHING
                </button>
                <button
                  onClick={() => setShowDangerConfirm(false)}
                  className="px-4 py-2 bg-anime-800 border border-anime-700 text-anime-400 rounded-lg text-sm hover:text-anime-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>

        {/* App Info Footer */}
        <div className="text-center text-xs text-anime-700 font-mono space-y-1 mt-16">
          <p>DATABRICKS SWORD v1.0.0</p>
          <p>BUILT WITH NEXT.JS 15 + TURSO + DRIZZLE</p>
          <p className="text-anime-400">Dark-only. No telemetry. Your data stays yours.</p>
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
    <div className="flex items-center gap-2 mb-3">
      <div className={cn("text-" + accent)}>{icon}</div>
      <h2 className="font-heading text-lg font-bold text-anime-100">{label}</h2>
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
}: {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
}): React.ReactElement {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="text-anime-cyan">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-bold text-anime-100">{label}</div>
        <div className="text-xs text-anime-400">{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200",
          enabled ? "bg-anime-cyan" : "bg-anime-700",
        )}
        aria-label={`Toggle ${label}`}
      >
        <div
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 bg-anime-950 rounded-full transition-transform duration-200",
            enabled && "translate-x-5",
          )}
        />
      </button>
    </div>
  )
}
