import { differenceInMonths, differenceInWeeks, addMonths } from 'date-fns'
import type { SavingsGoal } from '../models/savings-goal'
import { toNumber, formatPHP, formatPHPCompact } from '@/lib/php-formatter'

export interface SavingsGoalResult {
  goal: SavingsGoal
  progress: number            // 0.0 … 1.0+
  amountRemaining: number
  isCompleted: boolean
  projectedCompletionDate?: Date
  monthlyRequired?: number
  weeklyRequired?: number
  statusMessage: string
  impactMessage?: string
}

export function executeSavingsGoalTool(goal: SavingsGoal, referenceDate: Date): SavingsGoalResult {
  const target = toNumber(goal.targetAmount)
  const current = toNumber(goal.currentAmount)
  const remaining = Math.max(target - current, 0)
  const progress = target > 0 ? current / target : 0
  const isCompleted = current >= target

  let monthlyRequired: number | undefined
  let weeklyRequired: number | undefined
  let projectedCompletionDate: Date | undefined

  if (goal.targetDate && !isCompleted) {
    const targetDate = new Date(goal.targetDate)
    const months = Math.max(differenceInMonths(targetDate, referenceDate), 0)
    const weeks = Math.max(differenceInWeeks(targetDate, referenceDate), 0)
    if (months > 0) monthlyRequired = remaining / months
    if (weeks > 0)  weeklyRequired  = remaining / weeks
  }

  // Project completion from current savings rate
  const monthsElapsed = Math.max(differenceInMonths(referenceDate, new Date(goal.createdAt)), 1)
  if (monthsElapsed > 0 && current > 0 && !isCompleted) {
    const monthlyRate = current / monthsElapsed
    if (monthlyRate > 0) {
      const monthsNeeded = Math.ceil(remaining / monthlyRate)
      projectedCompletionDate = addMonths(referenceDate, monthsNeeded)
    }
  }

  const statusMessage = isCompleted
    ? `Goal reached! Great job saving for ${goal.name}.`
    : monthlyRequired
    ? `${formatPHP(remaining)} left — save ${formatPHPCompact(monthlyRequired)}/month to hit your goal.`
    : `${formatPHP(remaining)} left to reach your goal.`

  const impactMessage = weeklyRequired
    ? `Set aside ${formatPHPCompact(weeklyRequired)} each week to stay on track for ${goal.name}.`
    : undefined

  return { goal, progress, amountRemaining: remaining, isCompleted, projectedCompletionDate, monthlyRequired, weeklyRequired, statusMessage, impactMessage }
}
