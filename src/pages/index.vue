<script setup lang="ts">
import type { ImageFormat, SplitLine } from '../utils/splitImage'
import ImageCanvas from '../components/ImageCanvas.vue'
import UploadZone from '../components/UploadZone.vue'

import { useImageState } from '../composables/image'
import { generateId } from '../utils/common'
import { downloadAsZip } from '../utils/downloadZip'
import { splitImage } from '../utils/splitImage'

const {
  items,
  currentIndex,
  imageSrc,
  addImages,
  clearImages: resetImage,
} = useImageState()
const splitLines = ref<SplitLine[]>([])
const isExporting = ref(false)
const canvasRef = ref<InstanceType<typeof ImageCanvas>>()
const exportButtonRef = ref<HTMLButtonElement>()

const quickHLines = ref(0)
const quickVLines = ref(0)

// Export options
const exportFormat = ref<ImageFormat>('png')
const exportQuality = ref(0.92)

// Line interaction state
const selectedLineId = ref<string | null>(null)
const hoveredLineId = ref<string | null>(null)

// Computed lists for horizontal and vertical lines
const hLines = computed(() =>
  splitLines.value
    .filter(l => l.type === 'h')
    .sort((a, b) => a.position - b.position),
)
const vLines = computed(() =>
  splitLines.value
    .filter(l => l.type === 'v')
    .sort((a, b) => a.position - b.position),
)

async function handleUpload(files: File[]) {
  const newFiles = await Promise.all(
    files.map(async (file) => {
      const src = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      return { name: file.name, src }
    }),
  )
  addImages(newFiles)
  splitLines.value = []
  quickHLines.value = 0
  quickVLines.value = 0
  selectedLineId.value = null
  hoveredLineId.value = null
}

async function handleExport() {
  const image = canvasRef.value?.getImage()
  if (!image || !imageSrc.value)
    return

  isExporting.value = true
  try {
    // Play animation before export
    if (exportButtonRef.value && canvasRef.value?.playExportAnimation) {
      await canvasRef.value.playExportAnimation(exportButtonRef.value)
    }

    const blobs = await splitImage(image, splitLines.value, {
      format: exportFormat.value,
      quality: exportQuality.value,
    })
    await downloadAsZip(blobs, 'image', splitLines.value, exportFormat.value)
  }
  catch (error) {
    console.error('导出失败:', error)
  }
  finally {
    isExporting.value = false
    // Redraw canvas after animation
    canvasRef.value?.draw()
  }
}

function handleClear() {
  resetImage()
  splitLines.value = []
  quickHLines.value = 0
  quickVLines.value = 0
  selectedLineId.value = null
  hoveredLineId.value = null
}

function applyQuickSplit() {
  const newLines: SplitLine[] = []
  const hCount = Math.max(0, Math.min(20, quickHLines.value))
  for (let i = 1; i <= hCount; i++) {
    const position = (i / (hCount + 1)) * 100
    newLines.push({ id: generateId(), type: 'h', position })
  }
  const vCount = Math.max(0, Math.min(20, quickVLines.value))
  for (let i = 1; i <= vCount; i++) {
    const position = (i / (vCount + 1)) * 100
    newLines.push({ id: generateId(), type: 'v', position })
  }
  splitLines.value = newLines
  selectedLineId.value = null
}

const hLineCount = computed(() => hLines.value.length)
const vLineCount = computed(() => vLines.value.length)
const pieceCount = computed(() => (hLineCount.value + 1) * (vLineCount.value + 1))

function removeLine(id: string) {
  splitLines.value = splitLines.value.filter(l => l.id !== id)
  if (selectedLineId.value === id) {
    selectedLineId.value = null
  }
  if (hoveredLineId.value === id) {
    hoveredLineId.value = null
  }
}

function handleLineHover(id: string | null) {
  hoveredLineId.value = id
}

function handleLineClick(id: string) {
  selectedLineId.value = id
}
</script>

<template>
  <div bg="white dark:[#09090b]" text="zinc-900 dark:zinc-100" flex flex-col h-screen overflow-hidden>
    <div flex flex-1 overflow-hidden>
      <main flex flex-1 flex-col relative bg="zinc-50 dark:[#0c0c0e]">
        <div v-if="!imageSrc" p-12 flex h-full items-center justify-center relative z-10>
          <div text-center flex flex-col max-w-sm items-center>
            <div rounded="[2.5rem]" mb-6 bg-white flex h-24 w-24 shadow-2xl items-center justify-center dark:bg-zinc-900 border="1 zinc-200 dark:zinc-800/50">
              <span i-carbon-image text-5xl text-zinc-300 dark:text-zinc-700 />
            </div>
            <h2 text-xl text-zinc-900 font-bold mb-2 dark:text-zinc-100>
              工作区为空
            </h2>
            <p text-sm text-zinc-500>
              从右侧侧边栏导入素材。然后你可以从图片边缘向内拖拽，精准创建切片分界线。
            </p>
          </div>
        </div>

        <div v-else p-8 flex flex-col h-full relative z-10 overflow-hidden>
          <div bg="white dark:zinc-950/50" border="1 zinc-200 dark:zinc-800" rounded-2xl flex-1 min-h-0 shadow-sm overflow-hidden dark:shadow-inner>
            <ImageCanvas
              ref="canvasRef"
              v-model:lines="splitLines"
              v-model:selected-line-id="selectedLineId"
              v-model:hovered-line-id="hoveredLineId"
              :image-src="imageSrc"
            />
          </div>
        </div>
      </main>

      <aside border-l="zinc-200 dark:zinc-800" bg-white flex flex-col w-80 shadow-md shadow-zinc-200 dark:bg-zinc-950 dark:shadow-none>
        <div class="custom-scrollbar" p-4 flex flex-1 flex-col gap-6 overflow-y-auto>
          <section>
            <h3 text="[10px]" text-zinc-500 tracking-wider font-bold mb-3 uppercase>
              原始图片
            </h3>
            <UploadZone @upload="handleUpload" />

            <!-- Gallery switcher in index page -->
            <div v-if="items.length > 1" class="custom-scrollbar" mt-4 px-1 gap-2 grid grid-cols-4 max-h-48 overflow-y-auto>
              <div
                v-for="(item, idx) in items"
                :key="item.id"
                class="border-2 rounded aspect-square cursor-pointer transition-all relative overflow-hidden"
                :class="currentIndex === idx ? 'border-emerald-500 shadow-sm' : 'border-transparent'"
                @click="currentIndex = idx"
              >
                <img :src="item.processedSrc" class="h-full w-full object-cover">
              </div>
            </div>

            <div v-if="imageSrc" border="1 zinc-200 dark:zinc-800" group mt-4 rounded-lg bg-white aspect-video relative overflow-hidden dark:bg-zinc-900>
              <img :src="imageSrc" h-full w-full transition-opacity object-contain class="bg-checkered">
              <div opacity-0 flex transition-opacity items-center inset-0 justify-center absolute group-hover="opacity-100 backdrop-blur-sm" bg="group-hover:zinc-900/50">
                <div flex flex-col gap-2>
                  <button
                    border="1 zinc-200" text-xs text-zinc-900 font-semibold px-4 py-2 rounded-md bg-zinc-100 shadow-xl transition-transform dark:text-zinc-100 dark:bg-zinc-800 active:scale-95 hover:scale-105
                    @click="handleClear"
                  >
                    更换图片
                  </button>
                  <RouterLink
                    to="/process"
                    border="1 emerald-500/30" text-xs text-emerald-400 font-semibold px-4 py-2 text-center rounded-md bg="emerald-500/10" shadow-xl transition-transform hover:bg="emerald-500/20" active:scale-95 hover:scale-105
                  >
                    去后期处理
                  </RouterLink>
                </div>
              </div>
            </div>
          </section>

          <template v-if="imageSrc">
            <section border="1 zinc-200 dark:zinc-800" bg="white dark:zinc-900/50" p-4 rounded-xl shadow-sm>
              <h3 text="[10px]" text-zinc-500 tracking-wider font-bold mb-4 uppercase>
                快速分割
              </h3>
              <div space-y-4>
                <div gap-3 grid grid-cols-2>
                  <div space-y-1.5>
                    <label text="[10px] zinc-500 dark:zinc-400">横向线数</label>
                    <input
                      v-model.number="quickHLines"
                      type="number"
                      min="0"
                      max="20"
                      border="1 zinc-200 dark:zinc-700" text-xs text-zinc-900 px-2 py-1.5 outline-none rounded-md bg-white w-full transition-colors dark:text-zinc-100 focus:border-emerald-500 dark:bg-zinc-800
                    >
                    <span text="[9px] zinc-400 dark:zinc-600">→ {{ quickHLines + 1 }} 行</span>
                  </div>
                  <div space-y-1.5>
                    <label text="[10px] zinc-500 dark:zinc-400">纵向线数</label>
                    <input
                      v-model.number="quickVLines"
                      type="number"
                      min="0"
                      max="20"
                      border="1 zinc-200 dark:zinc-700" text-xs text-zinc-900 px-2 py-1.5 outline-none rounded-md bg-white w-full transition-colors dark:text-zinc-100 focus:border-emerald-500 dark:bg-zinc-800
                    >
                    <span text="[9px] zinc-400 dark:zinc-600">→ {{ quickVLines + 1 }} 列</span>
                  </div>
                </div>
                <button
                  bg="emerald-600/90 dark:emerald-600/20 hover:emerald-600 dark:hover:emerald-600/30" text-xs text-white font-bold py-2.5 rounded-md w-full cursor-pointer shadow-md transition-all dark:text-emerald-400 active:scale-95 dark:border="1 emerald-500/30"
                  @click="applyQuickSplit"
                >
                  生成网格
                </button>
              </div>
            </section>

            <!-- Split Lines Section - Separated by type -->
            <section flex flex-1 flex-col gap-4 min-h-0>
              <div flex-1 gap-3 grid grid-cols-2 min-h-0>
                <!-- Horizontal Lines -->
                <div flex flex-col min-h-0>
                  <h3 text="[10px]" text-zinc-500 tracking-wider font-bold mb-2 py-1 bg-zinc-50 flex gap-2 uppercase items-center top-0 sticky z-20 dark:bg-zinc-950>
                    <span rounded-full bg-amber-500 h-1.5 w-1.5 />
                    横向 ({{ hLineCount }})
                  </h3>
                  <div v-if="hLines.length === 0" border="1 dashed zinc-200 dark:zinc-800" py-6 rounded-lg flex items-center justify-center>
                    <p text="[10px]" text-zinc-600>
                      无
                    </p>
                  </div>
                  <div v-else class="custom-scrollbar" pr-1 flex-1 overflow-y-auto space-y-1>
                    <div
                      v-for="line in hLines"
                      :key="line.id"
                      border="1 transparent" bg="white dark:zinc-900/50" group px-2 py-1.5 rounded-md flex cursor-pointer shadow-sm transition-all items-center justify-between dark:shadow-none
                      :class="{
                        '!border-emerald-500/50 !bg-emerald-500/10': selectedLineId === line.id,
                        '!border-cyan-500/50 !bg-cyan-500/5': hoveredLineId === line.id && selectedLineId !== line.id,
                      }"
                      @mouseenter="handleLineHover(line.id)"
                      @mouseleave="handleLineHover(null)"
                      @click="handleLineClick(line.id)"
                    >
                      <div flex gap-2 items-center>
                        <span text="[11px] zinc-600 dark:zinc-300" font-medium>
                          {{ Math.round(line.position) }}%
                        </span>
                      </div>
                      <button
                        text-zinc-500 opacity-0 transition-opacity group-hover="opacity-100" hover:text-red-400
                        @click.stop="removeLine(line.id)"
                      >
                        <span i-carbon-close text-sm />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Vertical Lines -->
                <div flex flex-col min-h-0>
                  <h3 text="[10px]" text-zinc-500 tracking-wider font-bold mb-2 py-1 bg-zinc-50 flex gap-2 uppercase items-center top-0 sticky z-20 dark:bg-zinc-950>
                    <span rounded-full bg-emerald-500 h-1.5 w-1.5 />
                    纵向 ({{ vLineCount }})
                  </h3>
                  <div v-if="vLines.length === 0" border="1 dashed zinc-200 dark:zinc-800" py-6 rounded-lg flex items-center justify-center>
                    <p text="[10px]" text-zinc-600>
                      无
                    </p>
                  </div>
                  <div v-else class="custom-scrollbar" pr-1 flex-1 overflow-y-auto space-y-1>
                    <div
                      v-for="line in vLines"
                      :key="line.id"
                      border="1 transparent" bg="white dark:zinc-900/50" group px-2 py-1.5 rounded-md flex cursor-pointer shadow-sm transition-all items-center justify-between dark:shadow-none
                      :class="{
                        '!border-emerald-500/50 !bg-emerald-500/10': selectedLineId === line.id,
                        '!border-cyan-500/50 !bg-cyan-500/5': hoveredLineId === line.id && selectedLineId !== line.id,
                      }"
                      @mouseenter="handleLineHover(line.id)"
                      @mouseleave="handleLineHover(null)"
                      @click="handleLineClick(line.id)"
                    >
                      <div flex gap-2 items-center>
                        <span text="[11px] zinc-600 dark:zinc-300" font-medium>
                          {{ Math.round(line.position) }}%
                        </span>
                      </div>
                      <button
                        text-zinc-500 opacity-0 transition-opacity group-hover="opacity-100" hover:text-red-400
                        @click.stop="removeLine(line.id)"
                      >
                        <span i-carbon-close text-sm />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </template>
        </div>

        <div v-if="imageSrc" border-t="zinc-200 dark:zinc-800" p-4 bg-white shadow-2xl dark:bg-zinc-950>
          <div border="1 zinc-100 dark:zinc-800" mb-4 p-3 rounded-lg bg-zinc-50 flex items-center justify-between dark:bg-zinc-900>
            <div flex flex-col>
              <span text="[10px] zinc-400 dark:zinc-500" font-bold uppercase>输出预览</span>
              <span text-sm text-zinc-900 font-bold dark:text-zinc-100>{{ pieceCount }} 张切片</span>
            </div>
            <div text-emerald-600 p-1.5 rounded-full bg-white flex h-8 w-8 shadow-sm items-center justify-center dark:text-emerald-400 dark:bg-zinc-800>
              <span i-carbon-grid text-lg block />
            </div>
          </div>

          <!-- Export Options -->
          <div mb-4 space-y-3>
            <div>
              <label text="[10px] zinc-500 dark:zinc-400" mb-1.5 block>导出格式</label>
              <div flex gap-2>
                <button
                  v-for="fmt in (['png', 'jpeg', 'webp'] as const)"
                  :key="fmt"
                  text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer uppercase transition-all
                  :class="exportFormat === fmt
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'"
                  @click="exportFormat = fmt"
                >
                  {{ fmt }}
                </button>
              </div>
            </div>
            <div v-if="exportFormat !== 'png'">
              <label text="[10px] zinc-500 dark:zinc-400" mb-1.5 block>
                质量 ({{ Math.round(exportQuality * 100) }}%)
              </label>
              <input
                v-model.number="exportQuality"
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                accent-emerald-500 w-full
              >
            </div>
          </div>

          <button
            ref="exportButtonRef"
            shadow="xl emerald-500/10 hover:emerald-500/20" active:scale="[0.98]"
            group py-4 rounded-xl bg-emerald-600 flex gap-2 w-full cursor-pointer transition-all items-center justify-center relative overflow-hidden hover:bg-emerald-500 disabled:opacity-50
            :disabled="isExporting || splitLines.length === 0"
            @click="handleExport"
          >
            <span v-if="isExporting" i-carbon-rotate-360 text-xl text-white animate-spin />
            <span v-else i-carbon-zip text-xl text-white />
            <span text-white tracking-tight font-bold>打包下载 ZIP</span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>
