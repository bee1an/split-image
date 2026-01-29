<script setup lang="ts">
import { saveAs } from 'file-saver'
import { getGeminiWatermarkEngine } from '../utils/geminiWatermark'

// State
const imageSrc = ref('')
const imageName = ref('')
const processedSrc = ref('')
const isProcessing = ref(false)
const engineReady = ref(false)
const errorMessage = ref('')

// Initialize engine on mount
onMounted(async () => {
  try {
    await getGeminiWatermarkEngine()
    engineReady.value = true
  }
  catch (error) {
    console.error('Failed to initialize watermark engine:', error)
    errorMessage.value = 'Failed to load watermark resources'
  }
})

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  const src = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.readAsDataURL(file)
  })

  imageSrc.value = src
  imageName.value = file.name.replace(/\.[^/.]+$/, '')
  processedSrc.value = ''
  errorMessage.value = ''
}

function handleClear() {
  imageSrc.value = ''
  imageName.value = ''
  processedSrc.value = ''
  errorMessage.value = ''
}

async function processImage() {
  if (!imageSrc.value || !engineReady.value)
    return

  isProcessing.value = true
  errorMessage.value = ''

  try {
    const engine = await getGeminiWatermarkEngine()

    // Load image
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = imageSrc.value
    })

    // Create canvas and get image data
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Remove watermark
    engine.removeWatermark(imageData)

    // Put processed image data back
    ctx.putImageData(imageData, 0, 0)

    // Convert to data URL
    processedSrc.value = canvas.toDataURL('image/png')
  }
  catch (error) {
    console.error('Failed to process image:', error)
    errorMessage.value = 'Failed to process image'
  }
  finally {
    isProcessing.value = false
  }
}

function downloadImage() {
  if (!processedSrc.value)
    return

  fetch(processedSrc.value)
    .then(res => res.blob())
    .then(blob => saveAs(blob, `${imageName.value || 'processed'}_no_watermark.png`))
}
</script>

<template>
  <section>
    <h3 text="[10px] zinc-500" tracking-wider font-bold mb-3 flex gap-1.5 uppercase items-center>
      <span i-carbon-paint-brush text-sm />
      Gemini 水印去除
    </h3>

    <!-- Description -->
    <p text="[9px] zinc-400" mb-3>
      使用 Reverse Alpha Blending 算法精确去除 Gemini AI 生成图片右下角的水印。
    </p>

    <!-- Upload Area -->
    <div v-if="!imageSrc" space-y-2>
      <label
        border="1 dashed zinc-300 dark:zinc-700"
        text="xs zinc-500"
        font-medium
        px-3
        py-4
        text-center
        rounded-lg
        flex
        flex-col
        gap-2
        cursor-pointer
        transition-colors
        items-center
        justify-center
        hover:border-emerald-500
      >
        <span i-carbon-image text-2xl text-zinc-400 />
        <span>上传带水印的图片</span>
        <input
          type="file"
          accept="image/*"
          hidden
          @change="handleUpload"
        >
      </label>
    </div>

    <!-- Image loaded -->
    <div v-else space-y-3>
      <!-- Original Image Info -->
      <div
        border="1 zinc-200 dark:zinc-800"
        px-3
        py-2
        rounded-lg
        flex
        items-center
        justify-between
        bg="zinc-50 dark:zinc-900/50"
      >
        <div flex gap-2 min-w-0 items-center>
          <span i-carbon-image text-zinc-400 />
          <span text-xs text-zinc-600 truncate dark:text-zinc-400>
            {{ imageName || 'Uploaded image' }}
          </span>
        </div>
        <button
          text="[10px] red-500"
          font-medium
          flex-shrink-0
          hover:underline
          @click="handleClear"
        >
          移除
        </button>
      </div>

      <!-- Preview -->
      <div
        border="1 zinc-200 dark:zinc-800"
        bg="zinc-50 dark:zinc-900/50"
        p-2
        rounded-lg
        flex
        flex-col
        gap-2
      >
        <!-- Original vs Processed -->
        <div gap-2 grid grid-cols-2>
          <div flex flex-col gap-1 items-center>
            <span text="[9px] zinc-400">原图</span>
            <div
              class="bg-checkered"
              border="1 zinc-200 dark:zinc-700"
              rounded
              flex
              h-20
              w-full
              items-center
              justify-center
              overflow-hidden
            >
              <img
                :src="imageSrc"
                max-h-full
                max-w-full
                object-contain
              >
            </div>
          </div>
          <div flex flex-col gap-1 items-center>
            <span text="[9px] zinc-400">处理后</span>
            <div
              class="bg-checkered"
              border="1 zinc-200 dark:zinc-700"
              rounded
              flex
              h-20
              w-full
              items-center
              justify-center
              overflow-hidden
            >
              <template v-if="isProcessing">
                <div i-carbon-rotate-360 text-xl text-emerald-500 animate-spin />
              </template>
              <template v-else-if="processedSrc">
                <img
                  :src="processedSrc"
                  max-h-full
                  max-w-full
                  object-contain
                >
              </template>
              <template v-else>
                <div i-carbon-pending text-xl text-zinc-300 dark:text-zinc-600 />
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" text="[10px] red-500" text-center>
        {{ errorMessage }}
      </div>

      <!-- Actions -->
      <div flex flex-col gap-2>
        <button
          bg="emerald-600 hover:emerald-500"
          text="xs white"
          font-bold
          py-2.5
          rounded-lg
          w-full
          cursor-pointer
          transition-all
          disabled:opacity-50
          active:scale-95
          :disabled="isProcessing || !engineReady"
          @click="processImage"
        >
          <div flex gap-1.5 items-center justify-center>
            <div v-if="isProcessing" i-carbon-rotate-360 animate-spin />
            <span v-else i-carbon-clean />
            <span>{{ isProcessing ? '处理中...' : '去除水印' }}</span>
          </div>
        </button>

        <button
          v-if="processedSrc"
          border="1 zinc-200 dark:zinc-700"
          hover:bg="zinc-100 dark:zinc-800"
          text="xs zinc-600 dark:zinc-400"
          font-bold
          py-2.5
          rounded-lg
          w-full
          transition-colors
          @click="downloadImage"
        >
          <div flex gap-1.5 items-center justify-center>
            <span i-carbon-download />
            <span>下载图片</span>
          </div>
        </button>
      </div>

      <!-- Replace Image -->
      <label
        border="1 dashed zinc-300 dark:zinc-700"
        text="xs zinc-500"
        font-medium
        px-3
        py-2
        text-center
        rounded-lg
        flex
        gap-1.5
        cursor-pointer
        transition-colors
        items-center
        justify-center
        hover:border-emerald-500
      >
        <span i-carbon-upload text-sm />
        更换图片
        <input
          type="file"
          accept="image/*"
          hidden
          @change="handleUpload"
        >
      </label>
    </div>
  </section>
</template>
