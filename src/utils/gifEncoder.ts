/**
 * GIF encoding wrapper using modern-gif
 */

import type { GeminiWatermarkEngine } from './geminiWatermark'
import { encode } from 'modern-gif'
import { cloneImageData, cropFromCenter, getDefaultMagentaCleanupOptions, removeMagentaBackground } from './spriteSheet'

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
  /** Enable watermark removal. Default false. */
  enableWatermarkRemoval?: boolean
  /** Gemini watermark engine instance for proper watermark removal. */
  watermarkEngine?: GeminiWatermarkEngine | null
  /** Use flood fill algorithm for background removal. Default true. */
  useFloodFill?: boolean
  /** Per-frame flood fill settings. If provided, overrides useFloodFill for each frame. */
  perFrameFloodFill?: boolean[]
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
  const {
    delay = 83,
    loop = true,
    width,
    height,
    tolerance = 30,
    enableWatermarkRemoval = false,
    watermarkEngine = null,
    useFloodFill = true,
    perFrameFloodFill,
  } = options

  // Apply center cropping + background removal if output size is specified
  const processedFrames = (width && height)
    ? frames.map((frame, idx) => {
        const frameUseFloodFill = perFrameFloodFill?.[idx] ?? useFloodFill
        const cleanup = {
          ...getDefaultMagentaCleanupOptions(tolerance),
          useFloodFill: frameUseFloodFill,
        }
        const cleaned = cloneImageData(frame)
        if (enableWatermarkRemoval && watermarkEngine) {
          watermarkEngine.removeWatermark(cleaned)
        }
        removeMagentaBackground(cleaned, tolerance, cleanup)
        return cropFromCenter(cleaned, width, height)
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
