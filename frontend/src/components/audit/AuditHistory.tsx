import React, { useState } from 'react'
import { History, ChevronDown, ChevronUp, Check, ShieldAlert, X } from 'lucide-react'
import { useRoutine } from '../../context/RoutineContext'
import type { AuditLogEntry, ValidationStatus } from '../../types/routine'

export const AuditHistory: React.FC = () => {
  const { auditLogs } = useRoutine()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'VALID':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      case 'NEEDS_APPROVAL':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      case 'BLOCKED':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30'
    }
  }

  const getDecisionIcon = (decision: AuditLogEntry['decision']) => {
    switch (decision) {
      case 'executed':
      case 'approved_and_executed':
        return <Check className="w-3.5 h-3.5 text-emerald-400" />
      case 'blocked':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
      case 'cancelled':
        return <X className="w-3.5 h-3.5 text-slate-400" />
    }
  }

  return (
    <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Validation & Execution Audit Trail
            </h3>
            <p className="text-xs text-slate-400">
              Immutable history of evaluated routines, owner approvals, and simulated device actions
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
          {auditLogs.length} Total Logs
        </span>
      </div>

      <div className="space-y-2">
        {auditLogs.map((log) => {
          const isExpanded = expandedId === log.id

          return (
            <div
              key={log.id}
              className="rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900/90 transition-colors overflow-hidden"
            >
              <div
                onClick={() => toggleExpand(log.id)}
                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-1 rounded-full bg-slate-800 border border-slate-700 shrink-0">
                    {getDecisionIcon(log.decision)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate max-w-md sm:max-w-xl">
                      {log.prompt}
                    </p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{log.timestamp}</span>
                      <span>•</span>
                      <span className="capitalize text-slate-300">
                        {log.decision.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(
                      log.status
                    )}`}
                  >
                    {log.status}
                  </span>

                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-200"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="p-3.5 bg-slate-950/60 border-t border-slate-800/80 text-xs text-slate-300 space-y-2">
                  <div>
                    <span className="font-semibold text-slate-400">
                      Audit Notes:{' '}
                    </span>
                    <span>{log.details}</span>
                  </div>

                  {log.appliedChanges && log.appliedChanges.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="font-semibold text-slate-400 block mb-1">
                        State Modifications Applied:
                      </span>
                      <ul className="space-y-1 pl-4 list-disc text-slate-300">
                        {log.appliedChanges.map((change, idx) => (
                          <li key={idx}>
                            <span className="font-medium text-indigo-300">
                              {change.deviceName}
                            </span>
                            : {change.change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
