import { createSharedComposable } from '@vueuse/core'
import { ref } from 'vue'
import { generateId } from '../utils/common'

export interface TempFile {
  id: string
  name: string
  src: string // base64 data URL
  createdAt: number
  source: 'split' | 'process'
}

export const useTempFolder = createSharedComposable(() => {
  const files = ref<TempFile[]>([])
  const isOpen = ref(false)
  const isDragging = ref(false) // Track if a temp file is being dragged

  function addFile(file: Omit<TempFile, 'id' | 'createdAt'>) {
    // Check for duplicate (same src)
    if (files.value.some(f => f.src === file.src)) {
      return // Already exists
    }
    files.value.unshift({
      ...file,
      id: generateId(),
      createdAt: Date.now(),
    })
  }

  function addFiles(newFiles: Omit<TempFile, 'id' | 'createdAt'>[]) {
    // Filter out duplicates (same src)
    const existingSrcs = new Set(files.value.map(f => f.src))
    const uniqueFiles = newFiles.filter(f => !existingSrcs.has(f.src))

    if (uniqueFiles.length === 0)
      return

    const items = uniqueFiles.map(f => ({
      ...f,
      id: generateId(),
      createdAt: Date.now(),
    }))
    files.value.unshift(...items)
  }

  function removeFile(id: string) {
    files.value = files.value.filter(f => f.id !== id)
  }

  function clearAll() {
    files.value = []
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function getFileById(id: string): TempFile | undefined {
    return files.value.find(f => f.id === id)
  }

  return {
    files,
    isOpen,
    isDragging,
    addFile,
    addFiles,
    removeFile,
    clearAll,
    toggle,
    open,
    close,
    getFileById,
  }
})
