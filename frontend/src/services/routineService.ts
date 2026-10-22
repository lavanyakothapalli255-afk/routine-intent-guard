import type {
  BackendDevice,
  BackendRoutineProposal,
  BackendValidationResult,
  HealthResponse,
  RoutineValidationRequest,
} from '../types/backend'
import type {
  Device,
  PolicyViolation,
  Severity,
  ValidationResult,
} from '../types/routine'

// In dev, Vite proxies /api to http://127.0.0.1:8000
const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) || '/api'
const DIRECT_BACKEND_URL = 'http://127.0.0.1:8000'

/**
 * Perform a health check against the Python FastAPI backend.
 * Tries the Vite proxy endpoint first, and falls back to direct URL if needed.
 */
export async function checkBackendHealth(): Promise<{
  isOnline: boolean
  service?: string
  error?: string
}> {
  const endpoints = [`${API_BASE_URL}/health`, `${DIRECT_BACKEND_URL}/health`]

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      if (response.ok) {
        const data: HealthResponse = await response.json()
        if (data.status === 'ok') {
          return { isOnline: true, service: data.service }
        }
      }
    } catch {
      // Continue to next endpoint attempt
    }
  }

  return {
    isOnline: false,
    error: 'Python FastAPI server is not responding at port 8000',
  }
}

/**
 * Converts a frontend Device model to the BackendDevice schema expected by FastAPI.
 */
export function deviceToBackendDevice(device: Device): BackendDevice {
  return {
    id: device.id,
    room: device.room,
    supported_actions: device.supportedActions || [],
    current_state: device.state,
  }
}

/**
 * Validates a structured routine proposal against the authoritative Python guard.
 * Does NOT fall back to mock validation if the backend is down.
 */
export async function validateRoutineWithBackend(
  proposal: BackendRoutineProposal,
  devices: Device[]
): Promise<BackendValidationResult> {
  const payload: RoutineValidationRequest = {
    proposal,
    devices: devices.map(deviceToBackendDevice),
  }

  const endpoints = [
    `${API_BASE_URL}/routine/validate`,
    `${DIRECT_BACKEND_URL}/routine/validate`,
  ]

  let lastError: Error | null = null

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result: BackendValidationResult = await response.json()
        return result
      } else {
        const errBody = await response.text()
        throw new Error(
          `Backend returned HTTP ${response.status}: ${errBody || response.statusText}`
        )
      }
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw new Error(
    `Failed to reach Python backend: ${lastError?.message || 'Connection refused at port 8000'}`
  )
}

/**
 * Maps the authoritative BackendValidationResult to the frontend's ValidationResult format.
 */
export function mapBackendResultToValidationResult(
  result: BackendValidationResult
): ValidationResult {
  const violations: PolicyViolation[] = []

  result.explanations.forEach((explanation, idx) => {
    const code = result.violation_codes[idx] || result.violation_codes[0] || 'UNKNOWN_RULE'
    const affectedId = result.affected_device_ids[idx] || result.affected_device_ids[0] || ''

    let severity: Severity = 'critical'
    let title = 'Policy Rule Violation'
    let suggestedRemedy: string | undefined

    switch (code) {
      case 'REQUIRES_APPROVAL':
        severity = 'high'
        title = 'Security-Sensitive Action Approval Required'
        suggestedRemedy =
          'Operations altering physical entry barriers or disarming alarms require explicit homeowner authorization.'
        break
      case 'UNSUPPORTED_ACTION':
        severity = 'critical'
        title = 'Unsupported Device Action'
        suggestedRemedy =
          'The requested operation is not supported by device firmware or is restricted by safety policy (e.g. unattended oven heating).'
        break
      case 'EXCLUDED_DEVICE':
        severity = 'critical'
        title = 'Prohibited Device Target'
        suggestedRemedy =
          'This device is explicitly prohibited from automated modification (e.g. exterior security camera while away).'
        break
      case 'EXCLUDED_ROOM':
        severity = 'critical'
        title = 'Prohibited Room Target'
        suggestedRemedy = 'Actions in this room are prohibited by routine scope.'
        break
      case 'OUT_OF_SCOPE':
        severity = 'high'
        title = 'Out of Scope Action'
        suggestedRemedy = 'Device or room is outside the specified routine scope.'
        break
      case 'UNKNOWN_DEVICE':
        severity = 'critical'
        title = 'Unrecognized Device ID'
        suggestedRemedy = 'Target device is not found in the smart-home catalogue.'
        break
      default:
        severity = result.status === 'BLOCKED' ? 'critical' : 'high'
        title = `Guard Constraint (${code})`
        suggestedRemedy = 'Adjust routine parameters to satisfy policy rules.'
        break
    }

    violations.push({
      id: `viol-backend-${idx}`,
      ruleCode: code,
      title,
      explanation,
      severity,
      suggestedRemedy,
      affectedDeviceIds: affectedId ? [affectedId] : [],
    })
  })

  let summary = ''
  if (result.status === 'VALID') {
    summary =
      'Authoritative Python Validator: Routine validated safely. 0 policy violations detected.'
  } else if (result.status === 'NEEDS_APPROVAL') {
    summary =
      'Authoritative Python Validator: Routine contains security-sensitive actions. Explicit homeowner approval required.'
  } else {
    summary =
      'Authoritative Python Validator: Routine execution BLOCKED due to policy violations.'
  }

  return {
    status: result.status,
    summary,
    violations,
    canApprove: result.status !== 'BLOCKED',
    requiresExplicitConfirmation: result.status === 'NEEDS_APPROVAL',
    validatedAt: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    backendValidated: true,
    violationCodes: result.violation_codes,
  }
}
