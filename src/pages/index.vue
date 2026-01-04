<script setup lang="ts">
import type { SplitLine } from '../utils/splitImage'
import { computed, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import ImageCanvas from '../components/ImageCanvas.vue'
import UploadZone from '../components/UploadZone.vue'
import { generateId } from '../utils/common'
import { downloadAsZip } from '../utils/downloadZip'
import { splitImage } from '../utils/splitImage'

const imageSrc = ref<string>('')
const splitLines = ref<SplitLine[]>([])
const isExporting = ref(false)
const canvasRef = ref<InstanceType<typeof ImageCanvas>>()

// Quick split inputs
const quickHLines = ref(0)
const quickVLines = ref(0)

function handleUpload(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    imageSrc.value = e.target?.result as string
    splitLines.value = []
    quickHLines.value = 0
    quickVLines.value = 0
  }
  reader.readAsDataURL(file)
}

async function handleExport() {
  const image = canvasRef.value?.getImage()
  if (!image || !imageSrc.value)
    return

  isExporting.value = true
  try {
    const blobs = await splitImage(image, splitLines.value)
    await downloadAsZip(blobs, 'image', splitLines.value)
  }
  catch (error) {
    console.error('Export failed:', error)
  }
  finally {
    isExporting.value = false
  }
}

function handleClear() {
  imageSrc.value = ''
  splitLines.value = []
  quickHLines.value = 0
  quickVLines.value = 0
}

function applyQuickSplit() {
  const newLines: SplitLine[] = []

  const hCount = Math.max(0, Math.min(20, quickHLines.value))
  for (let i = 1; i <= hCount; i++) {
    const position = (i / (hCount + 1)) * 100
    newLines.push({
      id: generateId(),
      type: 'h',
      position,
    })
  }

  const vCount = Math.max(0, Math.min(20, quickVLines.value))
  for (let i = 1; i <= vCount; i++) {
    const position = (i / (vCount + 1)) * 100
    newLines.push({
      id: generateId(),
      type: 'v',
      position,
    })
  }

  splitLines.value = newLines
}

const hLineCount = computed(() => splitLines.value.filter(l => l.type === 'h').length)
const vLineCount = computed(() => splitLines.value.filter(l => l.type === 'v').length)
const pieceCount = computed(() => (hLineCount.value + 1) * (vLineCount.value + 1))
</script>

<template>
  <AppHeader />

  <div flex flex-1 overflow-hidden>
    <!-- Left sidebar -->
    <aside
      bg="slate-800/30"
      border-r="1 slate-700/50"
      p-5 flex flex-shrink-0 flex-col gap-5 w-72 backdrop-blur-sm
    >
      <UploadZone @upload="handleUpload" />

      <!-- Stats & Actions -->
      <div v-if="imageSrc" flex flex-col gap-4>
        <!-- Quick split section -->
        <div
          p-4 rounded-xl
          bg="slate-800/50"
          border="1 slate-700/30"
        >
          <p text-sm text-slate-400 font-medium mb-3>
            Quick Split
          </p>
          <div flex flex-col gap-3>
            <div flex gap-2 items-center>
              <label text-xs text-slate-500 w-20>Horizontal</label>
              <input
                v-model.number="quickHLines"
                type="number"
                min="0"
                max="20"
                bg="slate-700/50"
                border="1 slate-600/50"
                focus:border="cyan-500/50"
                text-sm text-white px-3 py-2 outline-none rounded-lg w-full transition-colors
              >
            </div>
            <div flex gap-2 items-center>
              <label text-xs text-slate-500 w-20>Vertical</label>
              <input
                v-model.number="quickVLines"
                type="number"
                min="0"
                max="20"
                bg="slate-700/50"
                border="1 slate-600/50"
                focus:border="cyan-500/50"
                text-sm text-white px-3 py-2 outline-none rounded-lg w-full transition-colors
              >
            </div>
            <button
              bg="cyan-600/80"
              hover:bg="cyan-500/80"
              text-sm text-white px-3 py-2 rounded-lg flex gap-2 w-full cursor-pointer transition-colors items-center justify-center
              @click="applyQuickSplit"
            >
              <span i-carbon-grid />
              Apply
            </button>
          </div>
        </div>

        <!-- Stats cards -->
        <div gap-3 grid grid-cols-2>
          <div
            bg="slate-800/50"
            border="1 slate-700/30"
            p-4 text-center rounded-xl
          >
            <p text-2xl text-cyan-400 font-bold>
              {{ splitLines.length }}
            </p>
            <p text-xs text-slate-500 mt-1>
              Lines
            </p>
          </div>
          <div
            bg="slate-800/50"
            border="1 slate-700/30"
            p-4 text-center rounded-xl
          >
            <p text-2xl text-fuchsia-400 font-bold>
              {{ pieceCount }}
            </p>
            <p text-xs text-slate-500 mt-1>
              Pieces
            </p>
          </div>
        </div>

        <!-- Export button -->
        <button
          bg="gradient-to-r from-violet-600 to-fuchsia-600"
          hover:bg="gradient-to-r from-violet-500 to-fuchsia-500"
          shadow="lg violet-500/20"
          hover:shadow="lg violet-500/40"
          text-base text-white font-semibold px-5 py-4 rounded-xl flex gap-2 w-full cursor-pointer transition-all duration-300 items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 hover:scale-102 disabled:hover:scale-100
          :disabled="isExporting || splitLines.length === 0"
          @click="handleExport"
        >
          <span v-if="isExporting" i-carbon-rotate-360 animate-spin />
          <span v-else i-carbon-download />
          {{ isExporting ? 'Exporting...' : 'Export ZIP' }}
        </button>

        <!-- Clear button -->
        <button
          border="1 slate-600"
          hover:border="red-500/50"
          hover:bg="red-500/10"
          text-sm text-slate-400 px-4 py-3 rounded-lg bg-transparent flex gap-2 w-full cursor-pointer transition-all duration-200 items-center justify-center hover:text-red-400
          @click="handleClear"
        >
          <span i-carbon-trash-can />
          Clear Image
        </button>

        <!-- Help text -->
        <div
          mt-auto p-4
          bg="slate-800/30"
          rounded-xl
          border="1 slate-700/20"
        >
          <p text-xs text-slate-500 leading-relaxed>
            <span text-slate-400 font-medium>Tips:</span><br>
            • Drag from edges to create lines<br>
            • Drag lines to reposition<br>
            • Click to select, arrows to move<br>
            • Double-click or Del to delete
          </p>
        </div>
      </div>
    </aside>

    <!-- Main canvas area -->
    <main p-5 flex-1 overflow-hidden>
      <!-- Empty state -->
      <div
        v-if="!imageSrc"
        text-center flex flex-col gap-4 h-full items-center justify-center
      >
        <div
          bg="slate-800/50"
          border="1 slate-700/30"
          text-5xl rounded-3xl flex h-24 w-24 items-center justify-center
        >
          🖼️
        </div>
        <div>
          <p text-xl text-slate-400 font-medium>
            No image loaded
          </p>
          <p text-sm text-slate-600 mt-1>
            Upload an image from the sidebar to start splitting
          </p>
        </div>
      </div>

      <ImageCanvas
        v-else
        ref="canvasRef"
        v-model:lines="splitLines"
        :image-src="imageSrc"
      />
    </main>
  </div>
</template>
