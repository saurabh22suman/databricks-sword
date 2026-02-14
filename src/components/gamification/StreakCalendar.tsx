"use client"

import { cn } from "@/lib/utils"

interface StreakDay {
  date: string // YYYY-MM-DD format
  hasActivity: boolean
  isFrozen: boolean
}

interface StreakCalendarProps {
  month: number // 1-12
  year: number
  streakData: StreakDay[]
  onDateClick?: (date: string) => void
  onMonthChange?: (month: number, year: number) => void
  className?: string
}

export function StreakCalendar({ 
  month, 
  year, 
  streakData, 
  onDateClick, 
  onMonthChange,
  className 
}: StreakCalendarProps): React.ReactElement {
  
  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Day headers
  const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  // Get number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate()
  
  // Get first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  
  // Convert Sunday (0) to be at the end (7) and adjust others
  const firstDayAdjusted = firstDayOfMonth === 0 ? 7 : firstDayOfMonth

  // Create calendar grid
  const calendarDays: Array<{ day: number | null; date: string | null }> = []
  
  // Add empty cells for days before the month starts
  for (let i = 1; i < firstDayAdjusted; i++) {
    calendarDays.push({ day: null, date: null })
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    calendarDays.push({ day, date })
  }

  // Get streak data for a specific date
  const getStreakDataForDate = (date: string): StreakDay | null => {
    return streakData.find(data => data.date === date) || null
  }

  // Get today's date string
  const todayStr = new Date().toISOString().split('T')[0]

  // Calculate statistics
  const totalActiveDays = streakData.filter(data => data.hasActivity).length
  const totalFreezesUsed = streakData.filter(data => data.isFrozen).length
  
  // Calculate current streak (assuming data is sorted by date)
  const currentStreak = calculateCurrentStreak(streakData)

  // Handle navigation
  const handlePrevMonth = (): void => {
    if (onMonthChange) {
      const newMonth = month === 1 ? 12 : month - 1
      const newYear = month === 1 ? year - 1 : year
      onMonthChange(newMonth, newYear)
    }
  }

  const handleNextMonth = (): void => {
    if (onMonthChange) {
      const newMonth = month === 12 ? 1 : month + 1
      const newYear = month === 12 ? year + 1 : year
      onMonthChange(newMonth, newYear)
    }
  }

  // Render day cell
  const renderDay = (day: number | null, date: string | null): React.ReactElement => {
    if (day === null || date === null) {
      return <div key={`empty-${Math.random()}`} className="p-2"></div>
    }

    const streakData = getStreakDataForDate(date)
    const isToday = date === todayStr
    const hasActivity = streakData?.hasActivity || false
    const isFrozen = streakData?.isFrozen || false

    const dayClassName = cn(
      "relative p-2 text-center text-sm font-mono cursor-pointer",
      "transition-all duration-200 hover:scale-105",
      "border border-anime-700 rounded-lg",
      {
        // Background colors
        "bg-anime-cyan text-anime-950": hasActivity && !isFrozen,
        "bg-anime-purple text-anime-950": isFrozen,
        "bg-anime-800 text-anime-500": !hasActivity && !isFrozen,
        
        // Today marker
        "ring-2 ring-anime-yellow": isToday,
      }
    )

    return (
      <div
        key={date}
        data-testid={`day-${date}`}
        className={dayClassName}
        onClick={() => onDateClick?.(date)}
      >
        {day}
        {isFrozen && (
          <div className="absolute top-0 right-0 text-xs">❄️</div>
        )}
      </div>
    )
  }

  return (
    <div 
      className={cn("bg-anime-900 border border-anime-700 rounded-lg p-4", className)}
      data-testid="streak-calendar"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={handlePrevMonth}
          className="text-anime-cyan hover:text-anime-yellow transition-colors text-lg"
        >
          ❮
        </button>
        
        <h3 className="text-lg font-bold text-anime-cyan">
          {monthNames[month - 1]} {year}
        </h3>
        
        <button 
          onClick={handleNextMonth}
          className="text-anime-cyan hover:text-anime-yellow transition-colors text-lg"
        >
          ❯
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayHeaders.map(day => (
          <div key={day} className="text-center text-xs font-bold text-anime-purple p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {calendarDays.map((dayData, index) => renderDay(dayData.day, dayData.date))}
      </div>

      {/* Statistics */}
      <div className="border-t border-anime-700 pt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-anime-purple">Current Streak</div>
          <div className="text-sm font-bold text-anime-cyan">{currentStreak} days</div>
        </div>
        
        <div>
          <div className="text-xs text-anime-purple">Freezes Used</div>
          <div className="text-sm font-bold text-anime-cyan">{totalFreezesUsed}</div>
        </div>
        
        <div>
          <div className="text-xs text-anime-purple">Total Active</div>
          <div className="text-sm font-bold text-anime-cyan">{totalActiveDays} days</div>
        </div>
      </div>
    </div>
  )
}

// Helper function to calculate current streak
function calculateCurrentStreak(streakData: StreakDay[]): number {
  if (streakData.length === 0) return 0
  
  // Sort by date (most recent first)
  const sorted = [...streakData].sort((a, b) => b.date.localeCompare(a.date))
  
  let streak = 0
  for (const data of sorted) {
    if (data.hasActivity || data.isFrozen) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}