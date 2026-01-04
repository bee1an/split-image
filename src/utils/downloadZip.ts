import type { ImageFormat, SplitLine } from './splitImage'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { getFileExtension } from './splitImage'

/**
 * Download multiple blobs as a ZIP file with proper row/column naming
 */
export async function downloadAsZip(
  blobs: Blob[],
  baseName: string,
  lines: SplitLine[],
  format: ImageFormat = 'png',
  customNames?: string[],
): Promise<void> {
  const zip = new JSZip()
  const ext = getFileExtension(format)

  if (customNames && customNames.length === blobs.length) {
    blobs.forEach((blob, index) => {
      zip.file(`${customNames[index]}.${ext}`, blob)
    })
  }
  else {
    // Calculate actual grid dimensions based on lines
    const vLineCount = lines.filter(l => l.type === 'v').length
    const cols = vLineCount + 1

    blobs.forEach((blob, index) => {
      const row = Math.floor(index / cols) + 1
      const col = (index % cols) + 1
      // Pad numbers for better sorting
      const rowStr = String(row).padStart(2, '0')
      const colStr = String(col).padStart(2, '0')
      zip.file(`${baseName}_r${rowStr}_c${colStr}.${ext}`, blob)
    })
  }

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${baseName}_export.zip`)
}
