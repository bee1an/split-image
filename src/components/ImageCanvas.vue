<script setup lang="ts">
import type { SplitLine } from '../utils/splitImage'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { clamp, generateId } from '../utils/common'

defineProps<{
  imageSrc: string
}>()

const emit = defineEmits<{
  'update:lines': [lines: SplitLine[]]
  'update:selectedLineId': [id: string | null]
  'update:hoveredLineId': [id: string | null]
}>()

const lines = defineModel<SplitLine[]>('lines', { default: () => [] })
const selectedLineId = defineModel<string | null>('selectedLineId', { default: null })
const hoveredLineId = defineModel<string | null>('hoveredLineId', { default: null })

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const imageRef = ref<HTMLImageElement>()

const containerSize = ref({ width: 0, height: 0 })
const imageNaturalSize = ref({ width: 0, height: 0 })

const displaySize = computed(() => {
  const { width: natW, height: natH } = imageNaturalSize.value
  const { width: contW, height: contH } = containerSize.value

  if (!natW || !natH || !contW || !contH) {
    return { width: 0, height: 0 }
  }

  const ratioW = (contW - 64) / natW
  const ratioH = (contH - 64) / natH
  const ratio = Math.min(ratioW, ratioH, 1)

  return {
    width: Math.floor(natW * ratio),
    height: Math.floor(natH * ratio),
  }
})

const EDGE_THRESHOLD = 24
const LINE_HIT_THRESHOLD = 10

const draggingLineId = ref<string | null>(null)
const creatingLine = ref<{ type: 'h' | 'v', position: number } | null>(null)
const cursorStyle = ref('default')

function getCanvasRect() {
  return canvasRef.value?.getBoundingClientRect() ?? null
}

function getMousePosition(e: MouseEvent): { x: number, y: number, xPercent: number, yPercent: number } {
  const rect = getCanvasRect()
  if (!rect)
    return { x: 0, y: 0, xPercent: 0, yPercent: 0 }

  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const xPercent = rect.width > 0 ? (x / rect.width) * 100 : 0
  const yPercent = rect.height > 0 ? (y / rect.height) * 100 : 0

  return { x, y, xPercent, yPercent }
}

function isNearEdge(pos: { x: number, y: number }): 'left' | 'right' | 'top' | 'bottom' | null {
  const rect = getCanvasRect()
  if (!rect)
    return null

  const { width, height } = rect

  if (pos.x < 0 || pos.x > width || pos.y < 0 || pos.y > height) {
    return null
  }
  if (pos.x <= EDGE_THRESHOLD)
    return 'left'
  if (pos.x >= width - EDGE_THRESHOLD)
    return 'right'
  if (pos.y <= EDGE_THRESHOLD)
    return 'top'
  if (pos.y >= height - EDGE_THRESHOLD)
    return 'bottom'
  return null
}

function findLineAtPosition(pos: { x: number, y: number }): SplitLine | null {
  const rect = getCanvasRect()
  if (!rect)
    return null

  const { width, height } = rect

  for (const line of lines.value) {
    if (line.type === 'h') {
      const lineY = (line.position / 100) * height
      if (Math.abs(pos.y - lineY) <= LINE_HIT_THRESHOLD) {
        return line
      }
    }
    else {
      const lineX = (line.position / 100) * width
      if (Math.abs(pos.x - lineX) <= LINE_HIT_THRESHOLD) {
        return line
      }
    }
  }
  return null
}

function updateLines(newLines: SplitLine[]) {
  lines.value = newLines
  emit('update:lines', newLines)
}

function handleMouseDown(e: MouseEvent) {
  const pos = getMousePosition(e)
  const edge = isNearEdge(pos)

  const hitLine = findLineAtPosition(pos)
  if (hitLine) {
    draggingLineId.value = hitLine.id
    selectedLineId.value = hitLine.id
    emit('update:selectedLineId', hitLine.id)
    draw()
    return
  }

  selectedLineId.value = null
  emit('update:selectedLineId', null)

  if (edge === 'left' || edge === 'right') {
    creatingLine.value = { type: 'v', position: pos.xPercent }
  }
  else if (edge === 'top' || edge === 'bottom') {
    creatingLine.value = { type: 'h', position: pos.yPercent }
  }
}

function handleMouseMove(e: MouseEvent) {
  const pos = getMousePosition(e)
  const edge = isNearEdge(pos)
  const hitLine = findLineAtPosition(pos)

  if (draggingLineId.value) {
    const line = lines.value.find(l => l.id === draggingLineId.value)
    if (line) {
      const newPosition = line.type === 'h' ? pos.yPercent : pos.xPercent
      line.position = clamp(newPosition, 0, 100)
      updateLines([...lines.value])
      draw()
      cursorStyle.value = line.type === 'h' ? 'row-resize' : 'col-resize'
    }
  }
  else if (creatingLine.value) {
    creatingLine.value.position = creatingLine.value.type === 'h' ? pos.yPercent : pos.xPercent
    draw()
    cursorStyle.value = creatingLine.value.type === 'h' ? 'row-resize' : 'col-resize'
  }
  else if (hitLine) {
    cursorStyle.value = hitLine.type === 'h' ? 'row-resize' : 'col-resize'
  }
  else if (edge === 'left' || edge === 'right') {
    cursorStyle.value = 'col-resize'
  }
  else if (edge === 'top' || edge === 'bottom') {
    cursorStyle.value = 'row-resize'
  }
  else {
    cursorStyle.value = 'default'
  }
}

function handleMouseUp() {
  if (creatingLine.value) {
    const pos = creatingLine.value.position
    if (pos > 1 && pos < 99) {
      const newLine: SplitLine = {
        id: generateId(),
        type: creatingLine.value.type,
        position: pos,
      }
      const newLines = [...lines.value, newLine]
      selectedLineId.value = newLine.id
      emit('update:selectedLineId', newLine.id)
      updateLines(newLines)
    }
  }
  creatingLine.value = null
  draggingLineId.value = null
  draw()
}

function handleDoubleClick(e: MouseEvent) {
  const pos = getMousePosition(e)
  const hitLine = findLineAtPosition(pos)
  if (hitLine) {
    const newLines = lines.value.filter(l => l.id !== hitLine.id)
    if (selectedLineId.value === hitLine.id) {
      selectedLineId.value = null
      emit('update:selectedLineId', null)
    }
    updateLines(newLines)
    draw()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }

  if (!selectedLineId.value)
    return

  const line = lines.value.find(l => l.id === selectedLineId.value)
  if (!line)
    return

  const { width, height } = displaySize.value
  if (!width || !height)
    return

  const pixelStepH = (1 / height) * 100
  const pixelStepV = (1 / width) * 100

  let moved = false

  if (line.type === 'h') {
    if (e.key === 'ArrowUp') {
      line.position = clamp(line.position - pixelStepH, 0, 100)
      moved = true
    }
    else if (e.key === 'ArrowDown') {
      line.position = clamp(line.position + pixelStepH, 0, 100)
      moved = true
    }
  }
  else {
    if (e.key === 'ArrowLeft') {
      line.position = clamp(line.position - pixelStepV, 0, 100)
      moved = true
    }
    else if (e.key === 'ArrowRight') {
      line.position = clamp(line.position + pixelStepV, 0, 100)
      moved = true
    }
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    const newLines = lines.value.filter(l => l.id !== selectedLineId.value)
    selectedLineId.value = null
    emit('update:selectedLineId', null)
    updateLines(newLines)
    draw()
    e.preventDefault()
    return
  }

  if (e.key === 'Escape') {
    selectedLineId.value = null
    emit('update:selectedLineId', null)
    draw()
    return
  }

  if (moved) {
    updateLines([...lines.value])
    draw()
    e.preventDefault()
  }
}

function draw() {
  const canvas = canvasRef.value
  const image = imageRef.value
  if (!canvas || !image)
    return

  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  const { width, height } = displaySize.value
  canvas.width = width
  canvas.height = height

  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)

  for (const line of lines.value) {
    const isSelected = line.id === selectedLineId.value
    const isHovered = line.id === hoveredLineId.value && !isSelected

    // Colors: selected = emerald, hovered = cyan, default = zinc
    let strokeColor = '#a1a1aa'
    let lineWidth = 1

    if (isSelected) {
      strokeColor = '#10b981'
      lineWidth = 2
    }
    else if (isHovered) {
      strokeColor = '#22d3ee'
      lineWidth = 2
    }

    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.setLineDash([])

    ctx.beginPath()
    if (line.type === 'h') {
      const y = (line.position / 100) * height
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    else {
      const x = (line.position / 100) * width
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    ctx.stroke()

    if (isSelected || isHovered) {
      ctx.fillStyle = strokeColor
      if (line.type === 'h') {
        const y = (line.position / 100) * height
        ctx.beginPath()
        ctx.arc(2, y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(width - 2, y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      else {
        const x = (line.position / 100) * width
        ctx.beginPath()
        ctx.arc(x, 2, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, height - 2, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  if (creatingLine.value) {
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    ctx.beginPath()
    if (creatingLine.value.type === 'h') {
      const y = (creatingLine.value.position / 100) * height
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    else {
      const x = (creatingLine.value.position / 100) * width
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function updateContainerSize() {
  if (containerRef.value) {
    containerSize.value = {
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight,
    }
  }
}

function handleImageLoad() {
  if (imageRef.value) {
    imageNaturalSize.value = {
      width: imageRef.value.naturalWidth,
      height: imageRef.value.naturalHeight,
    }
    draw()
  }
}

watch([displaySize, lines, selectedLineId, hoveredLineId], () => {
  draw()
})

onMounted(() => {
  updateContainerSize()
  window.addEventListener('resize', updateContainerSize)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize)
  window.removeEventListener('keydown', handleKeyDown)
})

defineExpose({
  getImage: () => imageRef.value,
})
</script>

<template>
  <div
    ref="containerRef"
    p-8 flex h-full w-full transition-colors duration-500 items-center justify-center relative
  >
    <img
      ref="imageRef"
      :src="imageSrc"
      hidden
      @load="handleImageLoad"
    >

    <canvas
      ref="canvasRef"
      :style="{ cursor: cursorStyle }"
      rounded-sm border="1 zinc-800"
      shadow="[0_0_50px_rgba(0,0,0,0.5)]" transition-all
      tabindex="0"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @dblclick="handleDoubleClick"
    />

    <div
      v-if="displaySize.width > 0 && !selectedLineId && !creatingLine"
      left="1/2" transform="-translate-x-1/2"
      border="1 zinc-800" bg="zinc-950"
      text="[10px] zinc-500" fade-in slide-in-from-bottom-2 animate-in tracking-wider font-bold px-3 py-1 rounded-full flex gap-2 uppercase shadow-2xl transition-all items-center bottom-4 absolute
    >
      <span i-carbon-touch-interaction text-emerald-400 />
      从边缘拖拽开始切片
    </div>
  </div>
</template>
