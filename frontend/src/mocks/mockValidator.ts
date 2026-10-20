/**
 * Routine Intent Guard - Frontend Mock Validator
 * 
 * NOTE & ARCHITECTURAL DISCLAIMER:
 * This client-side mock evaluation engine is strictly for rapid frontend prototyping
 * and hackathon demonstration purposes.
 * The authoritative, deterministic policy validation engine is hosted on the
 * Python + FastAPI backend. Once the shared API contract is integrated, calls from
 * this service layer will route directly to the backend validator endpoint.
 */

import type {
  ProposedAction,
  ValidationResult,
  PolicyViolation,
  ValidationStatus,
} from '../types/routine'

export interface EvaluationOutcome {
  actions: ProposedAction[]
  validation: ValidationResult
}

export async function evaluateRoutineIntent(
  prompt: string
): Promise<EvaluationOutcome> {
  // Simulate network roundtrip latency to mirror API responsiveness
  await new Promise((resolve) => setTimeout(resolve, 450))

  const lower = prompt.toLowerCase()
  const violations: PolicyViolation[] = []
  const actions: ProposedAction[] = []

  // Rule 1: High-hazard thermal appliance (Oven)
  if (lower.includes('oven') || lower.includes('bake') || lower.includes('preheat')) {
    actions.push({
      id: 'act-oven',
      deviceId: 'dev-oven-kitchen',
      deviceName: 'Kitchen Smart Oven',
      room: 'Kitchen',
      description: 'Power on oven element to 450°F',
      targetState: { power: true, temperature: 450, active: true },
    })

    violations.push({
      id: 'viol-fire-01',
      ruleCode: 'RULE-FIRE-001',
      title: 'Unattended Thermal Element Hazard',
      explanation:
        'Safety regulations strictly prohibit remote activation of cooking and high-heat heating elements without verified physical human presence.',
      severity: 'critical',
      suggestedRemedy:
        'Remove unattended oven preheating from automated routine. Oven must be ignited manually.',
      affectedDeviceIds: ['dev-oven-kitchen'],
    })
  }

  // Rule 2: Security Camera / Sensor Deactivation
  if (
    lower.includes('camera') ||
    lower.includes('turn off camera') ||
    lower.includes('disable camera') ||
    lower.includes('security cameras')
  ) {
    actions.push({
      id: 'act-cam',
      deviceId: 'dev-cam-backyard',
      deviceName: 'Backyard Security Camera',
      room: 'Exterior',
      description: 'Disable continuous video streaming and motion recording',
      targetState: { streaming: false },
    })

    violations.push({
      id: 'viol-sec-02',
      ruleCode: 'RULE-SEC-002',
      title: 'Perimeter Blindspot Vulnerability',
      explanation:
        'Deactivating exterior surveillance while away creates an unprotected perimeter breach risk.',
      severity: 'critical',
      suggestedRemedy:
        'Keep camera feeds active or restrict privacy mode to designated interior living spaces only.',
      affectedDeviceIds: ['dev-cam-backyard'],
    })
  }

  // Rule 3: Physical Entry Access (Locks & Garage)
  if (lower.includes('unlock') || lower.includes('open garage') || lower.includes('disarm')) {
    if (lower.includes('unlock') || lower.includes('front door')) {
      actions.push({
        id: 'act-lock',
        deviceId: 'dev-lock-entry',
        deviceName: 'Front Door Smart Lock',
        room: 'Entryway',
        description: 'Unlock deadbolt for exterior entry',
        targetState: { locked: false },
      })
    }

    if (lower.includes('garage')) {
      actions.push({
        id: 'act-garage',
        deviceId: 'dev-garage-main',
        deviceName: '2-Car Garage Door',
        room: 'Garage',
        description: 'Open garage door vehicle bay',
        targetState: { closed: false, locked: false },
      })
    }

    if (lower.includes('disarm') || lower.includes('alarm')) {
      actions.push({
        id: 'act-alarm',
        deviceId: 'dev-alarm-system',
        deviceName: 'Perimeter Alarm System',
        room: 'Security Hub',
        description: 'Disarm perimeter intrusion detection',
        targetState: { armed: false, mode: 'disarmed' },
      })
    }

    violations.push({
      id: 'viol-access-03',
      ruleCode: 'RULE-PERIMETER-003',
      title: 'Automated Physical Perimeter Entry Warning',
      explanation:
        'Unlocking primary ingress points and disarming alarms automatically exposes home assets to unauthorized physical entry.',
      severity: 'high',
      suggestedRemedy:
        'Configure temporary auto-relock timer (e.g. 5 minutes) or require two-step biometric owner approval.',
      affectedDeviceIds: ['dev-lock-entry', 'dev-garage-main', 'dev-alarm-system'],
    })
  }

  // Safe Actions: Lighting
  if (lower.includes('light') || lower.includes('dim') || lower.includes('nightlight')) {
    if (lower.includes('living room') || lower.includes('dim')) {
      actions.push({
        id: 'act-light-living',
        deviceId: 'dev-light-living',
        deviceName: 'Living Room Ceiling Lights',
        room: 'Living Room',
        description: 'Dim brightness to 15%',
        targetState: { power: true, brightness: 15 },
      })
    }

    if (lower.includes('bedroom') || lower.includes('nightlight')) {
      actions.push({
        id: 'act-light-bed',
        deviceId: 'dev-light-bed',
        deviceName: 'Master Bedroom Nightlight',
        room: 'Master Bedroom',
        description: 'Turn on soft nightlight at 20%',
        targetState: { power: true, brightness: 20 },
      })
    }
  }

  // Safe Actions: Thermostat
  if (lower.includes('thermostat') || lower.includes('temp') || lower.includes('68') || lower.includes('72')) {
    const target = lower.includes('68') ? 68 : 72
    actions.push({
      id: 'act-thermo',
      deviceId: 'dev-thermo-hall',
      deviceName: 'Hallway Smart Thermostat',
      room: 'Hallway',
      description: `Adjust climate target to ${target}°F`,
      targetState: { targetTemperature: target, mode: 'cool' },
    })
  }

  // Default fallback if no specific keywords matched
  if (actions.length === 0) {
    actions.push({
      id: 'act-generic-lights',
      deviceId: 'dev-light-living',
      deviceName: 'Living Room Ceiling Lights',
      room: 'Living Room',
      description: 'Optimize ambient brightness level',
      targetState: { power: true, brightness: 50 },
    })
  }

  // Determine Overall Status based on violations
  const hasCritical = violations.some((v) => v.severity === 'critical')
  const hasHighOrMedium = violations.some(
    (v) => v.severity === 'high' || v.severity === 'medium'
  )

  let status: ValidationStatus = 'VALID'
  let summary = 'Routine validated safely. No security or hazard violations detected.'
  let canApprove = true
  let requiresExplicitConfirmation = false

  if (hasCritical) {
    status = 'BLOCKED'
    summary =
      'Routine execution BLOCKED due to critical safety or home security policy violations.'
    canApprove = false
    requiresExplicitConfirmation = false
  } else if (hasHighOrMedium) {
    status = 'NEEDS_APPROVAL'
    summary =
      'Routine contains sensitive security actions. Explicit homeowner approval required prior to execution.'
    canApprove = true
    requiresExplicitConfirmation = true
  }

  return {
    actions,
    validation: {
      status,
      summary,
      violations,
      canApprove,
      requiresExplicitConfirmation,
      validatedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    },
  }
}
