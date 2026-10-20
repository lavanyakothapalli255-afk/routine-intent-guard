import type { Device } from '../types/routine'

export const INITIAL_DEVICES: Device[] = [
  {
    id: 'dev-lock-entry',
    name: 'Front Door Smart Lock',
    room: 'Entryway',
    type: 'lock',
    status: 'online',
    batteryLevel: 94,
    state: {
      locked: true,
    },
    lastUpdated: '2 mins ago',
  },
  {
    id: 'dev-light-living',
    name: 'Living Room Ceiling Lights',
    room: 'Living Room',
    type: 'light',
    status: 'online',
    state: {
      power: true,
      brightness: 75,
    },
    lastUpdated: '10 mins ago',
  },
  {
    id: 'dev-thermo-hall',
    name: 'Hallway Smart Thermostat',
    room: 'Hallway',
    type: 'thermostat',
    status: 'online',
    state: {
      temperature: 71,
      targetTemperature: 72,
      mode: 'cool',
    },
    lastUpdated: 'Just now',
  },
  {
    id: 'dev-cam-backyard',
    name: 'Backyard Security Camera',
    room: 'Exterior',
    type: 'camera',
    status: 'online',
    batteryLevel: 82,
    state: {
      streaming: true,
      motionDetected: false,
    },
    lastUpdated: '1 min ago',
  },
  {
    id: 'dev-oven-kitchen',
    name: 'Kitchen Smart Oven',
    room: 'Kitchen',
    type: 'oven',
    status: 'online',
    state: {
      power: false,
      temperature: 0,
      active: false,
    },
    lastUpdated: '1 hour ago',
  },
  {
    id: 'dev-garage-main',
    name: '2-Car Garage Door',
    room: 'Garage',
    type: 'garage',
    status: 'online',
    state: {
      closed: true,
      locked: true,
    },
    lastUpdated: '15 mins ago',
  },
  {
    id: 'dev-light-bed',
    name: 'Master Bedroom Nightlight',
    room: 'Master Bedroom',
    type: 'light',
    status: 'online',
    state: {
      power: false,
      brightness: 20,
    },
    lastUpdated: '3 hours ago',
  },
  {
    id: 'dev-alarm-system',
    name: 'Perimeter Alarm System',
    room: 'Security Hub',
    type: 'alarm',
    status: 'online',
    state: {
      armed: true,
      mode: 'home',
    },
    lastUpdated: '5 mins ago',
  },
]
