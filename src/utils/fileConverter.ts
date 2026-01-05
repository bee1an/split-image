/**
 * 文件转换工具函数
 * 统一处理各种文件转换场景，避免代码重复
 */

/**
 * 临时文件接口（来自临时文件夹的数据结构）
 */
export interface TempFileData {
  name: string
  src: string // base64 data URL
}

/**
 * 将 Blob 转换为 Data URL (base64)
 */
export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'))
    reader.onabort = () => reject(new Error('Blob conversion was aborted'))
    reader.readAsDataURL(blob)
  })
}

/**
 * 将 Data URL 转换为 Blob
 */
export async function dataURLToBlob(dataURL: string): Promise<Blob> {
  const res = await fetch(dataURL)
  if (!res.ok) {
    throw new Error(`Failed to fetch data URL: ${res.statusText}`)
  }
  return await res.blob()
}

/**
 * 将临时文件数据转换为 File 对象
 */
export async function tempFileToFile(
  tempFile: TempFileData,
  options?: { extension?: string },
): Promise<File> {
  const blob = await dataURLToBlob(tempFile.src)
  const extension = options?.extension ?? 'png'
  const filename = `${tempFile.name}.${extension}`
  return new File([blob], filename, { type: blob.type })
}

/**
 * 批量将临时文件数据转换为 File 对象
 */
export async function tempFilesToFiles(
  tempFiles: TempFileData[],
  options?: { extension?: string },
): Promise<File[]> {
  return Promise.all(
    tempFiles.map(tempFile => tempFileToFile(tempFile, options)),
  )
}

/**
 * 将 File 转换为 Data URL
 */
export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.onabort = () => reject(new Error(`File reading was aborted: ${file.name}`))
    reader.readAsDataURL(file)
  })
}

/**
 * 批量将 File 转换为 Data URL
 */
export async function filesToDataURLs(files: File[]): Promise<string[]> {
  return Promise.all(
    files.map(file => fileToDataURL(file)),
  )
}

/**
 * 将 Blob 转换为 File
 */
export async function blobToFile(
  blob: Blob,
  filename: string,
  options?: { type?: string },
): Promise<File> {
  return new File(
    [blob],
    filename,
    { type: options?.type ?? blob.type },
  )
}
