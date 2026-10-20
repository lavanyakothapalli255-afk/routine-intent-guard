import type { PresetScenario, AuditLogEntry } from '../types/routine'

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'scenario-valid',
    title: 'Good Night Routine',
    description: 'Safe ambient adjustments without physical security or thermal risk',
    status: 'VALID',
    prompt: 'Good Night: Dim living room lights to 15%, set thermostat to 68°F, and turn on the bedroom nightlight.',
  },
  {
    id: 'scenario-needs-approval',
    title: 'Courier Delivery Access',
    description: 'Unattended exterior entry requiring explicit confirmation',
    status: 'NEEDS_APPROVAL',
    prompt: 'Courier Delivery: Unlock the front door, open garage door slightly, and disarm perimeter alarm for 10 minutes.',
  },
  {
    id: 'scenario-blocked',
    title: 'Hazardous Energy Saver',
    description: 'Critical fire hazard and blind-spot security vulnerability',
    status: 'BLOCKED',
    prompt: 'Away Routine: Turn on kitchen oven to 450°F to preheat dinner and turn off all exterior security cameras.',
  },
]

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-101',
    timestamp: 'Today at 08:30 AM',
    prompt: 'Morning Routine: Set thermostat to 72°F and turn on living room lights.',
    status: 'VALID',
    actionsCount: 2,
    decision: 'executed',
    details: 'Routine validated with 0 policy violations and successfully simulated.',
    appliedChanges: [
      { deviceName: 'Hallway Smart Thermostat', change: 'Set target to 72°F' },
      { deviceName: 'Living Room Ceiling Lights', change: 'Turned ON (75%)' },
    ],
  },
  {
    id: 'audit-102',
    timestamp: 'Yesterday at 11:15 PM',
    prompt: 'Late Night Lockdown: Lock all doors and arm security alarm.',
    status: 'VALID',
    actionsCount: 2,
    decision: 'executed',
    details: 'Verified high-security intent compliance.',
    appliedChanges: [
      { deviceName: 'Front Door Smart Lock', change: 'LOCKED' },
      { deviceName: 'Perimeter Alarm System', change: 'ARMED (Home)' },
    ],
  },
  {
    id: 'audit-103',
    timestamp: 'Yesterday at 04:20 PM',
    prompt: 'Guest Arrival: Unlock front door and deactivate garage lock.',
    status: 'NEEDS_APPROVAL',
    actionsCount: 2,
    decision: 'approved_and_executed',
    details: 'User acknowledged physical perimeter override warning.',
    appliedChanges: [
      { deviceName: 'Front Door Smart Lock', change: 'UNLOCKED' },
    ],
  },
  {
    id: 'audit-104',
    timestamp: '2 days ago at 02:00 PM',
    prompt: 'Automated Baking: Turn on oven to 400°F unattended.',
    status: 'BLOCKED',
    actionsCount: 1,
    decision: 'blocked',
    details: 'Rejected under RULE-FIRE-001 (Thermal Appliance Safety Policy).',
  },
]
