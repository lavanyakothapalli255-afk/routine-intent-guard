import React, { createContext, useContext, useEffect, useState } from 'react'
import type {
  Device,
  DeviceState,
  ProposedAction,
  ValidationResult,
  AuditLogEntry,
  PresetScenario,
} from '../types/routine'
import type { BackendRoutineProposal } from '../types/backend'
import { INITIAL_DEVICES } from '../mocks/devices'
import { PRESET_SCENARIOS, INITIAL_AUDIT_LOGS } from '../mocks/scenarios'
import {
  checkBackendHealth,
  validateRoutineWithBackend,
  mapBackendResultToValidationResult,
} from '../services/routineService'

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
  backendOnline: boolean | null
  backendError: string | null
  refreshBackendStatus: () => Promise<void>
  loadScenario: (scenario: PresetScenario) => Promise<void>
  analyzeCurrentPrompt: (customPrompt?: string) => Promise<void>
  updateProposedAction: (
    actionId: string,
    updatedState: DeviceState,
    updatedDescription: string
  ) => Promise<void>
  removeProposedAction: (actionId: string) => Promise<void>
  isExecuted: boolean
  executeCurrentRoutine: (confirmedApproval?: boolean) => Promise<void>
  cancelCurrentRoutine: () => void
  resetEnvironment: () => void
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined)

/**
 * Helper to build candidate actions for freeform custom user instructions.
 */
function parseCustomPromptToActions(prompt: string): ProposedAction[] {
  const lower = prompt.toLowerCase()
  const actions: ProposedAction[] = []

  if (lower.includes('oven') || lower.includes('bake') || lower.includes('preheat')) {
    actions.push({
      id: 'act-oven-kitchen',
      deviceId: 'dev-oven-kitchen',
      deviceName: 'Kitchen Smart Oven',
      room: 'Kitchen',
      actionName: 'preheat',
      description: 'Power on oven element to 450°F',
      targetState: { power: true, temperature: 450, active: true },
      parameters: { temperature: 450 },
    })
  }

  if (
    lower.includes('camera') ||
    lower.includes('turn off camera') ||
    lower.includes('disable camera') ||
    lower.includes('security cameras')
  ) {
    actions.push({
      id: 'act-cam-backyard',
      deviceId: 'dev-cam-backyard',
      deviceName: 'Backyard Security Camera',
      room: 'Exterior',
      actionName: 'turn_off',
      description: 'Disable exterior security camera video stream',
      targetState: { streaming: false },
    })
  }

  if (lower.includes('unlock') || lower.includes('front door')) {
    actions.push({
      id: 'act-lock-entry',
      deviceId: 'dev-lock-entry',
      deviceName: 'Front Door Smart Lock',
      room: 'Entryway',
      actionName: 'unlock',
      description: 'Unlock front door deadbolt for exterior entry',
      targetState: { locked: false },
      parameters: { timeout_minutes: 10 },
    })
  }

  if (lower.includes('garage')) {
    actions.push({
      id: 'act-garage-main',
      deviceId: 'dev-garage-main',
      deviceName: '2-Car Garage Door',
      room: 'Garage',
      actionName: 'open_garage',
      description: 'Open garage vehicle bay',
      targetState: { closed: false, locked: false },
    })
  }

  if (lower.includes('alarm') || lower.includes('disarm')) {
    actions.push({
      id: 'act-alarm-system',
      deviceId: 'dev-alarm-system',
      deviceName: 'Perimeter Alarm System',
      room: 'Security Hub',
      actionName: 'disarm',
      description: 'Disarm perimeter intrusion alarm system',
      targetState: { armed: false, mode: 'disarmed' },
    })
  }

  if (lower.includes('light') || lower.includes('dim') || lower.includes('living room')) {
    actions.push({
      id: 'act-light-living',
      deviceId: 'dev-light-living',
      deviceName: 'Living Room Ceiling Lights',
      room: 'Living Room',
      actionName: lower.includes('dim') ? 'dim' : 'turn_on',
      description: 'Adjust living room ceiling brightness to 15%',
      targetState: { power: true, brightness: 15 },
      parameters: { brightness: 15 },
    })
  }

  if (lower.includes('thermostat') || lower.includes('temp') || lower.includes('68') || lower.includes('72')) {
    const target = lower.includes('68') ? 68 : 72
    actions.push({
      id: 'act-thermo-hall',
      deviceId: 'dev-thermo-hall',
      deviceName: 'Hallway Smart Thermostat',
      room: 'Hallway',
      actionName: 'set_temperature',
      description: `Adjust thermostat climate target to ${target}°F`,
      targetState: { targetTemperature: target, mode: 'cool' },
      parameters: { target_temperature: target },
    })
  }

  if (actions.length === 0) {
    actions.push({
      id: 'act-generic-light',
      deviceId: 'dev-light-living',
      deviceName: 'Living Room Ceiling Lights',
      room: 'Living Room',
      actionName: 'turn_on',
      description: 'Turn on living room lighting',
      targetState: { power: true, brightness: 50 },
    })
  }

  return actions
}

export const RoutineProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES)
  const [currentPrompt, setCurrentPrompt] = useState<string>(
    PRESET_SCENARIOS[0].prompt
  )
  const [activeRoutineId, setActiveRoutineId] = useState<string>(
    PRESET_SCENARIOS[0].routineId
  )
  const [activeExcludedDevices, setActiveExcludedDevices] = useState<string[]>(
    PRESET_SCENARIOS[0].excludedDevices || []
  )
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  const [isExecuted, setIsExecuted] = useState<boolean>(false)
  const [executionFeedback, setExecutionFeedback] = useState<string | null>(null)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [proposedActions, setProposedActions] = useState<ProposedAction[]>([])
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null)
  const [auditLogs, setAuditLogs] =
    useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS)

  // Check backend health on initial mount
  const refreshBackendStatus = async () => {
    const health = await checkBackendHealth()
    setBackendOnline(health.isOnline)
    if (health.isOnline) {
      setBackendError(null)
    } else {
      setBackendError(
        'Python FastAPI backend is offline. Start it on port 8000 using: uvicorn app.main:app --app-dir backend --port 8000'
      )
    }
  }

  useEffect(() => {
    refreshBackendStatus()
  }, [])

  // Analyze routine intent by calling the authoritative FastAPI backend
  const analyzeCurrentPrompt = async (customPrompt?: string) => {
    const promptToUse = customPrompt ?? currentPrompt
    if (!promptToUse.trim()) return

    setIsExecuted(false)
    setIsValidating(true)
    setExecutionFeedback(null)
    setBackendError(null)

    // Match against preset scenarios or build custom candidate actions
    const matchedPreset = PRESET_SCENARIOS.find(
      (s) => s.prompt.trim() === promptToUse.trim()
    )

    const actionsToValidate = matchedPreset
      ? matchedPreset.actions
      : parseCustomPromptToActions(promptToUse)

    const routineId = matchedPreset ? matchedPreset.routineId : `routine-${Date.now()}`
    const excludedDevices = matchedPreset?.excludedDevices || []

    setActiveRoutineId(routineId)
    setActiveExcludedDevices(excludedDevices)
    setProposedActions(actionsToValidate)

    const proposal: BackendRoutineProposal = {
      routine_id: routineId,
      user_instruction: promptToUse,
      actions: actionsToValidate.map((a) => ({
        device_id: a.deviceId,
        action: a.actionName || 'turn_on',
        parameters: a.parameters || {},
      })),
      excluded_devices: excludedDevices,
      excluded_rooms: [],
    }

    try {
      const backendRes = await validateRoutineWithBackend(proposal, devices)
      setBackendOnline(true)
      const mapped = mapBackendResultToValidationResult(backendRes)
      setValidationResult(mapped)
    } catch (err: any) {
      setBackendOnline(false)
      setValidationResult(null)
      setBackendError(
        `Backend Validation Failed: ${err.message || 'Cannot reach Python backend server at http://127.0.0.1:8000'}`
      )
    } finally {
      setIsValidating(false)
    }
  }

  // Load a preset scenario and validate against the backend
  const loadScenario = async (scenario: PresetScenario) => {
    setIsExecuted(false)
    setCurrentPrompt(scenario.prompt)
    setActiveRoutineId(scenario.routineId)
    setActiveExcludedDevices(scenario.excludedDevices || [])
    setProposedActions(scenario.actions)
    setExecutionFeedback(null)
    setBackendError(null)
    setIsValidating(true)

    const proposal: BackendRoutineProposal = {
      routine_id: scenario.routineId,
      user_instruction: scenario.prompt,
      actions: scenario.actions.map((a) => ({
        device_id: a.deviceId,
        action: a.actionName || 'turn_on',
        parameters: a.parameters || {},
      })),
      excluded_devices: scenario.excludedDevices || [],
      excluded_rooms: scenario.excludedRooms || [],
    }

    try {
      const backendRes = await validateRoutineWithBackend(proposal, devices)
      setBackendOnline(true)
      const mapped = mapBackendResultToValidationResult(backendRes)
      setValidationResult(mapped)
    } catch (err: any) {
      setBackendOnline(false)
      setValidationResult(null)
      setBackendError(
        `Backend Validation Failed: ${err.message || 'Cannot reach Python backend server at http://127.0.0.1:8000'}`
      )
    } finally {
      setIsValidating(false)
    }
  }

  // Inline edit an action and immediately re-validate with the authoritative backend
  const updateProposedAction = async (
    actionId: string,
    updatedState: DeviceState,
    updatedDescription: string
  ) => {
    setIsExecuted(false)
    const updated = proposedActions.map((act) => {
      if (act.id === actionId) {
        let actionName = act.actionName || 'turn_on'
        let parameters = { ...act.parameters }
        let finalDescription = updatedDescription

        // Derive authoritative backend action name based on edited target state
        if (act.deviceId === 'dev-oven-kitchen') {
          actionName = updatedState.power ? 'preheat' : 'turn_off'
          parameters = updatedState.power ? { temperature: 450 } : {}
          if (!updatedState.power && updatedDescription.includes('Preheat')) {
            finalDescription = 'Ensure kitchen oven heating element is OFF (Safe)'
          } else if (updatedState.power && updatedDescription.includes('Ensure')) {
            finalDescription = 'Preheat kitchen oven to 450°F unattended'
          }
        } else if (act.deviceId === 'dev-cam-backyard') {
          actionName = updatedState.streaming ? 'stream' : 'turn_off'
        } else if (act.deviceId === 'dev-lock-entry') {
          actionName = updatedState.locked ? 'lock' : 'unlock'
        } else if (act.deviceId === 'dev-garage-main') {
          actionName = updatedState.closed ? 'close_garage' : 'open_garage'
        } else if (act.deviceId === 'dev-alarm-system') {
          actionName = updatedState.armed ? 'arm' : 'disarm'
        } else if (act.deviceId === 'dev-thermo-hall') {
          actionName = 'set_temperature'
          parameters = { target_temperature: updatedState.targetTemperature || 68 }
        }

        return {
          ...act,
          targetState: updatedState,
          description: finalDescription,
          actionName,
          parameters,
          isEdited: true,
        }
      }
      return act
    })

    setProposedActions(updated)
    setIsValidating(true)
    setBackendError(null)

    // Check if camera is still targeted for deactivation
    const cameraDeactivated = updated.some(
      (a) => a.deviceId === 'dev-cam-backyard' && a.actionName === 'turn_off'
    )
    const activeExclusions = cameraDeactivated
      ? Array.from(new Set([...activeExcludedDevices, 'dev-cam-backyard']))
      : activeExcludedDevices.filter((id) => id !== 'dev-cam-backyard')

    const proposal: BackendRoutineProposal = {
      routine_id: activeRoutineId,
      user_instruction: currentPrompt,
      actions: updated.map((a) => ({
        device_id: a.deviceId,
        action: a.actionName || 'turn_on',
        parameters: a.parameters || {},
      })),
      excluded_devices: activeExclusions,
      excluded_rooms: [],
    }

    try {
      const backendRes = await validateRoutineWithBackend(proposal, devices)
      setBackendOnline(true)
      const mapped = mapBackendResultToValidationResult(backendRes)
      setValidationResult(mapped)
    } catch (err: any) {
      setBackendOnline(false)
      setValidationResult(null)
      setBackendError(
        `Backend Revalidation Failed: ${err.message || 'Cannot reach Python backend server at http://127.0.0.1:8000'}`
      )
    } finally {
      setIsValidating(false)
    }
  }

  const removeProposedAction = async (actionId: string) => {
    setIsExecuted(false)
    const updated = proposedActions.filter((act) => act.id !== actionId)
    setProposedActions(updated)

    if (updated.length === 0) {
      setValidationResult(null)
      return
    }

    setIsValidating(true)
    const cameraDeactivated = updated.some(
      (a) => a.deviceId === 'dev-cam-backyard' && a.actionName === 'turn_off'
    )

    const proposal: BackendRoutineProposal = {
      routine_id: activeRoutineId,
      user_instruction: currentPrompt,
      actions: updated.map((a) => ({
        device_id: a.deviceId,
        action: a.actionName || 'turn_on',
        parameters: a.parameters || {},
      })),
      excluded_devices: cameraDeactivated ? ['dev-cam-backyard'] : [],
      excluded_rooms: [],
    }

    try {
      const backendRes = await validateRoutineWithBackend(proposal, devices)
      setBackendOnline(true)
      const mapped = mapBackendResultToValidationResult(backendRes)
      setValidationResult(mapped)
    } catch (err: any) {
      setBackendOnline(false)
      setBackendError(`Revalidation Failed: ${err.message}`)
    } finally {
      setIsValidating(false)
    }
  }

  // Simulate execution on virtual devices and log the audit entry
  const executeCurrentRoutine = async (confirmedApproval?: boolean) => {
    if (!validationResult || validationResult.status === 'BLOCKED') return
    if (isExecuted) return
    if (validationResult.status === 'NEEDS_APPROVAL' && !confirmedApproval) return

    setIsExecuting(true)
    setExecutionFeedback(null)

    await new Promise((resolve) => setTimeout(resolve, 600))

    // Precompute applied changes purely from actions and current devices
    const appliedChanges = proposedActions
      .map((action) => {
        const dev = devices.find((d) => d.id === action.deviceId)
        if (!dev) return null
        const changeText = Object.entries(action.targetState)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
        return { deviceName: dev.name, change: changeText }
      })
      .filter(Boolean) as { deviceName: string; change: string }[]

    // Pure state updater without side effects (prevents duplicate entries in React StrictMode)
    setDevices((prevDevices) =>
      prevDevices.map((dev) => {
        const action = proposedActions.find((a) => a.deviceId === dev.id)
        return action
          ? {
              ...dev,
              state: {
                ...dev.state,
                ...action.targetState,
              },
              lastUpdated: 'Just now (Simulated Run)',
            }
          : dev
      })
    )

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
          ? 'Validated by Python Guard API. Executed with homeowner override authorization.'
          : 'Validated safely by Python Guard API (0 violations). Simulated virtual state update.',
      appliedChanges,
    }

    setAuditLogs((prev) => [newLogEntry, ...prev])
    setIsExecuting(false)
    setIsExecuted(true)
    setExecutionFeedback(
      `Successfully simulated execution of ${proposedActions.length} device actions!`
    )
  }

  const cancelCurrentRoutine = () => {
    setIsExecuted(false)
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
    setIsExecuted(false)
    setDevices(INITIAL_DEVICES)
    setProposedActions([])
    setValidationResult(null)
    setBackendError(null)
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
        isExecuted,
        executionFeedback,
        proposedActions,
        validationResult,
        auditLogs,
        backendOnline,
        backendError,
        refreshBackendStatus,
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
