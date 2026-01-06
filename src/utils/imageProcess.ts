/**
 * Image processing utilities for removing white background and trimming margins
 */

export interface TrimBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface EraserPoint {
  x: number // Percentage (0-100)
  y: number // Percentage (0-100)
}

export interface EraserStroke {
  points: EraserPoint[]
  radius: number // Percentage (0-100)
}

export interface ProcessOptions {
  /** Internal white detection threshold (0-255). Default 30. */
  colorDistance?: number
  /** Whether to trim blank margins after removing background */
  trimMargins?: boolean
  /** Padding to add after trimming (in pixels) */
  padding?: number
  /** Eraser strokes to mark additional white areas for removal */
  eraserStrokes?: EraserStroke[]
  /** Expansion distance in pixels to remove white halos */
  expansion?: number
}

/**
 * Enhanced background removal using Flood Fill + Selection-based Global Sampling
 */
export function removeWhiteBackground(
  imageData: ImageData,
  colorDistance = 30,
  eraserStrokes?: EraserStroke[],
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

  // 2. If eraser strokes exist, add white pixels along the stroke paths as seeds
  if (eraserStrokes && eraserStrokes.length > 0) {
    for (const stroke of eraserStrokes) {
      // Calculate pixel radius from percentage for this stroke
      const eraserRadius = Math.round((stroke.radius / 100) * Math.min(width, height))

      // For each stroke, interpolate between points
      for (let i = 0; i < stroke.points.length; i++) {
        const point = stroke.points[i]
        const centerX = Math.round((point.x / 100) * width)
        const centerY = Math.round((point.y / 100) * height)

        // Add all white pixels within the eraser radius
        for (let dy = -eraserRadius; dy <= eraserRadius; dy++) {
          for (let dx = -eraserRadius; dx <= eraserRadius; dx++) {
            // Check if within circular radius
            if (dx * dx + dy * dy > eraserRadius * eraserRadius)
              continue

            const px = centerX + dx
            const py = centerY + dy
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const idx = py * width + px
              if (!visited[idx] && isWhite(px, py)) {
                visited[idx] = 1
                queue.push(px, py)
              }
            }
          }
        }

        // Interpolate between current and next point for smooth coverage
        if (i < stroke.points.length - 1) {
          const nextPoint = stroke.points[i + 1]
          const nextX = Math.round((nextPoint.x / 100) * width)
          const nextY = Math.round((nextPoint.y / 100) * height)
          const dist = Math.sqrt((nextX - centerX) ** 2 + (nextY - centerY) ** 2)
          const steps = Math.max(1, Math.ceil(dist / (eraserRadius / 2)))

          for (let s = 1; s < steps; s++) {
            const t = s / steps
            const interpX = Math.round(centerX + (nextX - centerX) * t)
            const interpY = Math.round(centerY + (nextY - centerY) * t)

            for (let dy = -eraserRadius; dy <= eraserRadius; dy++) {
              for (let dx = -eraserRadius; dx <= eraserRadius; dx++) {
                if (dx * dx + dy * dy > eraserRadius * eraserRadius)
                  continue

                const px = interpX + dx
                const py = interpY + dy
                if (px >= 0 && px < width && py >= 0 && py < height) {
                  const idx = py * width + px
                  if (!visited[idx] && isWhite(px, py)) {
                    visited[idx] = 1
                    queue.push(px, py)
                  }
                }
              }
            }
          }
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
 * Erase white pixels only in the eraser stroke areas (no edge flood fill)
 * Used for real-time eraser preview before final processing
 */
export function eraseWhiteInStrokes(
  imageData: ImageData,
  eraserStrokes: EraserStroke[],
  colorDistance = 30,
  expansion = 0,
): void {
  const { data, width, height } = imageData
  const threshold = 255 - colorDistance

  const isWhite = (x: number, y: number) => {
    const idx = (y * width + x) * 4
    return data[idx] >= threshold && data[idx + 1] >= threshold && data[idx + 2] >= threshold
  }

  // Track which pixels were erased for expansion
  const erased = new Uint8Array(width * height)

  // Only process pixels along the stroke paths
  for (const stroke of eraserStrokes) {
    // Calculate pixel radius from percentage for this stroke
    const eraserRadius = Math.round((stroke.radius / 100) * Math.min(width, height))

    for (let i = 0; i < stroke.points.length; i++) {
      const point = stroke.points[i]
      const centerX = Math.round((point.x / 100) * width)
      const centerY = Math.round((point.y / 100) * height)

      // Erase white pixels within the eraser radius
      for (let dy = -eraserRadius; dy <= eraserRadius; dy++) {
        for (let dx = -eraserRadius; dx <= eraserRadius; dx++) {
          if (dx * dx + dy * dy > eraserRadius * eraserRadius)
            continue

          const px = centerX + dx
          const py = centerY + dy
          if (px >= 0 && px < width && py >= 0 && py < height) {
            if (isWhite(px, py)) {
              data[(py * width + px) * 4 + 3] = 0 // Set alpha to 0
              erased[py * width + px] = 1
            }
          }
        }
      }

      // Interpolate between current and next point
      if (i < stroke.points.length - 1) {
        const nextPoint = stroke.points[i + 1]
        const nextX = Math.round((nextPoint.x / 100) * width)
        const nextY = Math.round((nextPoint.y / 100) * height)
        const dist = Math.sqrt((nextX - centerX) ** 2 + (nextY - centerY) ** 2)
        const steps = Math.max(1, Math.ceil(dist / (eraserRadius / 2)))

        for (let s = 1; s < steps; s++) {
          const t = s / steps
          const interpX = Math.round(centerX + (nextX - centerX) * t)
          const interpY = Math.round(centerY + (nextY - centerY) * t)

          for (let dy = -eraserRadius; dy <= eraserRadius; dy++) {
            for (let dx = -eraserRadius; dx <= eraserRadius; dx++) {
              if (dx * dx + dy * dy > eraserRadius * eraserRadius)
                continue

              const px = interpX + dx
              const py = interpY + dy
              if (px >= 0 && px < width && py >= 0 && py < height) {
                if (isWhite(px, py)) {
                  data[(py * width + px) * 4 + 3] = 0
                  erased[py * width + px] = 1
                }
              }
            }
          }
        }
      }
    }
  }

  // Apply expansion to remove white halos around erased areas
  if (expansion > 0) {
    const dx = [1, -1, 0, 0]
    const dy = [0, 0, 1, -1]
    const mask = new Uint8Array(erased)

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
    eraserStrokes,
    expansion = 0,
  } = options

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  ctx.drawImage(image, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  removeWhiteBackground(imageData, colorDistance, eraserStrokes, expansion)
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
