<script setup lang="ts">
import { saveAs } from 'file-saver'
import { useTempFolder } from '../composables/tempFolder'
import { getGeminiWatermarkEngine } from '../utils/geminiWatermark'

const { addFile, open: openTempFolder } = useTempFolder()

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

async function handleUpload(files: File[]) {
  const file = files[0]
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

function addToTempFolder() {
  if (!processedSrc.value)
    return

  addFile({
    name: `${imageName.value || 'processed'}_no_watermark.png`,
    src: processedSrc.value,
    source: 'watermark',
  })
  openTempFolder()
}

const hasImage = computed(() => !!imageSrc.value)
</script>

<template>
  <div
    bg="white dark:[#09090b]"
    text="zinc-900 dark:zinc-100"
    flex
    flex-col
    h-screen
    overflow-hidden
  >
    <div flex flex-1 overflow-hidden>
      <!-- Main Content Area -->
      <main
        bg="zinc-50 dark:[#0c0c0e]"
        p-6
        flex
        flex-1
        flex-col
        relative
        overflow-hidden
      >
        <!-- Empty State -->
        <div v-if="!hasImage" flex h-full items-center justify-center>
          <div text-center flex flex-col max-w-sm items-center>
            <div
              rounded="[2.5rem]"
              mb-6
              bg-white
              flex
              h-24
              w-24
              shadow-2xl
              items-center
              justify-center
              dark:bg-zinc-900
              border="1 zinc-200 dark:zinc-800/50"
            >
              <span i-carbon-paint-brush text-5xl text-zinc-300 dark:text-zinc-700 />
            </div>
            <h2 text-xl text-zinc-900 font-bold mb-2 dark:text-zinc-100>
              Gemini 水印去除
            </h2>
            <p text-sm text-zinc-500>
              使用 Reverse Alpha Blending 算法精确去除 Gemini AI 生成图片右下角的水印，无损还原原图。
            </p>
          </div>
        </div>

        <!-- Content with Image -->
        <div v-else flex flex-col h-full overflow-hidden>
          <!-- Image Comparison -->
          <div flex flex-1 flex-col min-h-0 overflow-hidden>
            <h3 text="[10px] zinc-500" tracking-wider font-bold mb-3 flex-shrink-0 uppercase>
              图片对比
            </h3>

            <div

              flex-1 gap-4 grid grid-cols-2 min-h-0
            >
              <!-- Original Image -->
              <div flex flex-col gap-2>
                <span text="xs zinc-500">原图</span>
                <div
                  class="bg-checkered"
                  border="1 zinc-200 dark:zinc-800"

                  p-4 rounded-xl flex flex-1 min-h-0 items-center justify-center overflow-hidden
                >
                  <img
                    :src="imageSrc"

                    rounded-lg max-h-full max-w-full object-contain
                  >
                </div>
              </div>

              <!-- Processed Image -->
              <div flex flex-col gap-2>
                <span text="xs zinc-500">处理后</span>
                <div
                  class="bg-checkered"
                  border="1 zinc-200 dark:zinc-800"

                  p-4 rounded-xl flex flex-1 min-h-0 items-center justify-center overflow-hidden
                >
                  <template v-if="isProcessing">
                    <div i-carbon-rotate-360 text-4xl text-emerald-500 animate-spin />
                  </template>
                  <template v-else-if="processedSrc">
                    <img
                      :src="processedSrc"

                      rounded-lg max-h-full max-w-full object-contain
                    >
                  </template>
                  <template v-else>
                    <div flex flex-col gap-2 items-center>
                      <div i-carbon-pending text-4xl text-zinc-300 dark:text-zinc-600 />
                      <span text="sm zinc-400">点击「去除水印」开始处理</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Sidebar -->
      <aside
        border-l="zinc-200 dark:zinc-800"
        bg-white
        flex
        flex-col
        w-80
        shadow-md
        shadow-zinc-200
        overflow-hidden
        dark:bg-zinc-950
        dark:shadow-none
      >
        <div class="custom-scrollbar" p-4 flex flex-1 flex-col gap-4 overflow-y-auto>
          <!-- Info Section -->
          <section>
            <h3 text="[10px] zinc-500" tracking-wider font-bold mb-3 flex gap-1.5 uppercase items-center>
              <span i-carbon-information text-sm />
              关于
            </h3>
            <p text="[9px] zinc-400" leading-relaxed>
              本工具使用 Reverse Alpha Blending 算法，数学精确地还原被 Gemini AI 水印覆盖的原始像素。
              水印位于图片右下角，尺寸为 48×48（小图）或 96×96（大图，宽高均 > 1024）。
            </p>
          </section>

          <!-- Upload Section -->
          <section>
            <h3 text="[10px] zinc-500" tracking-wider font-bold mb-3 uppercase>
              图片
            </h3>
            <div v-if="!hasImage" space-y-2>
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
                  @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleUpload([f]) }"
                >
              </label>
            </div>
            <div v-else flex flex-col gap-2>
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
                    {{ imageName || '已加载图片' }}
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
              <label
                border="1 dashed zinc-300 dark:zinc-700"
                text="xs zinc-500"
                font-medium
                px-3
                py-2.5
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
                  @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleUpload([f]) }"
                >
              </label>
            </div>
          </section>

          <!-- Error Message -->
          <div v-if="errorMessage" text="[10px] red-500" text-center>
            {{ errorMessage }}
          </div>
        </div>

        <!-- Action Buttons -->
        <div
          v-if="hasImage"
          border-t="zinc-200 dark:zinc-800"
          p-4
          bg-white
          shadow-2xl
          dark:bg-zinc-950
        >
          <div flex flex-col gap-2>
            <button
              bg="emerald-600 hover:emerald-500"
              text="xs white"
              font-bold
              py-3
              rounded-xl
              w-full
              cursor-pointer
              shadow-lg
              transition-all
              disabled:opacity-50
              active:scale-95
              :disabled="isProcessing || !engineReady"
              @click="processImage"
            >
              <div flex gap-1.5 items-center justify-center>
                <div v-if="isProcessing" i-carbon-rotate-360 animate-spin />
                <span v-else i-carbon-paint-brush />
                <span>{{ isProcessing ? '处理中...' : '去除水印' }}</span>
              </div>
            </button>

            <button
              v-if="processedSrc"
              border="1 zinc-200 dark:zinc-700"
              hover:bg="zinc-100 dark:zinc-800"
              text="xs zinc-600 dark:zinc-400"
              font-bold
              py-3
              rounded-xl
              w-full
              transition-colors
              @click="downloadImage"
            >
              <div flex gap-1.5 items-center justify-center>
                <span i-carbon-download />
                <span>下载图片</span>
              </div>
            </button>

            <button
              v-if="processedSrc"
              border="1 zinc-200 dark:zinc-700"
              hover:bg="zinc-100 dark:zinc-800"
              text="xs zinc-600 dark:zinc-400"
              font-bold
              py-3
              rounded-xl
              w-full
              transition-colors
              @click="addToTempFolder"
            >
              <div flex gap-1.5 items-center justify-center>
                <span i-carbon-folder-add />
                <span>添加到临时文件夹</span>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
