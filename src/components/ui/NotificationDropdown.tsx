/**
 * @file NotificationDropdown.tsx
 * @description Azure Portal-style notification dropdown
 * Bell icon with badge, dropdown panel, dismiss functionality
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, X, Award, CheckCircle, AlertCircle, Info, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"

export type NotificationType = "achievement" | "cleanup" | "info" | "success" | "warning" | "error"

export type Notification = {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
}

const NOTIFICATION_STORAGE_KEY = "dbsword-notifications"

// Sample notifications for demo
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "achievement",
    title: "Achievement Unlocked! 🎉",
    message: "You earned 'First Pipeline' badge for completing your first data pipeline mission.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    read: false,
  },
  {
    id: "2",
    type: "cleanup",
    title: "Cleanup Suggestion",
    message: "You have 3 Field OPS deployments from over 24h ago. Consider cleaning up to save credits.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
  },
  {
    id: "3",
    type: "success",
    title: "Mission Complete!",
    message: "Congratulations! You've completed Lakehouse Fundamentals with 98% validation score.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
  },
]

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "achievement":
      return <Award className="w-4 h-4 text-yellow-400" />
    case "cleanup":
      return <Trash2 className="w-4 h-4 text-orange-400" />
    case "success":
      return <CheckCircle className="w-4 h-4 text-green-400" />
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-400" />
    case "warning":
      return <AlertCircle className="w-4 h-4 text-orange-400" />
    default:
      return <Info className="w-4 h-4 text-blue-400" />
  }
}

/**
 * Get styles for notification type
 */
function getNotificationStyles(type: NotificationType): string {
  switch (type) {
    case "achievement":
      return "bg-yellow-500/10 border-yellow-500/30"
    case "cleanup":
      return "bg-orange-500/10 border-orange-500/30"
    case "success":
      return "bg-green-500/10 border-green-500/30"
    case "error":
      return "bg-red-500/10 border-red-500/30"
    case "warning":
      return "bg-orange-500/10 border-orange-500/30"
    default:
      return "bg-blue-500/10 border-blue-500/30"
  }
}

/**
 * Azure Portal-style notification dropdown
 * Bell icon with unread badge, dropdown panel
 */
export function NotificationDropdown(): React.ReactElement {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  // Use ref to track latest notifications for callbacks
  const notificationsRef = useRef(notifications)
  notificationsRef.current = notifications

  // Load notifications on mount
  useEffect(() => {
    if (status === "authenticated") {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Notification[]
          setNotifications(parsed)
        } catch {
          setNotifications(DEMO_NOTIFICATIONS)
          localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(DEMO_NOTIFICATIONS))
        }
      } else {
        setNotifications(DEMO_NOTIFICATIONS)
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(DEMO_NOTIFICATIONS))
      }
    }
  }, [status])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    setNotifications(updated)
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated))
  }

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }))
    setNotifications(updated)
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated))
  }

  const dismissNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id)
    setNotifications(updated)
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated))
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "Yesterday"
    return date.toLocaleDateString()
  }

  // Show bell only when logged in
  if (status !== "authenticated") {
    return <></>
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-anime-800/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-anime-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-anime-accent text-anime-950 text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-anime-900/95 border border-anime-700 rounded-lg shadow-2xl backdrop-blur-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-anime-800/50 border-b border-anime-700">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-anime-cyan" />
              <span className="font-semibold text-anime-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-anime-accent/20 text-anime-accent text-xs rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-anime-400 hover:text-anime-cyan transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-anime-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    relative px-4 py-3 border-b border-anime-800/50
                    hover:bg-anime-800/30 transition-colors cursor-pointer
                    ${!notification.read ? "bg-anime-800/20" : ""}
                    ${getNotificationStyles(notification.type)}
                  `}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-anime-100 text-sm truncate">
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-anime-cyan flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-anime-400 text-xs mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-anime-500 text-xs mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        dismissNotification(notification.id)
                      }}
                      className="p-1 text-anime-500 hover:text-anime-300 hover:bg-anime-800/50 rounded transition-colors"
                      aria-label="Dismiss notification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-anime-800/30 border-t border-anime-700 text-center">
            <span className="text-anime-500 text-xs">Databricks Sword Notifications</span>
          </div>
        </div>
      )}
    </div>
  )
}