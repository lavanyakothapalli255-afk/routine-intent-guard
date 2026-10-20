import React from 'react'
import { ShieldCheck, RotateCcw, Sparkles } from 'lucide-react'
import { useRoutine } from '../../context/RoutineContext'

export const Navbar: React.FC = () => {
  const { resetEnvironment } = useRoutine()

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Track */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">
                Routine Intent Guard
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Alexa+ Track 2026
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Simulated Smart-Home Routine Safety & Policy Validation
            </p>
          </div>
        </div>

        {/* Environment status & actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Environment:</span>
            <span className="font-medium text-emerald-400">Simulated Smart-Home</span>
          </div>

          <button
            onClick={resetEnvironment}
            type="button"
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors shadow-sm"
            title="Reset devices to initial states"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Reset Devices
          </button>
        </div>
      </div>

      {/* Prototype Boundary Disclaimer Bar */}
      <div className="bg-indigo-950/40 border-t border-indigo-900/40 px-4 py-1.5 text-center text-xs text-indigo-300/90 flex items-center justify-center space-x-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>
          <strong>Prototype Simulation:</strong> Authoritative policy enforcement runs on the Python FastAPI validator. No real physical devices are controlled.
        </span>
      </div>
    </header>
  )
}
