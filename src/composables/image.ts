import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'
import { generateId } from '../utils/common'

export interface EraserPoint {
  x: number // Percentage (0-100)
  y: number // Percentage (0-100)
}

export interface EraserStroke {
  points: EraserPoint[]
  radius: number // Percentage (0-100)
}

export interface ImageItem {
  id: string
  originalSrc: string
  processedSrc: string
  name: string
  eraserStrokes?: EraserStroke[] // Array of strokes with their radius
  regionColorDistance?: number
}

export const useImageState = createSharedComposable(() => {
  const items = ref<ImageItem[]>([])
  const currentIndex = ref(0)

  const currentItem = computed(() => items.value[currentIndex.value] || null)
  const imageSrc = computed(() => currentItem.value?.processedSrc || '')
  const originalImageSrc = computed(() => currentItem.value?.originalSrc || '')

  function addImages(files: { name: string, src: string }[]) {
    const newItems = files.map(f => ({
      id: generateId(),
      name: f.name,
      originalSrc: f.src,
      processedSrc: f.src,
      regionColorDistance: 30,
    }))
    items.value.push(...newItems)
    if (items.value.length === newItems.length) {
      currentIndex.value = 0
    }
  }

  function updateItem(id: string, updates: Partial<ImageItem>) {
    const index = items.value.findIndex(i => i.id === id)
    if (index !== -1) {
      // 使用不可变更新模式，确保 Vue 响应式系统能追踪变化
      items.value[index] = { ...items.value[index], ...updates }
    }
  }

  function updateProcessedSrc(id: string, src: string) {
    updateItem(id, { processedSrc: src })
  }

  function removeImage(id: string) {
    const index = items.value.findIndex(i => i.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
      if (currentIndex.value >= items.value.length) {
        currentIndex.value = Math.max(0, items.value.length - 1)
      }
    }
  }

  function clearImages() {
    items.value = []
    currentIndex.value = 0
  }

  function resetToOriginal(id: string) {
    const item = items.value.find(i => i.id === id)
    if (!item)
      return
    updateItem(id, { processedSrc: item.originalSrc })
  }

  return {
    items,
    currentIndex,
    currentItem,
    imageSrc,
    originalImageSrc,
    addImages,
    updateItem,
    updateProcessedSrc,
    removeImage,
    clearImages,
    resetToOriginal,
  }
})
