import { nanoid } from 'nanoid'

/**
 * Generate a unique ID using nanoid
 * More reliable than Math.random() with collision resistance
 */
export function generateId(): string {
  return nanoid()
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
