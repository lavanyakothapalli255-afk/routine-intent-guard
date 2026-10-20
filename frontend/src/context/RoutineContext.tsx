import React, { createContext, useContext, useState } from 'react'
import type {
  Device,
  DeviceState,
  ProposedAction,
  ValidationResult,
  AuditLogEntry,
  PresetScenario,
} from '../types/routine'
import { INITIAL_DEVICES } from '../mocks/devices'
import { PRESET_SCENARIOS, INITIAL_AUDIT_LOGS } from '../mocks/scenarios'
import { evaluateRoutineIntent } from '../mocks/mockValidator'

interface RoutineContextType {
  devices: Device[]
  currentPrompt: string
  setCurrentPrompt: (prompt: string) => void
  isValidating: boolean
  isExecuting: boolean
  executionFeedback: string | null
  proposedActions: ProposedAction[]
  validationResult: ValidationResult | null
  auditLogs: AuditLogEntry[]
  loadScenario: (scenario: PresetScenario) => void
  analyzeCurrentPrompt: (customPrompt?: string) => Promise<void>
  updateProposedAction: (
    actionId: string,
    updatedState: DeviceState,
    updatedDescription: string
  ) => void
  removeProposedAction: (actionId: string) => void
  executeCurrentRoutine: () => Promise<void>
  cancelCurrentRoutine: () => void
  resetEnvironment: () => void
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined)

export const RoutineProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES)
  const [currentPrompt, setCurrentPrompt] = useState<string>(
    PRESET_SCENARIOS[0].prompt
  )
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [executionFeedback, setExecutionFeedback] = useState<string | null>(null)
  const [proposedActions, setProposedActions] = useState<ProposedAction[]>([])
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null)
  const [auditLogs, setAuditLogs] =
    useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS)

  // Analyze routine intent using mock validator
  const analyzeCurrentPrompt = async (customPrompt?: string) => {
    const promptToUse = customPrompt ?? currentPrompt
    if (!promptToUse.trim()) return

    setIsValidating(true)
    setExecutionFeedback(null)

    try {
      const outcome = await evaluateRoutineIntent(promptToUse)
      setProposedActions(outcome.actions)
      setValidationResult(outcome.validation)
    } finally {
      setIsValidating(false)
    }
  }

  // Quick-load preset scenario and automatically trigger evaluation
  const loadScenario = async (scenario: PresetScenario) => {
    setCurrentPrompt(scenario.prompt)
    setExecutionFeedback(null)
    setIsValidating(true)
    try {
      const outcome = await evaluateRoutineIntent(scenario.prompt)
      setProposedActions(outcome.actions)
      setValidationResult(outcome.validation)
    } finally {
      setIsValidating(false)
    }
  }

  // Inline edit an action and dynamically trigger re-evaluation
  const updateProposedAction = (
    actionId: string,
    updatedState: DeviceState,
    updatedDescription: string
  ) => {
    const updated = proposedActions.map((act) => {
      if (act.id === actionId) {
        return {
          ...act,
          targetState: updatedState,
          description: updatedDescription,
          isEdited: true,
        }
      }
      return act
    })
    setProposedActions(updated)

    // Re-check if dangerous state was mitigated
    const hasRemainingHazard = updated.some(
      (a) =>
        (a.deviceId === 'dev-oven-kitchen' && a.targetState.power === true) ||
        (a.deviceId === 'dev-cam-backyard' && a.targetState.streaming === false)
    )

    const hasPerimeterAccess = updated.some(
      (a) =>
        (a.deviceId === 'dev-lock-entry' && a.targetState.locked === false) ||
        (a.deviceId === 'dev-garage-main' && a.targetState.closed === false) ||
        (a.deviceId === 'dev-alarm-system' && a.targetState.armed === false)
    )

    if (validationResult) {
      if (!hasRemainingHazard && !hasPerimeterAccess) {
        setValidationResult({
          ...validationResult,
          status: 'VALID',
          summary: 'Routine revalidated: Hazard mitigated. All proposed actions are now safe.',
          violations: [],
          canApprove: true,
          requiresExplicitConfirmation: false,
          validatedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        })
      } else if (!hasRemainingHazard && hasPerimeterAccess) {
        setValidationResult({
          ...validationResult,
          status: 'NEEDS_APPROVAL',
          summary: 'Revalidated: Critical hazards resolved. Perimeter access still requires approval.',
          violations: validationResult.violations.filter(
            (v) => v.severity !== 'critical'
          ),
          canApprove: true,
          requiresExplicitConfirmation: true,
          validatedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        })
      }
    }
  }

  const removeProposedAction = (actionId: string) => {
    const updated = proposedActions.filter((act) => act.id !== actionId)
    setProposedActions(updated)
    // If no actions left, reset
    if (updated.length === 0) {
      setValidationResult(null)
    }
  }

  // Simulate routine execution: update virtual devices and write to audit log
  const executeCurrentRoutine = async () => {
    if (!validationResult || validationResult.status === 'BLOCKED') return

    setIsExecuting(true)
    setExecutionFeedback(null)

    // Simulate execution step delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const appliedChanges: { deviceName: string; change: string }[] = []

    // Apply action updates to local devices
    setDevices((prevDevices) =>
      prevDevices.map((dev) => {
        const action = proposedActions.find((a) => a.deviceId === dev.id)
        if (action) {
          const changeText = Object.entries(action.targetState)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
          appliedChanges.push({ deviceName: dev.name, change: changeText })

          return {
            ...dev,
            state: {
              ...dev.state,
              ...action.targetState,
            },
            lastUpdated: 'Just now (Routine Execution)',
          }
        }
        return dev
      })
    )

    // Append to audit log
    const newLogEntry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: 'Just now',
      prompt: currentPrompt,
      status: validationResult.status,
      actionsCount: proposedActions.length,
      decision:
        validationResult.status === 'NEEDS_APPROVAL'
          ? 'approved_and_executed'
          : 'executed',
      details:
        validationResult.status === 'NEEDS_APPROVAL'
          ? 'Executed with explicit homeowner authorization.'
          : 'Executed safely with intent guard clearance.',
      appliedChanges,
    }

    setAuditLogs((prev) => [newLogEntry, ...prev])
    setIsExecuting(false)
    setExecutionFeedback(
      `Successfully simulated execution of ${proposedActions.length} device actions!`
    )
  }

  const cancelCurrentRoutine = () => {
    if (validationResult) {
      const cancelEntry: AuditLogEntry = {
        id: `audit-${Date.now()}`,
        timestamp: 'Just now',
        prompt: currentPrompt,
        status: validationResult.status,
        actionsCount: proposedActions.length,
        decision: 'cancelled',
        details: 'User cancelled routine proposal prior to execution.',
      }
      setAuditLogs((prev) => [cancelEntry, ...prev])
    }
    setProposedActions([])
    setValidationResult(null)
    setExecutionFeedback('Routine proposal cancelled.')
  }

  const resetEnvironment = () => {
    setDevices(INITIAL_DEVICES)
    setProposedActions([])
    setValidationResult(null)
    setExecutionFeedback('Simulated smart-home devices reset to default states.')
  }

  return (
    <RoutineContext.Provider
      value={{
        devices,
        currentPrompt,
        setCurrentPrompt,
        isValidating,
        isExecuting,
        executionFeedback,
        proposedActions,
        validationResult,
        auditLogs,
        loadScenario,
        analyzeCurrentPrompt,
        updateProposedAction,
        removeProposedAction,
        executeCurrentRoutine,
        cancelCurrentRoutine,
        resetEnvironment,
      }}
    >
      {children}
    </RoutineContext.Provider>
  )
}

export const useRoutine = () => {
  const context = useContext(RoutineContext)
  if (!context) {
    throw new Error('useRoutine must be used within a RoutineProvider')
  }
  return context
}
