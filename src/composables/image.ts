import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'

export interface ImageItem {
  id: string
  originalSrc: string
  processedSrc: string
  name: string
  selection?: { x: number, y: number, w: number, h: number } // Percentages (0-100)
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
      id: Math.random().toString(36).slice(2, 9),
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
    const item = items.value.find(i => i.id === id)
    if (item) {
      Object.assign(item, updates)
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
    if (item) {
      item.processedSrc = item.originalSrc
    }
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
