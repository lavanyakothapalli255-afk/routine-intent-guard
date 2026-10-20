import React from 'react'
import { AlertOctagon, Lightbulb, ShieldX } from 'lucide-react'
import type { PolicyViolation, Severity } from '../../types/routine'

interface ViolationListProps {
  violations: PolicyViolation[]
}

export const ViolationList: React.FC<ViolationListProps> = ({ violations }) => {
  if (violations.length === 0) return null

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
      case 'low':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
        <ShieldX className="w-4 h-4 text-rose-400" />
        <span>Policy Violations & Safety Conflicts ({violations.length})</span>
      </div>

      <div className="space-y-2.5">
        {violations.map((violation) => (
          <div
            key={violation.id}
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertOctagon className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-mono font-semibold text-slate-300">
                  {violation.ruleCode}
                </span>
                <h5 className="text-sm font-semibold text-slate-100">
                  {violation.title}
                </h5>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadge(
                  violation.severity
                )}`}
              >
                {violation.severity}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pl-6">
              {violation.explanation}
            </p>

            {violation.suggestedRemedy && (
              <div className="mt-3 ml-6 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/40 flex items-start space-x-2 text-xs text-indigo-300">
                <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-indigo-200">
                    Recommended Fix:{' '}
                  </span>
                  <span>{violation.suggestedRemedy}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
