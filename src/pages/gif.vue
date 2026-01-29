<script setup lang="ts">
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import UploadZone from '../components/UploadZone.vue'
import { createGif, fpsToDelay } from '../utils/gifEncoder'
import { cloneImageData, cropFromCenter, getDefaultMagentaCleanupOptions, imageDataToDataURL, processSpriteSheet, removeMagentaBackground } from '../utils/spriteSheet'

// Prompt template for AI sprite sheet generation
const PROMPT_TEMPLATE = `请生成一张精灵图（sprite sheet）

硬性要求：
- PNG 或 JPG 均可（推荐 PNG 以减少压缩噪点）
- 背景色必须是且只能是纯品红（magenta）#ff00ff：不要渐变/阴影/纹理/噪点/压缩噪点/边框；不要出现第二种背景色像素；应用会自动把背景抠成透明
- 角色不要自带任何"背景/场景/地面/墙面/光斑/烟雾/文字"等元素；除角色本身外，所有区域必须是纯品红背景（#ff00ff）
- 请避免在角色/道具/阴影中使用背景色（#ff00ff 或非常接近的品红色），否则会被一起抠掉
- 角色表面不要出现品红色反光/品红色轮廓光/品红色光晕（避免被误抠）
- 分成 8 列 × 8 行的网格，每一格必须是正方形帧（每帧宽高相等！）
- 每一帧与相邻帧必须紧挨着：不要留白/间隔/内边距/外边距；不要画网格线或分隔线（**不要有任何缝隙！**）
- 整体长宽比约为 8:7（≈1.1429）
- 推荐输出 4K 级别的高分辨率图片（如 4096×4096，每帧 512×512），程序会等比例缩放到最终尺寸 1024×1024（每帧 128×128）
- 请确保图像质量高：角色细节清晰、边缘锐利、无模糊/锯齿/压缩伪影
- 同一行表示同一个动画；从左到右是连续帧，循环播放
- 同一个动画（同一行）相邻两帧之间的变化必须非常连贯：不要跳帧、不要突然大幅位移/大幅姿态变化/大幅表情变化、不要突然变焦或改变视角
- 角色在每一帧中的位置尽量一致（建议以画布中心对齐），不要裁切到边缘

行含义（从上到下）：
- 第1行：爱你
- 第2行：开心
- 第3行：吃饭饭
- 第4行：早安安
- 第5行：晚安安
- 第6行：睡觉觉
- 第7行：生气
- 第8行：不理你了

角色设定：宇哥
风格：可爱、干净，统一光照与配色，背景保持纯品红色（方便抠图）
输出：只输出这张 sprite sheet（png/jpg）`

const showPrompt = ref(false)
const copySuccess = ref(false)

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(PROMPT_TEMPLATE)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
  catch (error) {
    console.error('Failed to copy:', error)
  }
}

// State
const imageSrc = ref('')
const imageName = ref('')
const rows = ref(8)
const cols = ref(8)
const fps = ref(6)
const tolerance = ref(150)
const outputWidth = ref(240)
const outputHeight = ref(240)

// Default animation names matching the prompt template
const DEFAULT_ANIMATION_NAMES = ['爱你', '开心', '吃饭饭', '早安安', '晚安安', '睡觉觉', '生气', '不理你了']
const animationNames = ref<string[]>([...DEFAULT_ANIMATION_NAMES])
const isProcessing = ref(false)

// Processed data: frames[row] = ImageData[] (cols frames per animation)
const processedFrames = ref<ImageData[][]>([])
// Generated GIF URLs
const gifUrls = ref<string[]>([])
// Per-animation generating state
const generatingStates = ref<boolean[]>([])

// Computed: Frame data URLs with center cropping + background removal (WYSIWYG preview)
const frameDataUrls = computed(() => {
  if (processedFrames.value.length === 0)
    return []

  const cleanup = getDefaultMagentaCleanupOptions(tolerance.value)

  return processedFrames.value.map(row =>
    row.map((imageData) => {
      const cleaned = cloneImageData(imageData)
      removeMagentaBackground(cleaned, tolerance.value, cleanup)
      const cropped = cropFromCenter(cleaned, outputWidth.value, outputHeight.value)
      return imageDataToDataURL(cropped)
    }),
  )
})

// Computed
const hasImage = computed(() => !!imageSrc.value)
const animationCount = computed(() => rows.value)

// Initialize animation names when rows change
watch(rows, (newRows) => {
  while (animationNames.value.length < newRows) {
    animationNames.value.push(`动画${animationNames.value.length + 1}`)
  }
  if (animationNames.value.length > newRows) {
    animationNames.value = animationNames.value.slice(0, newRows)
  }
}, { immediate: true })

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
  processedFrames.value = []
  gifUrls.value = []
  generatingStates.value = []
}

function handleClear() {
  imageSrc.value = ''
  imageName.value = ''
  processedFrames.value = []
  gifUrls.value = []
  generatingStates.value = []
}

async function processImage() {
  if (!imageSrc.value)
    return

  isProcessing.value = true
  processedFrames.value = []
  gifUrls.value = []
  generatingStates.value = Array.from({ length: rows.value }, () => false)

  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

  const img = new Image()
  img.crossOrigin = 'anonymous'

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = imageSrc.value
  })

  // Slice and process sprite sheet
  const slices = processSpriteSheet(
    img,
    { rows: rows.value, cols: cols.value },
    { tolerance: tolerance.value },
  )

  processedFrames.value = slices

  isProcessing.value = false

  // Auto-generate all GIFs
  await generateAllGifs()
}

async function generateGif(rowIndex: number) {
  const frames = processedFrames.value[rowIndex]
  if (!frames || frames.length === 0)
    return

  generatingStates.value[rowIndex] = true

  try {
    const delay = fpsToDelay(fps.value)
    const blob = await createGif(frames, {
      delay,
      width: outputWidth.value,
      height: outputHeight.value,
      tolerance: tolerance.value,
    })
    const url = URL.createObjectURL(blob)

    // Revoke old URL if exists
    if (gifUrls.value[rowIndex]) {
      URL.revokeObjectURL(gifUrls.value[rowIndex])
    }

    gifUrls.value[rowIndex] = url
  }
  catch (error) {
    console.error(`Failed to generate GIF for row ${rowIndex}:`, error)
  }
  finally {
    generatingStates.value[rowIndex] = false
  }
}

async function generateAllGifs() {
  const promises = processedFrames.value.map((_, idx) => generateGif(idx))
  await Promise.all(promises)
}

async function regenerateGif(rowIndex: number) {
  await generateGif(rowIndex)
}

function downloadSingleFrame(rowIdx: number, frameIdx: number) {
  const imageData = processedFrames.value[rowIdx]?.[frameIdx]
  if (!imageData)
    return

  const cropped = cropFromCenter(imageData, outputWidth.value, outputHeight.value)
  const dataUrl = imageDataToDataURL(cropped)

  const animName = animationNames.value[rowIdx] || `animation_${rowIdx + 1}`
  const fileName = `${animName}_frame_${frameIdx + 1}.png`

  // Convert data URL to blob and download
  fetch(dataUrl)
    .then(res => res.blob())
    .then(blob => saveAs(blob, fileName))
}

async function replaceFrame(rowIdx: number, frameIdx: number, file: File) {
  const src = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.readAsDataURL(file)
  })

  const img = new Image()
  img.crossOrigin = 'anonymous'

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })

  // Convert uploaded image to ImageData
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  // Replace the frame in processedFrames
  processedFrames.value[rowIdx][frameIdx] = imageData

  // Trigger reactivity
  processedFrames.value = [...processedFrames.value]

  // Regenerate GIF for this row
  await regenerateGif(rowIdx)
}

function downloadSingleGif(rowIndex: number) {
  const url = gifUrls.value[rowIndex]
  if (!url)
    return
  const name = animationNames.value[rowIndex] || `animation_${rowIndex + 1}`
  fetch(url)
    .then(res => res.blob())
    .then(blob => saveAs(blob, `${name}.gif`))
}

async function handleDownloadAll() {
  const validGifs = gifUrls.value
    .map((url, idx) => ({ url, name: animationNames.value[idx] || `animation_${idx + 1}` }))
    .filter(item => item.url)

  if (validGifs.length === 0)
    return

  const zip = new JSZip()

  await Promise.all(
    validGifs.map(async ({ url, name }) => {
      const resp = await fetch(url)
      const blob = await resp.blob()
      zip.file(`${name}.gif`, blob)
    }),
  )

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${imageName.value || 'sprites'}_gifs.zip`)
}

// Cleanup URLs on unmount
onUnmounted(() => {
  gifUrls.value.forEach((url) => {
    if (url)
      URL.revokeObjectURL(url)
  })
})
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
              <span i-carbon-play-outline text-5xl text-zinc-300 dark:text-zinc-700 />
            </div>
            <h2 text-xl text-zinc-900 font-bold mb-2 dark:text-zinc-100>
              精灵图转 GIF
            </h2>
            <p text-sm text-zinc-500>
              上传 AI 生成的精灵图（8列×7行，品红背景），自动切片、抠图并生成 GIF 动画。
            </p>
          </div>
        </div>

        <!-- Content with Image -->
        <div v-else flex flex-col h-full overflow-hidden>
          <!-- Animation Rows -->
          <div flex flex-1 flex-col min-h-0 overflow-hidden>
            <h3 text="[10px] zinc-500" tracking-wider font-bold mb-3 flex-shrink-0 uppercase>
              生成的 GIF ({{ gifUrls.filter(Boolean).length }}/{{ animationCount }})
            </h3>

            <div
              v-if="processedFrames.length === 0"
              border="1 dashed zinc-200 dark:zinc-800"
              rounded-xl
              flex
              flex-1
              min-h-0
              items-center
              justify-center
            >
              <div text-center flex flex-col gap-2 items-center>
                <div i-carbon-arrows-horizontal text-2xl text-zinc-300 dark:text-zinc-700 />
                <span text="sm zinc-400">点击「生成 GIF」开始处理</span>
              </div>
            </div>

            <!-- Animation List -->
            <div
              v-else
              class="custom-scrollbar"

              pb-2 pr-2 flex flex-1 flex-col gap-2 min-h-0 overflow-y-auto
            >
              <!-- Each Animation Row -->
              <div
                v-for="(frames, rowIdx) in frameDataUrls"
                :key="rowIdx"
                border="1 zinc-200 dark:zinc-800"
                bg="white dark:zinc-900/50"
                p-2
                rounded-xl
                flex
                gap-3
                items-center
              >
                <!-- Name Input -->
                <input
                  v-model="animationNames[rowIdx]"
                  type="text"
                  border="1 zinc-200 dark:zinc-700"
                  text="xs zinc-900 dark:zinc-100"

                  bg="zinc-50 dark:zinc-800"

                  px-2 py-1.5 outline-none rounded-lg flex-shrink-0 w-20 transition-colors focus:border-emerald-500
                  placeholder="名称"
                >

                <!-- Frames -->
                <div
                  class="custom-scrollbar"
                  py-1
                  flex
                  flex-1
                  gap-1.5
                  overflow-x-auto
                >
                  <div
                    v-for="(frameUrl, frameIdx) in frames"
                    :key="frameIdx"
                    class="group"
                    relative
                  >
                    <div
                      class="bg-checkered"
                      border="1 zinc-200 dark:zinc-700"
                      rounded-lg
                      flex
                      flex-shrink-0
                      h-16
                      w-16
                      items-center
                      justify-center
                      overflow-hidden
                    >
                      <img
                        :src="frameUrl"
                        max-h-full
                        max-w-full
                        object-contain
                      >
                    </div>
                    <!-- Frame actions overlay -->
                    <div
                      class="group-hover:opacity-100"

                      bg="black/60"

                      rounded-lg opacity-0 flex gap-1 transition-opacity items-center inset-0 justify-center absolute
                    >
                      <button
                        text-white
                        p-1.5
                        rounded
                        transition-colors
                        hover:bg="white/20"
                        title="下载帧"
                        @click="downloadSingleFrame(rowIdx, frameIdx)"
                      >
                        <div i-carbon-download text-sm />
                      </button>
                      <label
                        text-white
                        p-1.5
                        rounded
                        cursor-pointer
                        transition-colors
                        hover:bg="white/20"
                        title="替换帧"
                      >
                        <div i-carbon-upload text-sm />
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) replaceFrame(rowIdx, frameIdx, f) }"
                        >
                      </label>
                    </div>
                  </div>
                </div>

                <!-- GIF Preview -->
                <div
                  class="bg-checkered"
                  border="2 emerald-500/50"
                  rounded-xl
                  flex
                  flex-shrink-0
                  h-20
                  w-20
                  items-center
                  justify-center
                  relative
                  overflow-hidden
                >
                  <template v-if="generatingStates[rowIdx]">
                    <div i-carbon-rotate-360 text-xl text-emerald-500 animate-spin />
                  </template>
                  <template v-else-if="gifUrls[rowIdx]">
                    <img
                      :src="gifUrls[rowIdx]"
                      max-h-full
                      max-w-full
                      object-contain
                    >
                  </template>
                  <template v-else>
                    <div i-carbon-pending text-xl text-zinc-300 dark:text-zinc-600 />
                  </template>
                </div>

                <!-- Actions -->
                <div flex flex-shrink-0 flex-col gap-1>
                  <button
                    text-zinc-400
                    p-1.5
                    rounded
                    transition-colors
                    hover:text-emerald-500
                    hover:bg="emerald-500/10"
                    title="下载 GIF"
                    :disabled="!gifUrls[rowIdx]"
                    :class="{ 'opacity-30 cursor-not-allowed': !gifUrls[rowIdx] }"
                    @click="downloadSingleGif(rowIdx)"
                  >
                    <div i-carbon-download text-sm />
                  </button>
                  <button
                    text-zinc-400
                    p-1.5
                    rounded
                    transition-colors
                    hover:text-blue-500
                    hover:bg="blue-500/10"
                    title="重新生成"
                    :disabled="generatingStates[rowIdx]"
                    @click="regenerateGif(rowIdx)"
                  >
                    <div i-carbon-reset text-sm />
                  </button>
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
        w-72
        shadow-md
        shadow-zinc-200
        overflow-hidden
        dark:bg-zinc-950
        dark:shadow-none
      >
        <div class="custom-scrollbar" p-4 flex flex-1 flex-col gap-4 overflow-y-auto>
          <!-- Prompt Template -->
          <section>
            <div mb-2 flex items-center justify-between>
              <h3 text="[10px] zinc-500" tracking-wider font-bold uppercase>
                AI 提示词
              </h3>
              <button
                text="[10px] emerald-500"
                font-medium
                hover:underline
                @click="showPrompt = !showPrompt"
              >
                {{ showPrompt ? '收起' : '展开' }}
              </button>
            </div>
            <div
              v-if="showPrompt"
              border="1 zinc-200 dark:zinc-800"
              bg="zinc-50 dark:zinc-900/50"
              rounded-lg
              overflow-hidden
            >
              <pre
                class="custom-scrollbar"
                text="[10px] zinc-600 dark:zinc-400"

                leading-relaxed p-3 max-h-48 whitespace-pre-wrap break-words overflow-y-auto
              >{{ PROMPT_TEMPLATE }}</pre>
              <div border-t="1 zinc-200 dark:zinc-700" p-2>
                <button
                  bg="emerald-500 hover:emerald-600"
                  text="[10px] white"

                  font-medium px-3 py-1.5 rounded-md flex gap-1.5 w-full transition-colors items-center justify-center
                  @click="copyPrompt"
                >
                  <span v-if="copySuccess" i-carbon-checkmark />
                  <span v-else i-carbon-copy />
                  <span>{{ copySuccess ? '已复制' : '复制提示词' }}</span>
                </button>
              </div>
            </div>
            <p v-else text="[9px] zinc-400">
              点击展开查看生成精灵图的 AI 提示词模板
            </p>
          </section>

          <!-- Upload Section -->
          <section>
            <h3 text="[10px] zinc-500" tracking-wider font-bold mb-3 uppercase>
              精灵图
            </h3>
            <UploadZone v-if="!hasImage" :multiple="false" @upload="handleUpload" />
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

          <!-- Sprite Sheet Preview -->
          <section v-if="hasImage">
            <h3 text="[10px] zinc-500" tracking-wider font-bold mb-2 uppercase>
              预览
            </h3>
            <div
              border="1 zinc-200 dark:zinc-800"
              bg="zinc-50 dark:zinc-900/50"
              p-2
              rounded-lg
              flex
              flex-col
              gap-1
              items-center
            >
              <img
                :src="imageSrc"

                rounded max-h-24 w-full object-contain
              >
              <span text="[9px] zinc-400">
                {{ cols }} 列 × {{ rows }} 行
              </span>
            </div>
          </section>

          <!-- Grid Configuration -->
          <template v-if="hasImage">
            <section
              border="1 zinc-200 dark:zinc-800"
              bg="white dark:zinc-900/50"
              p-4
              rounded-xl
              shadow-sm
            >
              <h3 text="[10px] zinc-500" tracking-wider font-bold mb-4 uppercase>
                配置
              </h3>
              <div space-y-4>
                <div gap-3 grid grid-cols-2>
                  <div space-y-1.5>
                    <label text="[10px] zinc-500 dark:zinc-400">列数（帧数）</label>
                    <input
                      v-model.number="cols"
                      type="number"
                      min="1"
                      max="20"
                      border="1 zinc-200 dark:zinc-700"
                      text="xs zinc-900 dark:zinc-100"
                      px-2
                      py-1.5
                      outline-none
                      rounded-md
                      bg="white dark:zinc-800"
                      w-full
                      transition-colors
                      focus:border-emerald-500
                    >
                  </div>
                  <div space-y-1.5>
                    <label text="[10px] zinc-500 dark:zinc-400">行数（动画数）</label>
                    <input
                      v-model.number="rows"
                      type="number"
                      min="1"
                      max="20"
                      border="1 zinc-200 dark:zinc-700"
                      text="xs zinc-900 dark:zinc-100"
                      px-2
                      py-1.5
                      outline-none
                      rounded-md
                      bg="white dark:zinc-800"
                      w-full
                      transition-colors
                      focus:border-emerald-500
                    >
                  </div>
                </div>

                <div space-y-1.5>
                  <div flex items-center justify-between>
                    <label text="[10px] zinc-500 dark:zinc-400">帧率</label>
                    <span text="[10px] emerald-500">{{ fps }} FPS</span>
                  </div>
                  <input
                    v-model.number="fps"
                    type="range"
                    min="1"
                    max="30"
                    accent-emerald-500
                    w-full
                  >
                </div>

                <div space-y-1.5>
                  <div flex items-center justify-between>
                    <label text="[10px] zinc-500 dark:zinc-400">品红容差</label>
                    <span text="[10px] emerald-500">{{ tolerance }}</span>
                  </div>
                  <input
                    v-model.number="tolerance"
                    type="range"
                    min="50"
                    max="200"
                    accent-emerald-500
                    w-full
                  >
                </div>

                <div gap-3 grid grid-cols-2>
                  <div space-y-1.5>
                    <label text="[10px] zinc-500 dark:zinc-400">输出宽度</label>
                    <input
                      v-model.number="outputWidth"
                      type="number"
                      min="60"
                      max="1024"
                      step="10"
                      border="1 zinc-200 dark:zinc-700"
                      text="xs zinc-900 dark:zinc-100"
                      px-2
                      py-1.5
                      outline-none
                      rounded-md
                      bg="white dark:zinc-800"
                      w-full
                      transition-colors
                      focus:border-emerald-500
                    >
                  </div>
                  <div space-y-1.5>
                    <label text="[10px] zinc-500 dark:zinc-400">输出高度</label>
                    <input
                      v-model.number="outputHeight"
                      type="number"
                      min="60"
                      max="1024"
                      step="10"
                      border="1 zinc-200 dark:zinc-700"
                      text="xs zinc-900 dark:zinc-100"
                      px-2
                      py-1.5
                      outline-none
                      rounded-md
                      bg="white dark:zinc-800"
                      w-full
                      transition-colors
                      focus:border-emerald-500
                    >
                  </div>
                </div>
              </div>
            </section>
          </template>
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
              :disabled="isProcessing"
              @click="processImage"
            >
              <div flex gap-1.5 items-center justify-center>
                <div v-if="isProcessing" i-carbon-rotate-360 animate-spin />
                <span v-else i-carbon-play />
                <span>{{ isProcessing ? '处理中...' : '生成 GIF' }}</span>
              </div>
            </button>

            <button
              v-if="gifUrls.filter(Boolean).length > 0"
              border="1 zinc-200 dark:zinc-700"
              hover:bg="zinc-100 dark:zinc-800"
              text="xs zinc-600 dark:zinc-400"
              font-bold
              py-3
              rounded-xl
              w-full
              transition-colors
              @click="handleDownloadAll"
            >
              <div flex gap-1.5 items-center justify-center>
                <span i-carbon-download />
                <span>下载全部 ZIP</span>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
