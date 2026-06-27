export function getCurrentWeekKey(date = new Date()): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

  return `${target.getUTCFullYear()}-${String(weekNumber).padStart(2, '0')}`
}

export function formatWeekKeyAsMonthDay(weekKey: string): string {
  const weekStart = getWeekStartDate(weekKey)

  if (!weekStart) {
    return weekKey
  }

  return `${weekStart.getUTCMonth() + 1}/${weekStart.getUTCDate()}`
}

export function formatWeekKeyAsKoreanMonthWeek(weekKey: string): string {
  const weekStart = getWeekStartDate(weekKey)

  if (!weekStart) {
    return weekKey
  }

  const ordinals = ['첫째', '둘째', '셋째', '넷째', '다섯째']
  const weekAnchor = new Date(weekStart)
  weekAnchor.setUTCDate(weekStart.getUTCDate() + 3)

  const monthStart = new Date(Date.UTC(weekAnchor.getUTCFullYear(), weekAnchor.getUTCMonth(), 1))
  const firstThursday = new Date(monthStart)
  const daysUntilThursday = (4 - monthStart.getUTCDay() + 7) % 7
  firstThursday.setUTCDate(monthStart.getUTCDate() + daysUntilThursday)

  const weekIndex = Math.max(0, Math.floor((weekAnchor.getTime() - firstThursday.getTime()) / 604800000))
  const ordinal = ordinals[weekIndex] ?? `${weekIndex + 1}번째`

  return `${weekAnchor.getUTCMonth() + 1}월 ${ordinal}주`
}

export function buildWeekOptions(count = 12, date = new Date()): Array<{ weekKey: string; label: string }> {
  return Array.from({ length: count }, (_, index) => {
    const optionDate = new Date(date)
    optionDate.setDate(date.getDate() + index * 7)
    const weekKey = getCurrentWeekKey(optionDate)

    return {
      weekKey,
      label: formatWeekKeyAsKoreanMonthWeek(weekKey),
    }
  })
}

function getWeekStartDate(weekKey: string): Date | null {
  const [yearText, weekText] = weekKey.split('-')
  const year = Number(yearText)
  const week = Number(weekText)

  if (!Number.isInteger(year) || !Number.isInteger(week)) {
    return null
  }

  const januaryFourth = new Date(Date.UTC(year, 0, 4))
  const januaryFourthDay = januaryFourth.getUTCDay() || 7
  const firstMonday = new Date(januaryFourth)
  firstMonday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1)
  firstMonday.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7)

  return firstMonday
}
