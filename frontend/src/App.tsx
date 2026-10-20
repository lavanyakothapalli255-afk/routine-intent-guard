import React from 'react'
import { RoutineProvider, useRoutine } from './context/RoutineContext'
import { Navbar } from './components/layout/Navbar'
import { DeviceOverview } from './components/dashboard/DeviceOverview'
import { RoutineInputPanel } from './components/routine/RoutineInputPanel'
import { ValidationBanner } from './components/validation/ValidationBanner'
import { ViolationList } from './components/validation/ViolationList'
import { ProposedActionsList } from './components/routine/ProposedActionsList'
import { ExecutionPanel } from './components/execution/ExecutionPanel'
import { AuditHistory } from './components/audit/AuditHistory'
import { ShieldCheck, ShieldAlert, Cpu } from 'lucide-react'

const DashboardContent: React.FC = () => {
  const { validationResult, proposedActions, isValidating } = useRoutine()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* 1. Simulated Smart-Home Devices Dashboard */}
        <DeviceOverview />

        {/* 2. Routine Intent & Policy Validation Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Interactive Column */}
          <div className="lg:col-span-8 space-y-5">
            {/* Natural-Language Routine Input & Presets */}
            <RoutineInputPanel />

            {/* Validation Feedback & Violations */}
            {validationResult && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <ValidationBanner validation={validationResult} />

                {validationResult.violations.length > 0 && (
                  <ViolationList violations={validationResult.violations} />
                )}

                {/* Proposed Actions List with inline edit & delete capabilities */}
                {proposedActions.length > 0 && (
                  <ProposedActionsList actions={proposedActions} />
                )}

                {/* Simulated Execution & Approval Controls */}
                <ExecutionPanel />
              </div>
            )}

            {!validationResult && !isValidating && (
              <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300">
                  No Active Routine Under Evaluation
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Type a custom routine command above or select one of the quick-test presets to inspect safety policies and simulated device outcomes.
                </p>
              </div>
            )}
          </div>

          {/* Side Info & Guard Policies Card */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Policy Engine Rules
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Active safety & security invariants
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-rose-400">
                      RULE-FIRE-001
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Critical
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-200">
                    Thermal Appliance Restriction
                  </p>
                  <p className="text-[11px] text-slate-400">
                    High-heat elements (e.g. ovens) cannot be activated unattended without verified physical presence.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-rose-400">
                      RULE-SEC-002
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Critical
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-200">
                    Perimeter Blindspot Protection
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Exterior surveillance cameras and motion monitors cannot be deactivated in automated routines.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-amber-400">
                      RULE-PERIMETER-003
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      High Warning
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-200">
                    Ingress Entry & Alarm Override
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Unlocking deadbolts, opening garage bays, or disarming alarm zones requires explicit homeowner confirmation.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Authoritative validation will be verified against the deterministic Python backend service.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Simulated Activity & Audit History */}
        <AuditHistory />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>
          Routine Intent Guard • Amazon Developer Hackathon 2026 (Alexa+ Track) • Simulated Experience
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <RoutineProvider>
      <DashboardContent />
    </RoutineProvider>
  )
}
