import React from 'react'
import {
  Play,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Check,
} from 'lucide-react'
import { useRoutine } from '../../context/RoutineContext'

export const ExecutionPanel: React.FC = () => {
  const {
    validationResult,
    isExecuting,
    executionFeedback,
    executeCurrentRoutine,
    cancelCurrentRoutine,
  } = useRoutine()

  if (!validationResult) {
    if (executionFeedback) {
      return (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{executionFeedback}</span>
          </div>
        </div>
      )
    }
    return null
  }

  const isBlocked = validationResult.status === 'BLOCKED'
  const isApprovalNeeded = validationResult.status === 'NEEDS_APPROVAL'

  return (
    <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
          {isBlocked ? (
            <>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Execution Controls (Blocked)</span>
            </>
          ) : isApprovalNeeded ? (
            <>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Owner Approval Required</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Ready for Simulated Execution</span>
            </>
          )}
        </h4>

        {executionFeedback && (
          <span className="text-xs text-emerald-400 font-medium">
            {executionFeedback}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        {isBlocked
          ? 'Execution is locked because this routine violates critical physical safety or security policies. Use the Edit tool on hazardous actions above to resolve violations before revalidating.'
          : isApprovalNeeded
          ? 'This routine contains sensitive entry actions. Review the proposed changes carefully. By clicking Approve, you simulate explicit homeowner override authorization.'
          : 'All proposed actions have satisfied policy verification. Click below to simulate state updates on virtual devices.'}
      </p>

      {/* Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-700/60">
        <button
          type="button"
          onClick={cancelCurrentRoutine}
          disabled={isExecuting}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
          Cancel Routine
        </button>

        <button
          type="button"
          onClick={executeCurrentRoutine}
          disabled={isBlocked || isExecuting}
          className={`inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
            isBlocked
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              : isApprovalNeeded
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Simulating Execution...
            </>
          ) : isApprovalNeeded ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Approve & Execute Override
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Simulate Execution
            </>
          )}
        </button>
      </div>
    </div>
  )
}
