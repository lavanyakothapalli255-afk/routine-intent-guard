/**
 * Type definitions matching the authoritative Python FastAPI models
 * in backend/app/models.py.
 */

export type BackendValidationStatus = 'VALID' | 'NEEDS_APPROVAL' | 'BLOCKED'

export type BackendViolationCode =
  | 'UNKNOWN_DEVICE'
  | 'UNSUPPORTED_ACTION'
  | 'EXCLUDED_DEVICE'
  | 'EXCLUDED_ROOM'
  | 'OUT_OF_SCOPE'
  | 'REQUIRES_APPROVAL'

export interface BackendProposedAction {
  device_id: string
  action: string
  parameters?: Record<string, any>
}

export interface BackendRoutineProposal {
  routine_id: string
  user_instruction: string
  included_rooms?: string[] | null
  included_devices?: string[] | null
  excluded_rooms?: string[]
  excluded_devices?: string[]
  actions: BackendProposedAction[]
  force?: boolean
  approved?: boolean
}

export interface BackendDevice {
  id: string
  room: string
  supported_actions: string[]
  current_state: Record<string, any>
}

export interface RoutineValidationRequest {
  proposal: BackendRoutineProposal
  devices: BackendDevice[] | Record<string, BackendDevice>
}

export interface BackendValidationResult {
  status: BackendValidationStatus
  violation_codes: string[]
  explanations: string[]
  affected_device_ids: string[]
}

export interface HealthResponse {
  status: string
  service: string
}
