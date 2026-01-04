/**
 * Image processing utilities for removing white background and trimming margins
 */

export interface TrimBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Selection {
  x: number // Percent (0-100)
  y: number
  w: number
  h: number
}

export interface ProcessOptions {
  /** Internal white detection threshold (0-255). Default 30. */
  colorDistance?: number
  /** Whether to trim blank margins after removing background */
  trimMargins?: boolean
  /** Padding to add after trimming (in pixels) */
  padding?: number
  /** Selection area to handle closed regions */
  selection?: Selection
  /** Expansion distance in pixels to remove white halos */
  expansion?: number
}

/**
 * Enhanced background removal using Flood Fill + Selection-based Global Sampling
 */
export function removeWhiteBackground(
  imageData: ImageData,
  colorDistance = 30,
  selection?: Selection,
  expansion = 0,
): void {
  const { data, width, height } = imageData
  const threshold = 255 - colorDistance
  const visited = new Uint8Array(width * height)
  const queue: number[] = []

  const isWhite = (x: number, y: number) => {
    const idx = (y * width + x) * 4
    return data[idx] >= threshold && data[idx + 1] >= threshold && data[idx + 2] >= threshold
  }

  // 1. Initial seeds from edges (Standard Flood Fill)
  for (let x = 0; x < width; x++) {
    if (isWhite(x, 0) && !visited[x]) {
      queue.push(x, 0)
      visited[x] = 1
    }
    const bottomIdx = (height - 1) * width + x
    if (isWhite(x, height - 1) && !visited[bottomIdx]) {
      queue.push(x, height - 1)
      visited[bottomIdx] = 1
    }
  }
  for (let y = 1; y < height - 1; y++) {
    if (isWhite(0, y) && !visited[y * width]) {
      queue.push(0, y)
      visited[y * width] = 1
    }
    const rightIdx = y * width + (width - 1)
    if (isWhite(width - 1, y) && !visited[rightIdx]) {
      queue.push(width - 1, y)
      visited[rightIdx] = 1
    }
  }

  // 2. If selection exists, scan all matching pixels inside as seeds (Force global removal in box)
  if (selection) {
    const startX = Math.max(0, Math.floor((selection.x / 100) * width))
    const startY = Math.max(0, Math.floor((selection.y / 100) * height))
    const endX = Math.min(width, Math.floor(((selection.x + selection.w) / 100) * width))
    const endY = Math.min(height, Math.floor(((selection.y + selection.h) / 100) * height))

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = y * width + x
        if (!visited[idx] && isWhite(x, y)) {
          visited[idx] = 1
          queue.push(x, y)
        }
      }
    }
  }

  // 3. Run Flood Fill
  let head = 0
  const dx = [1, -1, 0, 0]
  const dy = [0, 0, 1, -1]

  while (head < queue.length) {
    const x = queue[head++]
    const y = queue[head++]
    data[(y * width + x) * 4 + 3] = 0 // Clear background pixel

    for (let i = 0; i < 4; i++) {
      const nx = x + dx[i]
      const ny = y + dy[i]
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx
        if (!visited[nIdx] && isWhite(nx, ny)) {
          visited[nIdx] = 1
          queue.push(nx, ny)
        }
      }
    }
  }

  // 4. Expansion logic: Grow the transparent mask into neighboring pixels
  if (expansion > 0) {
    const mask = new Uint8Array(visited)
    for (let i = 0; i < expansion; i++) {
      const nextSeeds: number[] = []
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (mask[y * width + x] === 1) {
            for (let j = 0; j < 4; j++) {
              const nx = x + dx[j]
              const ny = y + dy[j]
              if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx] === 0) {
                nextSeeds.push(nx, ny)
              }
            }
          }
        }
      }
      nextSeeds.forEach((_, idx) => {
        if (idx % 2 === 0) {
          const sx = nextSeeds[idx]
          const sy = nextSeeds[idx + 1]
          mask[sy * width + sx] = 1
          data[(sy * width + sx) * 4 + 3] = 0
        }
      })
    }
  }
}

/**
 * Find the bounding box of non-transparent pixels
 */
export function getTrimBounds(imageData: ImageData): TrimBounds | null {
  const { data, width, height } = imageData
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 0) {
        if (x < minX)
          minX = x
        if (x > maxX)
          maxX = x
        if (y < minY)
          minY = y
        if (y > maxY)
          maxY = y
      }
    }
  }

  if (maxX < 0 || maxY < 0)
    return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

/**
 * Process an image: remove white background and optionally trim margins
 */
export function processWhiteBackgroundImage(
  image: HTMLImageElement,
  options: ProcessOptions = {},
): string {
  const {
    colorDistance = 30,
    trimMargins = true,
    padding = 0,
    selection,
    expansion = 0,
  } = options

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  ctx.drawImage(image, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  removeWhiteBackground(imageData, colorDistance, selection, expansion)
  ctx.putImageData(imageData, 0, 0)

  if (!trimMargins) {
    return canvas.toDataURL('image/png')
  }

  const bounds = getTrimBounds(imageData)
  if (!bounds) {
    const emptyCanvas = document.createElement('canvas')
    emptyCanvas.width = 1
    emptyCanvas.height = 1
    return emptyCanvas.toDataURL('image/png')
  }

  const trimmedWidth = bounds.width + padding * 2
  const trimmedHeight = bounds.height + padding * 2

  const trimmedCanvas = document.createElement('canvas')
  trimmedCanvas.width = trimmedWidth
  trimmedCanvas.height = trimmedHeight
  const trimmedCtx = trimmedCanvas.getContext('2d')!

  trimmedCtx.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    padding,
    padding,
    bounds.width,
    bounds.height,
  )

  return trimmedCanvas.toDataURL('image/png')
}
