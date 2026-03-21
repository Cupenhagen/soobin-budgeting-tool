import {
  startOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  isToday, isYesterday, format, differenceInDays,
} from 'date-fns'

/** Start and end of current week (Monday-based for PH) */
export function currentWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  return { start, end }
}

/** Start and end of current month */
export function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  return { start: startOfMonth(now), end: endOfMonth(now) }
}

/** Current quincena period (1-15 or 16-end) */
export function currentQuincenaRange(): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDate()
  const year = now.getFullYear()
  const month = now.getMonth()
  if (day <= 15) {
    return {
      start: new Date(year, month, 1),
      end: endOfDay(new Date(year, month, 15)),
    }
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return {
      start: new Date(year, month, 16),
      end: endOfDay(new Date(year, month, lastDay)),
    }
  }
}

function endOfDay(d: Date): Date {
  const end = startOfDay(d)
  end.setHours(23, 59, 59, 999)
  return end
}

/** "Today", "Yesterday", or "Mar 19" */
export function relativeDay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

/** "Mar 19, 2025" */
export function longDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy')
}

/** "8:30 PM" */
export function timeOnly(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'h:mm a')
}

/** Days remaining in current month */
export function daysRemainingInMonth(): number {
  const now = new Date()
  const end = endOfMonth(now)
  return differenceInDays(end, now)
}

/** ISO date string "2025-03-19" */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Start of a day as Date */
export function dayStart(date: Date | string): Date {
  return startOfDay(typeof date === 'string' ? new Date(date) : date)
}
