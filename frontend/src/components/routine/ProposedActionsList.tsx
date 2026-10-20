import React, { useState } from 'react'
import {
  ListFilter,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import type { ProposedAction, DeviceState } from '../../types/routine'
import { useRoutine } from '../../context/RoutineContext'
import { ActionEditModal } from './ActionEditModal'

interface ProposedActionsListProps {
  actions: ProposedAction[]
}

export const ProposedActionsList: React.FC<ProposedActionsListProps> = ({
  actions,
}) => {
  const { updateProposedAction, removeProposedAction } = useRoutine()
  const [editingAction, setEditingAction] = useState<ProposedAction | null>(null)

  if (actions.length === 0) return null

  const isHazardousAction = (action: ProposedAction) => {
    return (
      (action.deviceId === 'dev-oven-kitchen' &&
        action.targetState.power === true) ||
      (action.deviceId === 'dev-cam-backyard' &&
        action.targetState.streaming === false)
    )
  }

  const isAccessAction = (action: ProposedAction) => {
    return (
      (action.deviceId === 'dev-lock-entry' &&
        action.targetState.locked === false) ||
      (action.deviceId === 'dev-garage-main' &&
        action.targetState.closed === false) ||
      (action.deviceId === 'dev-alarm-system' &&
        action.targetState.armed === false)
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <ListFilter className="w-4 h-4 text-indigo-400" />
          <span>Extracted Proposed Actions ({actions.length})</span>
        </div>
        <span className="text-[11px] text-slate-500">
          Click Edit to modify action parameters and revalidate
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actions.map((action) => {
          const hazardous = isHazardousAction(action)
          const access = isAccessAction(action)

          return (
            <div
              key={action.id}
              className={`p-3.5 rounded-xl border transition-all ${
                hazardous
                  ? 'bg-rose-950/20 border-rose-500/40'
                  : access
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-slate-900/80 border-slate-700/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-white">
                      {action.deviceName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {action.room}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {action.description}
                  </p>
                </div>

                {/* Edit & Remove CTAs */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setEditingAction(action)}
                    type="button"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                    title="Edit action parameters"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeProposedAction(action.id)}
                    type="button"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Remove action"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status and parameter tag */}
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1.5">
                  {hazardous ? (
                    <span className="inline-flex items-center text-rose-400">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Critical Hazard
                    </span>
                  ) : access ? (
                    <span className="inline-flex items-center text-amber-400">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Requires Approval
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-emerald-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Safe Action
                    </span>
                  )}

                  {action.isEdited && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                      Edited
                    </span>
                  )}
                </div>

                <span className="text-slate-400 font-mono text-[10px]">
                  {Object.entries(action.targetState)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(' | ')}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      {editingAction && (
        <ActionEditModal
          action={editingAction}
          isOpen={!!editingAction}
          onClose={() => setEditingAction(null)}
          onSave={(id: string, updatedState: DeviceState, updatedDesc: string) =>
            updateProposedAction(id, updatedState, updatedDesc)
          }
        />
      )}
    </div>
  )
}
