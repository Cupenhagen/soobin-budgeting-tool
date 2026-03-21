import type { BalanceResult } from '@/core/tools/balance-tool'
import { formatPHP } from '@/lib/php-formatter'

export function HeroBalanceCard({ result }: { result: BalanceResult }) {
  return (
    <div className="rounded-card p-m text-white bg-gradient-to-br from-brand to-brand-dark shadow-card">
      {/* Total balance */}
      <p className="text-white/70 text-sm font-medium mb-1">Total Balance</p>
      <p className="text-hero font-bold">{formatPHP(result.totalBalance)}</p>

      {/* Net worth row */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
        <div>
          <p className="text-white/60 text-xs">Liabilities</p>
          <p className="text-white font-semibold text-sm">{formatPHP(result.totalLiabilities)}</p>
        </div>
        <div className="w-px h-8 bg-white/20" />
        <div>
          <p className="text-white/60 text-xs">Net Worth</p>
          <p className="text-white font-semibold text-sm">{formatPHP(result.netWorth)}</p>
        </div>
      </div>

      {/* Per-account chips */}
      {result.balances.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {result.balances.slice(0, 4).map((b) => (
            <div key={b.account.id} className="bg-white/15 rounded-chip px-3 py-1">
              <p className="text-white/70 text-xs">{b.account.name}</p>
              <p className="text-white text-xs font-semibold">{formatPHP(b.computedBalance)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
