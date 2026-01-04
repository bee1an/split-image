export interface SplitLine {
  id: string
  type: 'h' | 'v'
  /** Position as percentage (0-100) */
  position: number
}

interface SliceRegion {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Calculate slice regions based on split lines
 */
function calculateRegions(
  imageWidth: number,
  imageHeight: number,
  lines: SplitLine[],
): SliceRegion[] {
  const hLines = lines
    .filter(l => l.type === 'h')
    .map(l => (l.position / 100) * imageHeight)
    .sort((a, b) => a - b)

  const vLines = lines
    .filter(l => l.type === 'v')
    .map(l => (l.position / 100) * imageWidth)
    .sort((a, b) => a - b)

  const yBreaks = [0, ...hLines, imageHeight]
  const xBreaks = [0, ...vLines, imageWidth]

  const regions: SliceRegion[] = []

  for (let i = 0; i < yBreaks.length - 1; i++) {
    for (let j = 0; j < xBreaks.length - 1; j++) {
      regions.push({
        x: xBreaks[j],
        y: yBreaks[i],
        width: xBreaks[j + 1] - xBreaks[j],
        height: yBreaks[i + 1] - yBreaks[i],
      })
    }
  }

  return regions
}

/**
 * Split an image into multiple blobs based on split lines
 */
export async function splitImage(
  image: HTMLImageElement,
  lines: SplitLine[],
): Promise<Blob[]> {
  const regions = calculateRegions(image.naturalWidth, image.naturalHeight, lines)

  const blobs: Blob[] = []

  for (const region of regions) {
    const canvas = document.createElement('canvas')
    canvas.width = region.width
    canvas.height = region.height

    const ctx = canvas.getContext('2d')
    if (!ctx)
      throw new Error('Failed to get canvas context')

    ctx.drawImage(
      image,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      region.width,
      region.height,
    )

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b)
          resolve(b)
        else reject(new Error('Failed to create blob'))
      }, 'image/png')
    })

    blobs.push(blob)
  }

  return blobs
}
