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

/**
 * Check if a pixel is magenta (#ff00ff)
 * Magenta: R≈255, G≈0, B≈255
 */
function isMagenta(r: number, g: number, b: number, tolerance = 30): boolean {
  return r >= 255 - tolerance && g <= tolerance && b >= 255 - tolerance
}

/**
 * Remove magenta background using flood fill from edges
 * Similar approach to removeWhiteBackground but for magenta color
 */
export function removeMagentaBackground(
  imageData: ImageData,
  tolerance = 30,
): void {
  const { data, width, height } = imageData
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
    data[(y * width + x) * 4 + 3] = 0 // Set alpha to 0

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
}

/**
 * Slice a sprite sheet into a 2D grid of ImageData
 * Returns ImageData[row][col]
 */
export function sliceSpriteSheet(
  image: HTMLImageElement,
  options: SliceOptions,
): ImageData[][] {
  const { rows, cols } = options
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  ctx.drawImage(image, 0, 0)

  const cellWidth = Math.floor(image.naturalWidth / cols)
  const cellHeight = Math.floor(image.naturalHeight / rows)

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
