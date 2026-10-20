import React from 'react'
import {
  Lock,
  Unlock,
  Lightbulb,
  Thermometer,
  Video,
  Flame,
  Home,
  ShieldAlert,
  Battery,
  CircleDot,
} from 'lucide-react'
import type { Device } from '../../types/routine'

interface DeviceCardProps {
  device: Device
  highlighted?: boolean
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  highlighted = false,
}) => {
  const getDeviceIcon = () => {
    switch (device.type) {
      case 'lock':
        return device.state.locked ? (
          <Lock className="w-5 h-5 text-emerald-400" />
        ) : (
          <Unlock className="w-5 h-5 text-amber-400" />
        )
      case 'light':
        return (
          <Lightbulb
            className={`w-5 h-5 ${
              device.state.power ? 'text-amber-300' : 'text-slate-500'
            }`}
          />
        )
      case 'thermostat':
        return <Thermometer className="w-5 h-5 text-cyan-400" />
      case 'camera':
        return (
          <Video
            className={`w-5 h-5 ${
              device.state.streaming ? 'text-indigo-400' : 'text-rose-400'
            }`}
          />
        )
      case 'oven':
        return (
          <Flame
            className={`w-5 h-5 ${
              device.state.power ? 'text-rose-500 animate-pulse' : 'text-slate-500'
            }`}
          />
        )
      case 'garage':
        return <Home className="w-5 h-5 text-blue-400" />
      case 'alarm':
        return (
          <ShieldAlert
            className={`w-5 h-5 ${
              device.state.armed ? 'text-emerald-400' : 'text-amber-400'
            }`}
          />
        )
      default:
        return <CircleDot className="w-5 h-5 text-slate-400" />
    }
  }

  // Render meaningful state summary
  const renderStateBadge = () => {
    switch (device.type) {
      case 'lock':
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              device.state.locked
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}
          >
            {device.state.locked ? 'Locked' : 'Unlocked'}
          </span>
        )
      case 'light':
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              device.state.power
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {device.state.power ? `ON (${device.state.brightness}%)` : 'OFF'}
          </span>
        )
      case 'thermostat':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            {device.state.temperature}°F (Target: {device.state.targetTemperature}°F)
          </span>
        )
      case 'camera':
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              device.state.streaming
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}
          >
            {device.state.streaming ? 'Streaming' : 'Disabled'}
          </span>
        )
      case 'oven':
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              device.state.power
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {device.state.power ? `ACTIVE (${device.state.temperature}°F)` : 'OFF'}
          </span>
        )
      case 'garage':
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              device.state.closed
                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}
          >
            {device.state.closed ? 'Closed & Locked' : 'Open'}
          </span>
        )
      case 'alarm':
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              device.state.armed
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}
          >
            {device.state.armed ? `Armed (${device.state.mode})` : 'Disarmed'}
          </span>
        )
      default:
        return (
          <span className="text-xs text-slate-400">
            {JSON.stringify(device.state)}
          </span>
        )
    }
  }

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        highlighted
          ? 'bg-indigo-950/30 border-indigo-500 shadow-md shadow-indigo-500/10'
          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/70 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900/80 border border-slate-700 flex items-center justify-center shrink-0">
            {getDeviceIcon()}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white leading-tight">
              {device.name}
            </h4>
            <span className="text-xs text-slate-400">{device.room}</span>
          </div>
        </div>

        {/* Battery or status indicator */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          {device.batteryLevel !== undefined && (
            <span className="inline-flex items-center space-x-1 text-slate-400">
              <Battery className="w-3.5 h-3.5 text-slate-400" />
              <span>{device.batteryLevel}%</span>
            </span>
          )}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Online" />
        </div>
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
        <span className="text-xs text-slate-400">Current State:</span>
        {renderStateBadge()}
      </div>

      <div className="mt-2 text-right">
        <span className="text-[10px] text-slate-500">{device.lastUpdated}</span>
      </div>
    </div>
  )
}
