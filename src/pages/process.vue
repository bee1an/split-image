<script setup lang="ts">
import UploadZone from '../components/UploadZone.vue'
import { useImageState } from '../composables/image'
import { useTempFolder } from '../composables/tempFolder'
import { downloadAsZip } from '../utils/downloadZip'
import { processWhiteBackgroundImage } from '../utils/imageProcess'

const {
  items,
  currentIndex,
  currentItem,
  imageSrc,
  addImages,
  updateItem,
  updateProcessedSrc,
  removeImage,
  resetToOriginal,
} = useImageState()

const processExpansion = ref(0)
const processPadding = ref(0)
const enableTrimMargins = ref(true)
const isProcessing = ref(false)
const selectedIds = ref<Set<string>>(new Set())

const { addFiles, open: openTempFolder } = useTempFolder()

// Selection Interaction
const previewRef = ref<HTMLDivElement>()
const isDrawing = ref(false)
const dragStart = ref({ x: 0, y: 0 })

function handleSelectionStart(e: MouseEvent) {
  if (!currentItem.value || !previewRef.value)
    return
  isDrawing.value = true
  const rect = previewRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
  dragStart.value = { x, y }
  updateItem(currentItem.value.id, {
    selection: { x, y, w: 0, h: 0 },
  })

  const handleMouseMove = (em: MouseEvent) => {
    if (!isDrawing.value || !currentItem.value)
      return
    const x2 = Math.max(0, Math.min(100, ((em.clientX - rect.left) / rect.width) * 100))
    const y2 = Math.max(0, Math.min(100, ((em.clientY - rect.top) / rect.height) * 100))

    updateItem(currentItem.value.id, {
      selection: {
        x: Math.min(dragStart.value.x, x2),
        y: Math.min(dragStart.value.y, y2),
        w: Math.abs(x2 - dragStart.value.x),
        h: Math.abs(y2 - dragStart.value.y),
      },
    })
  }

  const handleMouseUp = () => {
    isDrawing.value = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

function clearSelection() {
  if (currentItem.value) {
    updateItem(currentItem.value.id, { selection: undefined })
  }
}

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
}

async function processSingleImage(item: any) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const processedSrc = processWhiteBackgroundImage(img, {
          colorDistance: 30, // Default fixed tolerance
          padding: processPadding.value,
          trimMargins: enableTrimMargins.value,
          selection: item.selection,
          expansion: processExpansion.value,
        })
        updateProcessedSrc(item.id, processedSrc)
        resolve()
      }
      catch (error) {
        console.error(`Processing ${item.name} failed:`, error)
        resolve()
      }
    }
    img.src = item.originalSrc
  })
}

async function handleApplyCurrent() {
  if (!currentItem.value)
    return
  isProcessing.value = true
  await processSingleImage(currentItem.value)
  selectedIds.value.add(currentItem.value.id)
  isProcessing.value = false
}

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  }
  else {
    selectedIds.value.add(id)
  }
}

function toggleSelectAll() {
  if (selectedIds.value.size === items.value.length) {
    selectedIds.value.clear()
  }
  else {
    selectedIds.value = new Set(items.value.map(i => i.id))
  }
}

async function handleDownloadBatch() {
  const targets = items.value.filter(item => selectedIds.value.has(item.id))
  if (targets.length === 0)
    return

  const processedData = await Promise.all(
    targets.map(async (item) => {
      const resp = await fetch(item.processedSrc)
      const blob = await resp.blob()
      return {
        blob,
        name: item.name.replace(/\.[^/.]+$/, ''),
      }
    }),
  )

  await downloadAsZip(
    processedData.map(d => d.blob),
    'processed_images',
    [],
    'png',
    processedData.map(d => d.name),
  )
}

async function handleAddSelectedToTemp() {
  const targets = items.value.filter(item => selectedIds.value.has(item.id))
  if (targets.length === 0)
    return

  addFiles(
    targets.map(item => ({
      name: item.name.replace(/\.[^/.]+$/, ''),
      src: item.processedSrc,
      source: 'process' as const,
    })),
  )
  openTempFolder()
}
</script>

<template>
  <div bg="white dark:[#09090b]" text="zinc-900 dark:zinc-100" flex flex-col h-screen overflow-hidden>
    <div flex flex-1 overflow-hidden>
      <!-- Main Canvas Area -->
      <main bg="zinc-50 dark:[#0c0c0e]" p-8 flex flex-1 flex-col relative overflow-hidden>
        <div v-if="items.length === 0" flex h-full items-center justify-center>
          <div text-center flex flex-col max-w-sm items-center>
            <div rounded="[2.5rem]" mb-6 bg-white flex h-24 w-24 shadow-2xl items-center justify-center dark:bg-zinc-900 border="1 zinc-200 dark:zinc-800/50">
              <span i-carbon-image-search text-5xl text-zinc-300 dark:text-zinc-700 />
            </div>
            <h2 text-xl text-zinc-900 font-bold mb-2 dark:text-zinc-100>
              准备处理素材
            </h2>
            <p text-sm text-zinc-500>
              从右侧侧边栏导入素材。您可以进行批量背景去除。
            </p>
          </div>
        </div>

        <div v-else flex flex-col gap-6 h-full overflow-hidden>
          <!-- Hero Preview -->
          <div v-if="currentItem" flex flex-1 items-center justify-center relative>
            <div
              ref="previewRef"
              class="bg-checkered group/canvas rounded-xl cursor-crosshair select-none shadow-2xl relative overflow-hidden"
              @mousedown="handleSelectionStart"
            >
              <img :src="imageSrc" class="max-h-[60vh] w-auto block pointer-events-none object-contain">

              <!-- Selection Box -->
              <div
                v-if="currentItem.selection"
                border="2 emerald-500"
                pointer-events-none absolute bg="emerald-500/10" shadow="[0_0_0_9999px_rgba(0,0,0,0.5)]"
                :style="{
                  left: `${currentItem.selection.x}%`,
                  top: `${currentItem.selection.y}%`,
                  width: `${currentItem.selection.w}%`,
                  height: `${currentItem.selection.h}%`,
                }"
              >
                <div text="[10px] white" bottom="full" font-bold mb-1 px-1.5 py-0.5 rounded bg-emerald-500 whitespace-nowrap left-0 absolute>
                  选区内闭合区域将被清除
                </div>
              </div>

              <!-- Selection Hint -->
              <div v-if="!currentItem.selection" class="group-hover:opacity-100" bg="black/20" opacity-0 flex pointer-events-none transition-opacity items-center inset-0 justify-center absolute>
                <div px-4 py-2 rounded-full bg-white flex gap-2 shadow-xl items-center backdrop-blur dark:bg-zinc-900>
                  <div i-carbon-area text-emerald-500 />
                  <span text-xs font-bold>拖拽创建一个强制清除选区</span>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div flex gap-3 bottom-0 absolute translate-y="1/2">
              <button
                v-if="currentItem.selection"
                text-white p-3 rounded-full bg-emerald-600 shadow-xl transition-all active:scale-90 hover:scale-110
                title="清除选区"
                @click="clearSelection"
              >
                <div i-carbon-close />
              </button>
              <button
                bg="white dark:zinc-800" border="1 zinc-200 dark:zinc-700"
                p-3 rounded-full shadow-xl transition-all active:scale-90 hover:scale-110
                title="重置加工"
                @click="resetToOriginal(currentItem.id)"
              >
                <div i-carbon-reset text-zinc-600 />
              </button>
              <button
                bg="white dark:zinc-800" border="1 zinc-200 dark:zinc-700"
                p-3 rounded-full shadow-xl transition-all active:scale-90 hover:scale-110
                title="彻底删除"
                @click="removeImage(currentItem.id)"
              >
                <div i-carbon-trash-can text-red-500 />
              </button>
            </div>
          </div>

          <!-- Thumbnail Gallery -->
          <div border-t="1 zinc-200 dark:zinc-800" pt-4 flex-shrink-0>
            <div mb-4 flex items-center justify-between>
              <div flex gap-3 items-center>
                <h3 text="[10px]" text-zinc-500 tracking-wider font-bold uppercase>
                  已导入 ({{ items.length }})
                </h3>
                <button
                  text="[10px] emerald-500" font-bold hover:underline
                  @click="toggleSelectAll"
                >
                  {{ selectedIds.size === items.length ? '取消全选' : '全选' }}
                </button>
              </div>

              <div v-if="selectedIds.size > 0" flex gap-4>
                <button
                  text="[10px] red-500" font-bold hover:underline
                  @click="selectedIds.forEach(id => removeImage(id)); selectedIds.clear()"
                >
                  删除选中
                </button>
              </div>
            </div>

            <div class="custom-scrollbar" onscreen-scrollbar pb-2 flex gap-4 min-w-0 overflow-x-auto>
              <div
                v-for="(item, idx) in items"
                :key="item.id"
                class="group border-2 rounded-lg flex-shrink-0 h-24 w-24 cursor-pointer transition-all relative overflow-hidden"
                :class="[
                  currentIndex === idx ? 'border-emerald-500 shadow-lg' : 'border-transparent shadow-sm',
                  selectedIds.has(item.id) ? 'ring-2 ring-emerald-500/50' : '',
                ]"
                @click="currentIndex = idx"
              >
                <img :src="item.processedSrc" class="bg-checkered h-full w-full object-cover">

                <!-- Selection Overlay -->
                <div
                  bg="white/90 dark:zinc-800/90" rounded-md flex h-5 w-5 shadow-sm transition-transform items-center left-1 top-1 justify-center absolute active:scale-95
                  @click.stop="toggleSelect(item.id)"
                >
                  <div
                    v-if="selectedIds.has(item.id)"
                    i-carbon-checkmark text-xs text-emerald-500
                  />
                </div>

                <!-- Hover Label -->
                <div text-white p-1 text-center bg-black opacity-0 transition-opacity inset-x-0 bottom-0 absolute group-hover:opacity-100>
                  <span text="[8px]" block truncate>{{ item.name }}</span>
                </div>
              </div>

              <!-- Inline Upload -->
              <input
                id="gallery-upload"
                type="file"
                multiple
                accept="image/*"
                hidden
                @change="(e) => handleUpload(Array.from((e.target as HTMLInputElement).files || []))"
              >
              <label
                for="gallery-upload"
                border="2 dashed zinc-300 dark:zinc-800"
                bg="zinc-50/50 dark:zinc-900/30" class="hover:border-emerald-500" rounded-lg flex flex-shrink-0 h-24 w-24 cursor-pointer transition-all items-center justify-center
              >
                <div i-carbon-add text-zinc-400 />
              </label>
            </div>
          </div>
        </div>
      </main>

      <!-- Sidebar Controls -->
      <aside border-l="zinc-200 dark:zinc-800" bg-white flex flex-col w-80 shadow-md shadow-zinc-200 overflow-hidden dark:bg-zinc-950 dark:shadow-none>
        <div class="custom-scrollbar" onscreen-scrollbar p-4 flex flex-1 flex-col gap-6 overflow-y-auto>
          <section>
            <h3 text="[10px]" text-zinc-500 tracking-wider font-bold mb-3 uppercase>
              导入素材
            </h3>
            <UploadZone @upload="handleUpload" />
          </section>

          <template v-if="items.length > 0">
            <section border="1 zinc-200 dark:zinc-800" bg="white dark:zinc-900/50" p-4 rounded-xl shadow-sm>
              <h3 text="[10px]" text-zinc-500 tracking-wider font-bold mb-4 flex uppercase items-center justify-between>
                智能去白底
                <span v-if="isProcessing" i-carbon-progress-bar-round text-emerald-500 animate-spin />
              </h3>
              <div space-y-6>
                <!-- Color Distance is now internal/automatic -->

                <div space-y-3>
                  <div flex items-center justify-between>
                    <label text="[10px] zinc-500 dark:zinc-400">清除范围 (消除白边)</label>
                    <span text="[10px] emerald-500">+{{ processExpansion }}px</span>
                  </div>
                  <input
                    v-model.number="processExpansion"
                    type="range"
                    min="0"
                    max="10"
                    accent-emerald-500 w-full
                  >
                  <p text="[9px] zinc-400">
                    数值越大越能消除残留的亮色边缘
                  </p>
                </div>

                <div space-y-3>
                  <div flex items-center justify-between>
                    <label text="[10px] zinc-500 dark:zinc-400">自动裁剪空白</label>
                    <button
                      p-0.5 rounded-full h-5 w-9 cursor-pointer transition-colors
                      :class="enableTrimMargins ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'"
                      @click="enableTrimMargins = !enableTrimMargins"
                    >
                      <div
                        rounded-full bg-white h-4 w-4 shadow-sm transition-transform
                        :class="enableTrimMargins ? 'translate-x-4' : 'translate-x-0'"
                      />
                    </button>
                  </div>
                  <div v-if="enableTrimMargins" space-y-1.5>
                    <label text="[9px] zinc-400 dark:zinc-500">内边距 (px)</label>
                    <div flex gap-2 items-center>
                      <input
                        v-model.number="processPadding"
                        type="number"
                        min="0"
                        max="100"
                        border="1 zinc-200 dark:zinc-700" text-xs text-zinc-900 px-2 py-1.5 outline-none rounded-md bg-white flex-1 dark:text-zinc-100 focus:border-emerald-500 dark:bg-zinc-800
                      >
                    </div>
                  </div>
                </div>

                <div pt-2 flex flex-col gap-2>
                  <button
                    bg="emerald-600 hover:emerald-500" text-xs text-white font-bold py-2.5 rounded-md w-full cursor-pointer shadow-lg transition-all disabled:opacity-50 active:scale-95
                    :disabled="isProcessing || !currentItem"
                    @click="handleApplyCurrent"
                  >
                    <div flex gap-1.5 items-center justify-center>
                      <div v-if="isProcessing" i-carbon-rotate-360 animate-spin />
                      <span>确定并勾选</span>
                    </div>
                  </button>

                  <template v-if="selectedIds.size > 0">
                    <div flex gap-2>
                      <button
                        border="1 zinc-200 dark:zinc-700" text-xs text-zinc-600 font-bold py-2.5 rounded-md flex-1 transition-colors dark:text-zinc-400 hover:bg="zinc-100 dark:zinc-800"
                        @click="handleAddSelectedToTemp"
                      >
                        <div flex gap-1 items-center justify-center>
                          <span i-carbon-folder-add text-sm />
                          <span>添加到临时</span>
                        </div>
                      </button>
                      <button
                        border="1 zinc-200 dark:zinc-700" text-xs text-zinc-600 font-bold py-2.5 rounded-md flex-1 transition-colors dark:text-zinc-400 hover:bg="zinc-100 dark:zinc-800"
                        @click="handleDownloadBatch"
                      >
                        <div flex gap-1 items-center justify-center>
                          <span i-carbon-download text-sm />
                          <span>下载 ZIP</span>
                        </div>
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </section>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>
