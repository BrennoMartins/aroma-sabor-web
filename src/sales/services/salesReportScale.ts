import type { DailySalesReportEntry } from './salesReportApi'

export function getMaximumDailyValue(
  dailySales: readonly DailySalesReportEntry[],
  metric: 'revenue' | 'salesCount',
) {
  return dailySales.reduce((maximum, entry) => Math.max(maximum, entry[metric]), 0)
}
