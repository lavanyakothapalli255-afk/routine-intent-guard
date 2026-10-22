import React from 'react'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { useRoutine } from '../../context/RoutineContext'
import { PRESET_SCENARIOS } from '../../mocks/scenarios'

export const RoutineInputPanel: React.FC = () => {
  const {
    currentPrompt,
    setCurrentPrompt,
    isValidating,
    analyzeCurrentPrompt,
    loadScenario,
  } = useRoutine()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    analyzeCurrentPrompt()
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/60">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">
            Natural-Language Routine Instruction
          </h3>
        </div>
        <span className="text-xs text-slate-400">Alexa+ Simulated Input</span>
      </div>

      {/* Preset Scenario Quick-Pick Chips */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Quick-Test Preset Scenarios:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {PRESET_SCENARIOS.map((scenario) => {
            const isMatch = currentPrompt === scenario.prompt
            const getBadgeColor = () => {
              switch (scenario.status) {
                case 'VALID':
                  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                case 'NEEDS_APPROVAL':
                  return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                case 'BLOCKED':
                  return 'text-rose-400 bg-rose-500/10 border-rose-500/30'
              }
            }

            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => loadScenario(scenario)}
                className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                  isMatch
                    ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 border-slate-700/70 hover:border-slate-600 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200">
                    {scenario.title}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor()}`}
                  >
                    {scenario.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  {scenario.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            rows={3}
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Describe your desired smart-home routine (e.g. 'Good Night: Turn off living room lights and set thermostat to 68°F')..."
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Type a custom routine or click a preset to simulate intent validation.
          </p>

          <button
            type="submit"
            disabled={isValidating || !currentPrompt.trim()}
            className={`w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-md shadow-indigo-600/20 transition-all ${
              isValidating ? 'cursor-wait' : 'disabled:cursor-not-allowed'
            }`}
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating Intent...
              </>
            ) : (
              <>
                Analyze Routine
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
