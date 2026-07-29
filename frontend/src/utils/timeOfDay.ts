export type TimeOfDay = 'morning' | 'day' | 'evening'

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
}
