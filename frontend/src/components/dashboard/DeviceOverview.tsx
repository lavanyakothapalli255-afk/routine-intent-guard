import React, { useState } from 'react'
import { LayoutGrid, CheckCircle } from 'lucide-react'
import { useRoutine } from '../../context/RoutineContext'
import { DeviceCard } from './DeviceCard'

export const DeviceOverview: React.FC = () => {
  const { devices, proposedActions } = useRoutine()
  const [selectedRoom, setSelectedRoom] = useState<string>('All')

  // Extract unique rooms
  const rooms = ['All', ...Array.from(new Set(devices.map((d) => d.room)))]

  // Filter devices
  const filteredDevices =
    selectedRoom === 'All'
      ? devices
      : devices.filter((d) => d.room === selectedRoom)

  // Set of device IDs that are currently targeted by proposed actions
  const targetedDeviceIds = new Set(proposedActions.map((a) => a.deviceId))

  return (
    <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 shadow-sm">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Simulated Device Overview
            </h3>
            <p className="text-xs text-slate-400">
              Virtual home environment state reflecting real-time routine execution
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            {devices.length} Online
          </span>
          {targetedDeviceIds.size > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-medium">
              {targetedDeviceIds.size} Target Action{targetedDeviceIds.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Room Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-3 scrollbar-none">
        {rooms.map((room) => (
          <button
            key={room}
            onClick={() => setSelectedRoom(room)}
            type="button"
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedRoom === room
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            }`}
          >
            {room}
          </button>
        ))}
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-1">
        {filteredDevices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            highlighted={targetedDeviceIds.has(device.id)}
          />
        ))}
      </div>
    </section>
  )
}
