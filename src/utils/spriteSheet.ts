/**
 * Sprite sheet slicing and magenta background removal utilities
 */

export interface SliceOptions {
  rows: number
  cols: number
}

export interface MagentaRemovalOptions {
  /** Color tolerance for magenta detection (0-255). Default 30. */
  tolerance?: number
}

export interface MagentaCleanupOptions {
  /** Expand transparent mask by N pixels to remove halos. Default 0. */
  expansion?: number
  /** Remove magenta spill on edge pixels (0-255). Default 0. */
  despill?: number
  /** Set RGB to 0 for transparent pixels. Default false. */
  neutralize?: boolean
  /** Use flood fill from edges (true) or global replacement (false). Default true. */
  useFloodFill?: boolean
}

export function cloneImageData(imageData: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
}

export function getDefaultMagentaCleanupOptions(tolerance: number): Required<MagentaCleanupOptions> {
  const despill = Math.max(12, Math.round(tolerance * 0.2))
  return {
    expansion: 2,
    despill,
    neutralize: true,
  }
}

/**
 * Check if a pixel is magenta-ish using HSL hue detection
 * Magenta hue is around 300° (range: 270°-330°)
 * This is more robust against JPEG compression artifacts
 */
function isMagenta(r: number, g: number, b: number, tolerance = 30): boolean {
  // Normalize to 0-1
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  // Must have some saturation (not grayscale)
  // Higher tolerance = more lenient saturation requirement
  const saturationThreshold = Math.max(0.15, 0.5 - tolerance / 255)
  if (max === 0 || delta / max < saturationThreshold) {
    return false
  }

  // Must be reasonably bright
  const lightnessThreshold = Math.max(0.3, 0.6 - tolerance / 255)
  if ((max + min) / 2 < lightnessThreshold) {
    return false
  }

  // Calculate hue (0-360)
  let hue: number
  if (delta === 0) {
    return false
  }
  else if (max === rn) {
    hue = 60 * (((gn - bn) / delta) % 6)
  }
  else if (max === gn) {
    hue = 60 * ((bn - rn) / delta + 2)
  }
  else {
    hue = 60 * ((rn - gn) / delta + 4)
  }

  if (hue < 0)
    hue += 360

  // Magenta hue range: 270°-330° (with tolerance extension)
  // Higher tolerance = wider hue range
  const hueMargin = 30 + tolerance / 5
  const minHue = 300 - hueMargin
  const maxHue = 300 + hueMargin

  // Check if hue is in magenta range (handle wrap-around)
  if (maxHue > 360) {
    return hue >= minHue || hue <= maxHue - 360
  }
  return hue >= minHue && hue <= maxHue
}

function isMagentaSpill(r: number, g: number, b: number, spillThreshold: number): boolean {
  if (spillThreshold <= 0)
    return false

  if (r < 100 || b < 100)
    return false

  if (Math.abs(r - b) > 40)
    return false

  const strength = (r + b) / 2 - g
  return strength >= spillThreshold
}

const dx8 = [1, 1, 1, 0, 0, -1, -1, -1]
const dy8 = [1, 0, -1, 1, -1, 1, 0, -1]

/**
 * Apply expansion and despill to the mask
 */
function applyExpansionAndDespill(
  data: Uint8ClampedArray,
  mask: Uint8Array,
  width: number,
  height: number,
  expansion: number,
  despill: number,
  neutralize: boolean,
): void {
  if (expansion > 0) {
    for (let i = 0; i < expansion; i++) {
      const nextSeeds: number[] = []
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (mask[y * width + x] === 1) {
            for (let j = 0; j < 8; j++) {
              const nx = x + dx8[j]
              const ny = y + dy8[j]
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx
                if (mask[nIdx] === 0) {
                  nextSeeds.push(nx, ny)
                }
              }
            }
          }
        }
      }

      for (let s = 0; s < nextSeeds.length; s += 2) {
        const sx = nextSeeds[s]
        const sy = nextSeeds[s + 1]
        mask[sy * width + sx] = 1
      }
    }
  }

  // Apply mask to image data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (mask[idx] === 1) {
        const base = idx * 4
        data[base + 3] = 0
        if (neutralize) {
          data[base] = 0
          data[base + 1] = 0
          data[base + 2] = 0
        }
      }
    }
  }

  if (despill > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        const base = idx * 4
        const alpha = data[base + 3]
        if (alpha === 0)
          continue

        let adjacentToMask = false
        for (let n = 0; n < 8; n++) {
          const nx = x + dx8[n]
          const ny = y + dy8[n]
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (mask[ny * width + nx] === 1) {
              adjacentToMask = true
              break
            }
          }
        }

        if (!adjacentToMask)
          continue

        const r = data[base]
        const g = data[base + 1]
        const b = data[base + 2]
        if (isMagentaSpill(r, g, b, despill)) {
          data[base + 3] = 0
          mask[idx] = 1
          if (neutralize) {
            data[base] = 0
            data[base + 1] = 0
            data[base + 2] = 0
          }
        }
      }
    }
  }

  if (neutralize) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) {
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
    }
  }
}

/**
 * Remove magenta background using flood fill from edges or global replacement
 * Similar approach to removeWhiteBackground but for magenta color
 */
export function removeMagentaBackground(
  imageData: ImageData,
  tolerance = 30,
  options: MagentaCleanupOptions = {},
): void {
  const { data, width, height } = imageData
  const { expansion = 0, despill = 0, neutralize = false, useFloodFill = true } = options

  // Global replacement mode: simply replace all magenta pixels
  if (!useFloodFill) {
    // Build mask for expansion/despill processing
    const mask = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        const base = idx * 4
        if (isMagenta(data[base], data[base + 1], data[base + 2], tolerance)) {
          mask[idx] = 1
          data[base + 3] = 0
          if (neutralize) {
            data[base] = 0
            data[base + 1] = 0
            data[base + 2] = 0
          }
        }
      }
    }

    // Apply expansion and despill for global mode too
    applyExpansionAndDespill(data, mask, width, height, expansion, despill, neutralize)
    return
  }

  // Flood fill mode: start from edges
  const visited = new Uint8Array(width * height)
  const queue: number[] = []

  const checkMagenta = (x: number, y: number) => {
    const idx = (y * width + x) * 4
    return isMagenta(data[idx], data[idx + 1], data[idx + 2], tolerance)
  }

  // Seed from edges
  for (let x = 0; x < width; x++) {
    if (checkMagenta(x, 0) && !visited[x]) {
      queue.push(x, 0)
      visited[x] = 1
    }
    const bottomIdx = (height - 1) * width + x
    if (checkMagenta(x, height - 1) && !visited[bottomIdx]) {
      queue.push(x, height - 1)
      visited[bottomIdx] = 1
    }
  }
  for (let y = 1; y < height - 1; y++) {
    if (checkMagenta(0, y) && !visited[y * width]) {
      queue.push(0, y)
      visited[y * width] = 1
    }
    const rightIdx = y * width + (width - 1)
    if (checkMagenta(width - 1, y) && !visited[rightIdx]) {
      queue.push(width - 1, y)
      visited[rightIdx] = 1
    }
  }

  // Flood fill
  let head = 0
  const dx = [1, -1, 0, 0]
  const dy = [0, 0, 1, -1]

  while (head < queue.length) {
    const x = queue[head++]
    const y = queue[head++]

    for (let i = 0; i < 4; i++) {
      const nx = x + dx[i]
      const ny = y + dy[i]
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx
        if (!visited[nIdx] && checkMagenta(nx, ny)) {
          visited[nIdx] = 1
          queue.push(nx, ny)
        }
      }
    }
  }

  const mask = new Uint8Array(visited)

  applyExpansionAndDespill(data, mask, width, height, expansion, despill, neutralize)
}

/**
 * Slice a sprite sheet into a 2D grid of ImageData
 * Returns ImageData[row][col]
 */
export function sliceSpriteSheet(
  image: HTMLImageElement | HTMLCanvasElement,
  options: SliceOptions,
): ImageData[][] {
  const { rows, cols } = options
  const canvas = document.createElement('canvas')
  const imgWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width
  const imgHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height
  canvas.width = imgWidth
  canvas.height = imgHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  ctx.drawImage(image, 0, 0)

  const cellWidth = Math.floor(imgWidth / cols)
  const cellHeight = Math.floor(imgHeight / rows)

  const result: ImageData[][] = []

  for (let row = 0; row < rows; row++) {
    const rowData: ImageData[] = []
    for (let col = 0; col < cols; col++) {
      const x = col * cellWidth
      const y = row * cellHeight
      const imageData = ctx.getImageData(x, y, cellWidth, cellHeight)
      rowData.push(imageData)
    }
    result.push(rowData)
  }

  return result
}

/**
 * Process sprite sheet: slice only (no background removal)
 * Background removal should be done after cropping for better edge detection
 * Returns raw ImageData[row][col]
 */
export function processSpriteSheet(
  image: HTMLImageElement,
  sliceOptions: SliceOptions,
  _magentaOptions: MagentaRemovalOptions = {},
): ImageData[][] {
  // Only slice, no background removal here
  // Background removal is deferred to after cropping
  return sliceSpriteSheet(image, sliceOptions)
}

/**
 * Convert ImageData to canvas data URL
 */
export function imageDataToDataURL(imageData: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Convert ImageData to canvas (for GIF encoding)
 */
export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * Remove semi-transparent white watermark using reverse alpha blending
 * Based on the formula: original = (blended - watermark * alpha) / (1 - alpha)
 * For white watermarks (RGB=255): original = (blended - 255 * alpha) / (1 - alpha)
 *
 * Reference: https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending
 */
export function removeWatermark(
  imageData: ImageData,
  watermarkAlpha = 0.35,
): void {
  const { data } = imageData

  // Precompute constants
  const wa = watermarkAlpha
  const oneMinusAlpha = 1 - wa
  const watermarkContribution = 255 * wa

  for (let i = 0; i < data.length; i += 4) {
    // Skip fully transparent pixels
    if (data[i + 3] === 0)
      continue

    // Apply reverse alpha blending to RGB channels
    for (let c = 0; c < 3; c++) {
      const blended = data[i + c]
      // Reverse formula: original = (blended - 255 * alpha) / (1 - alpha)
      const original = (blended - watermarkContribution) / oneMinusAlpha
      // Clamp to valid range
      data[i + c] = Math.max(0, Math.min(255, Math.round(original)))
    }
  }
}

/**
 * Crop ImageData from center to target size
 * If source is smaller than target, the result will be centered with transparent padding
 */
export function cropFromCenter(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number,
): ImageData {
  const { width: srcWidth, height: srcHeight } = imageData

  // If already at target size, return as-is
  if (srcWidth === targetWidth && srcHeight === targetHeight) {
    return imageData
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  // Clear with transparent background
  ctx.clearRect(0, 0, targetWidth, targetHeight)

  // Create temp canvas with source image
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = srcWidth
  srcCanvas.height = srcHeight
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.putImageData(imageData, 0, 0)

  // Calculate source region (from center)
  const srcCenterX = srcWidth / 2
  const srcCenterY = srcHeight / 2

  // How much of the source to take (limited by source size)
  const cropWidth = Math.min(srcWidth, targetWidth)
  const cropHeight = Math.min(srcHeight, targetHeight)

  // Source coordinates (centered)
  const sx = srcCenterX - cropWidth / 2
  const sy = srcCenterY - cropHeight / 2

  // Destination coordinates (centered in target)
  const dx = (targetWidth - cropWidth) / 2
  const dy = (targetHeight - cropHeight) / 2

  ctx.drawImage(srcCanvas, sx, sy, cropWidth, cropHeight, dx, dy, cropWidth, cropHeight)

  return ctx.getImageData(0, 0, targetWidth, targetHeight)
}
