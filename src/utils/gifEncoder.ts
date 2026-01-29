/**
 * GIF encoding wrapper using modern-gif
 */

import { encode } from 'modern-gif'
import { cropFromCenter, removeMagentaBackground } from './spriteSheet'

export interface GifOptions {
  /** Frame delay in milliseconds. Default 83 (12 FPS) */
  delay?: number
  /** Whether to loop. Default true */
  loop?: boolean
  /** Output width. If specified, frames will be cropped from center. */
  width?: number
  /** Output height. If specified, frames will be cropped from center. */
  height?: number
  /** Magenta tolerance for background removal. Default 30. */
  tolerance?: number
}

/**
 * Convert ImageData to OffscreenCanvas for GIF encoding
 */
function imageDataToCanvas(imageData: ImageData): OffscreenCanvas {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height)
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * Create a GIF from an array of ImageData frames
 */
export async function createGif(
  frames: ImageData[],
  options: GifOptions = {},
): Promise<Blob> {
  const { delay = 83, loop = true, width, height, tolerance = 30 } = options

  // Apply center cropping + background removal if output size is specified
  const processedFrames = (width && height)
    ? frames.map((frame) => {
        const cropped = cropFromCenter(frame, width, height)
        removeMagentaBackground(cropped, tolerance)
        return cropped
      })
    : frames

  const outputWidth = width ?? processedFrames[0].width
  const outputHeight = height ?? processedFrames[0].height

  const gifFrames = processedFrames.map(imageData => ({
    data: imageDataToCanvas(imageData),
    delay,
  }))

  const output = await encode({
    width: outputWidth,
    height: outputHeight,
    frames: gifFrames,
    looped: loop,
  })

  return new Blob([output], { type: 'image/gif' })
}

/**
 * Calculate delay from FPS
 */
export function fpsToDelay(fps: number): number {
  return Math.round(1000 / fps)
}

/**
 * Calculate FPS from delay
 */
export function delayToFps(delay: number): number {
  return Math.round(1000 / delay)
}
