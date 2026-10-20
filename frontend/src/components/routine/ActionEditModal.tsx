import React, { useState } from 'react'
import { X, Check, Sliders } from 'lucide-react'
import type { ProposedAction, DeviceState } from '../../types/routine'

interface ActionEditModalProps {
  action: ProposedAction
  isOpen: boolean
  onClose: () => void
  onSave: (
    actionId: string,
    updatedState: DeviceState,
    updatedDescription: string
  ) => void
}

export const ActionEditModal: React.FC<ActionEditModalProps> = ({
  action,
  isOpen,
  onClose,
  onSave,
}) => {
  const [description, setDescription] = useState(action.description)
  const [targetState, setTargetState] = useState<DeviceState>({
    ...action.targetState,
  })

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(action.id, targetState, description)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">
              Edit Proposed Action
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Target Device
            </label>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200">
              <span className="font-semibold">{action.deviceName}</span>{' '}
              <span className="text-slate-500">({action.room})</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Action Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Quick parameter adjustments depending on device capabilities */}
          <div className="space-y-3 pt-2 border-t border-slate-700/60">
            <label className="block text-xs font-semibold text-slate-300">
              Adjust Target State Parameters:
            </label>

            {/* Oven power toggle */}
            {targetState.power !== undefined && action.deviceId === 'dev-oven-kitchen' && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                <span className="text-xs text-slate-300">Oven Heating Element:</span>
                <button
                  type="button"
                  onClick={() =>
                    setTargetState({
                      ...targetState,
                      power: !targetState.power,
                      active: !targetState.power,
                    })
                  }
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    targetState.power
                      ? 'bg-rose-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {targetState.power ? 'Keep ON (Hazardous)' : 'Turn OFF (Safe)'}
                </button>
              </div>
            )}

            {/* Lock toggle */}
            {targetState.locked !== undefined && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                <span className="text-xs text-slate-300">Deadbolt State:</span>
                <button
                  type="button"
                  onClick={() =>
                    setTargetState({
                      ...targetState,
                      locked: !targetState.locked,
                    })
                  }
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    targetState.locked
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {targetState.locked ? 'Keep Locked' : 'Unlock'}
                </button>
              </div>
            )}

            {/* Camera streaming toggle */}
            {targetState.streaming !== undefined && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                <span className="text-xs text-slate-300">Camera Feed:</span>
                <button
                  type="button"
                  onClick={() =>
                    setTargetState({
                      ...targetState,
                      streaming: !targetState.streaming,
                    })
                  }
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    targetState.streaming
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {targetState.streaming ? 'Active Streaming' : 'Disabled (Blindspot)'}
                </button>
              </div>
            )}

            {/* Thermostat target */}
            {targetState.targetTemperature !== undefined && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                <span className="text-xs text-slate-300">Target Temp:</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="60"
                    max="80"
                    value={targetState.targetTemperature}
                    onChange={(e) =>
                      setTargetState({
                        ...targetState,
                        targetTemperature: Number(e.target.value),
                      })
                    }
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-center text-white"
                  />
                  <span className="text-xs text-slate-400">°F</span>
                </div>
              </div>
            )}

            {/* Light brightness */}
            {targetState.brightness !== undefined && (
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Brightness:</span>
                  <span>{targetState.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={targetState.brightness}
                  onChange={(e) =>
                    setTargetState({
                      ...targetState,
                      brightness: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Save & Revalidate
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
