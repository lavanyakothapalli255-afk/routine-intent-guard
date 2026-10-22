export type DeviceType =
  | 'lock'
  | 'camera'
  | 'thermostat'
  | 'light'
  | 'oven'
  | 'garage'
  | 'alarm'
  | 'sensor'

export type DeviceStatus = 'online' | 'offline' | 'warning'

export interface DeviceState {
  power?: boolean
  locked?: boolean
  temperature?: number
  targetTemperature?: number
  mode?: string
  brightness?: number
  streaming?: boolean
  motionDetected?: boolean
  closed?: boolean
  armed?: boolean
  active?: boolean
  [key: string]: string | number | boolean | undefined
}

export interface Device {
  id: string
  name: string
  room: string
  type: DeviceType
  state: DeviceState
  status: DeviceStatus
  batteryLevel?: number
  lastUpdated: string
  supportedActions: string[]
}

export type ValidationStatus = 'VALID' | 'NEEDS_APPROVAL' | 'BLOCKED'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface PolicyViolation {
  id: string
  ruleCode: string
  title: string
  explanation: string
  severity: Severity
  suggestedRemedy?: string
  affectedDeviceIds: string[]
}

export interface ProposedAction {
  id: string
  deviceId: string
  deviceName: string
  room: string
  description: string
  targetState: DeviceState
  actionName?: string
  parameters?: Record<string, any>
  isEdited?: boolean
}

export interface ValidationResult {
  status: ValidationStatus
  summary: string
  violations: PolicyViolation[]
  canApprove: boolean
  requiresExplicitConfirmation: boolean
  validatedAt: string
  backendValidated?: boolean
  violationCodes?: string[]
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  prompt: string
  status: ValidationStatus
  actionsCount: number
  decision: 'executed' | 'cancelled' | 'blocked' | 'approved_and_executed'
  details: string
  appliedChanges?: { deviceName: string; change: string }[]
}

export interface PresetScenario {
  id: string
  title: string
  description: string
  status: ValidationStatus
  prompt: string
  routineId: string
  actions: ProposedAction[]
  excludedDevices?: string[]
  excludedRooms?: string[]
}
