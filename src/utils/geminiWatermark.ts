/**
 * Gemini AI Watermark Removal using Reverse Alpha Blending
 *
 * Based on the algorithm from:
 * https://github.com/journey-ad/gemini-watermark-remover
 *
 * Gemini adds watermark: watermarked = α × logo + (1 - α) × original
 * Reverse solve: original = (watermarked - α × logo) / (1 - α)
 */

import watermark48Url from '../assets/gemini_watermark_48.png'
import watermark96Url from '../assets/gemini_watermark_96.png'

// Constants
const ALPHA_THRESHOLD = 0.002 // Ignore very small alpha values (noise)
const MAX_ALPHA = 0.99 // Avoid division by near-zero values
const LOGO_VALUE = 255 // Color value for white watermark

export interface WatermarkConfig {
  logoSize: number
  marginRight: number
  marginBottom: number
}

export interface WatermarkPosition {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Detect watermark configuration based on image size
 * Gemini's watermark rules:
 * - If both image width and height are greater than 1024, use 96×96 watermark
 * - Otherwise, use 48×48 watermark
 */
export function detectWatermarkConfig(imageWidth: number, imageHeight: number): WatermarkConfig {
  if (imageWidth > 1024 && imageHeight > 1024) {
    return {
      logoSize: 96,
      marginRight: 64,
      marginBottom: 64,
    }
  }
  else {
    return {
      logoSize: 48,
      marginRight: 32,
      marginBottom: 32,
    }
  }
}

/**
 * Calculate watermark position in image
 */
export function calculateWatermarkPosition(
  imageWidth: number,
  imageHeight: number,
  config: WatermarkConfig,
): WatermarkPosition {
  const { logoSize, marginRight, marginBottom } = config

  return {
    x: imageWidth - marginRight - logoSize,
    y: imageHeight - marginBottom - logoSize,
    width: logoSize,
    height: logoSize,
  }
}

/**
 * Calculate alpha map from background captured image
 * For each pixel, take the maximum value of the three RGB channels and normalize to [0, 1]
 */
function calculateAlphaMap(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData
  const alphaMap = new Float32Array(width * height)

  for (let i = 0; i < alphaMap.length; i++) {
    const idx = i * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]

    // Take the maximum value of the three RGB channels as the brightness value
    const maxChannel = Math.max(r, g, b)

    // Normalize to [0, 1] range
    alphaMap[i] = maxChannel / 255.0
  }

  return alphaMap
}

/**
 * Remove watermark using reverse alpha blending
 */
function applyReverseAlphaBlending(
  imageData: ImageData,
  alphaMap: Float32Array,
  position: WatermarkPosition,
): void {
  const { x, y, width, height } = position

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      // Calculate index in original image (RGBA format, 4 bytes per pixel)
      const imgIdx = ((y + row) * imageData.width + (x + col)) * 4

      // Calculate index in alpha map
      const alphaIdx = row * width + col

      // Get alpha value
      let alpha = alphaMap[alphaIdx]

      // Skip very small alpha values (noise)
      if (alpha < ALPHA_THRESHOLD) {
        continue
      }

      // Limit alpha value to avoid division by near-zero
      alpha = Math.min(alpha, MAX_ALPHA)
      const oneMinusAlpha = 1.0 - alpha

      // Apply reverse alpha blending to each RGB channel
      for (let c = 0; c < 3; c++) {
        const watermarked = imageData.data[imgIdx + c]

        // Reverse alpha blending formula
        const original = (watermarked - alpha * LOGO_VALUE) / oneMinusAlpha

        // Clip to [0, 255] range
        imageData.data[imgIdx + c] = Math.max(0, Math.min(255, Math.round(original)))
      }
    }
  }
}

/**
 * Gemini Watermark Engine
 * Handles loading alpha maps and removing watermarks
 */
export class GeminiWatermarkEngine {
  private alphaMaps: Map<number, Float32Array> = new Map()
  private watermarkImages: Map<number, HTMLImageElement> = new Map()
  private initialized = false

  /**
   * Initialize the engine by loading watermark images
   */
  async init(): Promise<void> {
    if (this.initialized)
      return

    const [img48, img96] = await Promise.all([
      this.loadImage(watermark48Url),
      this.loadImage(watermark96Url),
    ])

    this.watermarkImages.set(48, img48)
    this.watermarkImages.set(96, img96)
    this.initialized = true
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  /**
   * Get alpha map for the specified watermark size
   */
  private getAlphaMap(size: number): Float32Array {
    // Return cached alpha map if available
    const cached = this.alphaMaps.get(size)
    if (cached)
      return cached

    const img = this.watermarkImages.get(size)
    if (!img) {
      throw new Error(`Watermark image for size ${size} not loaded`)
    }

    // Create temporary canvas to extract ImageData
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    const imageData = ctx.getImageData(0, 0, size, size)
    const alphaMap = calculateAlphaMap(imageData)

    // Cache result
    this.alphaMaps.set(size, alphaMap)

    return alphaMap
  }

  /**
   * Remove Gemini watermark from an image
   */
  removeWatermark(imageData: ImageData): void {
    if (!this.initialized) {
      throw new Error('Engine not initialized. Call init() first.')
    }

    const { width, height } = imageData

    // Detect watermark configuration
    const config = detectWatermarkConfig(width, height)
    const position = calculateWatermarkPosition(width, height, config)

    // Get alpha map for watermark size
    const alphaMap = this.getAlphaMap(config.logoSize)

    // Apply reverse alpha blending
    applyReverseAlphaBlending(imageData, alphaMap, position)
  }

  /**
   * Get watermark information for display
   */
  getWatermarkInfo(imageWidth: number, imageHeight: number): {
    size: number
    position: WatermarkPosition
    config: WatermarkConfig
  } {
    const config = detectWatermarkConfig(imageWidth, imageHeight)
    const position = calculateWatermarkPosition(imageWidth, imageHeight, config)

    return {
      size: config.logoSize,
      position,
      config,
    }
  }
}

// Singleton instance
let engineInstance: GeminiWatermarkEngine | null = null

/**
 * Get the singleton Gemini watermark engine instance
 */
export async function getGeminiWatermarkEngine(): Promise<GeminiWatermarkEngine> {
  if (!engineInstance) {
    engineInstance = new GeminiWatermarkEngine()
    await engineInstance.init()
  }
  return engineInstance
}
