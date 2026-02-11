'use client'

import { SchülerApp } from '@/lib/baserow'
import { calculateTotalEarnings, formatCurrency } from '@/lib/earnings'

interface EarningsOverviewProps {
  students: SchülerApp[]
}

export default function EarningsOverview({ students }: EarningsOverviewProps) {
  const totalEarnings = calculateTotalEarnings(students)

  if (totalEarnings.activeStudents === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        💰 Einnahmen-Übersicht
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Monatlich */}
        <div className="text-center p-4 rounded-lg" style={{ 
          backgroundColor: 'var(--bg-secondary)',
          border: `1px solid var(--border-light)`
        }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
            {formatCurrency(totalEarnings.totalMonthlyRevenue)}
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Monatlich
          </div>
        </div>

        {/* Gesamt */}
        <div className="text-center p-4 rounded-lg" style={{ 
          backgroundColor: 'var(--bg-secondary)',
          border: `1px solid var(--border-light)`
        }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
            {formatCurrency(totalEarnings.totalLifetimeRevenue)}
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Gesamt
          </div>
        </div>

        {/* Aktive Schüler */}
        <div className="text-center p-4 rounded-lg" style={{ 
          backgroundColor: 'var(--bg-secondary)',
          border: `1px solid var(--border-light)`
        }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
            {totalEarnings.activeStudents}
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Aktive Schüler
          </div>
        </div>

        {/* Durchschnitt */}
        <div className="text-center p-4 rounded-lg" style={{ 
          backgroundColor: 'var(--bg-secondary)',
          border: `1px solid var(--border-light)`
        }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
            {formatCurrency(totalEarnings.averageMonthlyRate)}
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Durchschnitt
          </div>
        </div>

      </div>

      {totalEarnings.totalOutstanding > 0 && (
        <div className="mt-4 p-3 rounded-lg flex justify-between items-center" style={{ 
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: `1px solid var(--status-warning)`
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>Ausstehende Zahlungen:</span>
          <span className="font-bold text-lg" style={{ color: 'var(--status-warning)' }}>
            {formatCurrency(totalEarnings.totalOutstanding)}
          </span>
        </div>
      )}
    </div>
  )
}