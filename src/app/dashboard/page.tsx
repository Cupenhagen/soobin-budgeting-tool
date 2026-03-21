'use client'
import { useDashboard } from '@/hooks/use-dashboard'
import { useAppStore } from '@/store/app-store'
import { HeroBalanceCard } from '@/components/dashboard/HeroBalanceCard'
import { SafeToSpendCard } from '@/components/dashboard/SafeToSpendCard'
import { BudgetSummaryCard } from '@/components/dashboard/BudgetSummaryCard'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { SavingsGoalCard } from '@/components/dashboard/SavingsGoalCard'
import { UpcomingBillsCard } from '@/components/dashboard/UpcomingBillsCard'

export default function DashboardPage() {
  const { userName } = useAppStore()
  const { data, loading } = useDashboard()

  return (
    <div className="max-w-2xl mx-auto px-m py-m space-y-m">
      {/* Header */}
      <div className="flex items-center justify-between py-s">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Hey, {userName} 👋</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {loading || !data ? (
        <div className="space-y-m">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-card h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <HeroBalanceCard result={data.balanceResult} />
          <SafeToSpendCard safe={data.safeToSpend} weekly={data.weeklySummary} />

          {data.budgetResult.statuses.length > 0 && (
            <BudgetSummaryCard
              budgetResult={data.budgetResult}
              categories={data.categories ?? []}
              coachMessage={data.coachMessage}
            />
          )}

          {data.goalResults.length > 0 && (
            <SavingsGoalCard goalResults={data.goalResults} />
          )}

          {(data.billsTotal > 0 || data.debtResult.dueSoonCount > 0 || data.debtResult.overdueCount > 0) && (
            <UpcomingBillsCard debtResult={data.debtResult} billsTotal={data.billsTotal} />
          )}

          <RecentTransactions
            transactions={data.recentTransactions}
            categories={data.categories ?? []}
          />
        </>
      )}
    </div>
  )
}
