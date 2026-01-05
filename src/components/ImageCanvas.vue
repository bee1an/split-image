<script setup lang="ts">
import type { SplitLine } from '../utils/splitImage'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { isDark } from '../composables/dark'
import { CANVAS_CONSTANTS, COLOR_CONSTANTS, LINE_STYLE_CONSTANTS } from '../config/constants'
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

const draggingLineId = ref<string | null>(null)
const creatingLine = ref<{ type: 'h' | 'v', position: number } | null>(null)

/**
 * 绘制分割线的路径
 * @param ctx Canvas 上下文
 * @param line 分割线对象
 * @param width 画布宽度
 * @param height 画布高度
 */
function drawLinePath(
  ctx: CanvasRenderingContext2D,
  line: SplitLine,
  width: number,
  height: number,
) {
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
}
const cursorStyle = ref('default')
const isAnimating = ref(false)

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
  if (pos.x <= CANVAS_CONSTANTS.EDGE_THRESHOLD)
    return 'left'
  if (pos.x >= width - CANVAS_CONSTANTS.EDGE_THRESHOLD)
    return 'right'
  if (pos.y <= CANVAS_CONSTANTS.EDGE_THRESHOLD)
    return 'top'
  if (pos.y >= height - CANVAS_CONSTANTS.EDGE_THRESHOLD)
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
      if (Math.abs(pos.y - lineY) <= CANVAS_CONSTANTS.LINE_HIT_THRESHOLD) {
        return line
      }
    }
    else {
      const lineX = (line.position / 100) * width
      if (Math.abs(pos.x - lineX) <= CANVAS_CONSTANTS.LINE_HIT_THRESHOLD) {
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
    let strokeColor: string = isDark.value ? COLOR_CONSTANTS.LINE_DEFAULT_DARK : COLOR_CONSTANTS.LINE_DEFAULT_LIGHT
    let lineWidth: number = LINE_STYLE_CONSTANTS.DEFAULT_WIDTH

    if (isSelected) {
      strokeColor = COLOR_CONSTANTS.SELECTED
      lineWidth = LINE_STYLE_CONSTANTS.ACTIVE_WIDTH
    }
    else if (isHovered) {
      strokeColor = COLOR_CONSTANTS.HOVERED
      lineWidth = LINE_STYLE_CONSTANTS.ACTIVE_WIDTH
    }

    // Draw line shadow/glow for better contrast on complex backgrounds
    ctx.strokeStyle = isDark.value ? COLOR_CONSTANTS.SHADOW_DARK : COLOR_CONSTANTS.SHADOW_LIGHT
    ctx.lineWidth = lineWidth + LINE_STYLE_CONSTANTS.SHADOW_EXTRA_WIDTH
    drawLinePath(ctx, line, width, height)
    ctx.stroke()

    // Draw main line
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.setLineDash([])
    drawLinePath(ctx, line, width, height)
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
    ctx.strokeStyle = COLOR_CONSTANTS.SELECTED
    ctx.lineWidth = LINE_STYLE_CONSTANTS.DEFAULT_WIDTH
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
  playExportAnimation,
  draw,
})

// Animation: split pieces fly to target
interface AnimatedPiece {
  img: ImageData
  startX: number
  startY: number
  width: number
  height: number
  progress: number
  delay: number
}

async function playExportAnimation(targetElement: HTMLElement): Promise<void> {
  if (isAnimating.value || !canvasRef.value || !imageRef.value)
    return

  isAnimating.value = true

  const canvas = canvasRef.value
  const image = imageRef.value
  const { width, height } = displaySize.value
  const canvasRect = canvas.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()

  // Use viewport coordinates for target position
  const targetX = targetRect.left + targetRect.width / 2
  const targetY = targetRect.top + targetRect.height / 2

  // Get horizontal and vertical split positions
  const hPositions = [0, ...lines.value.filter(l => l.type === 'h').map(l => l.position).sort((a, b) => a - b), 100]
  const vPositions = [0, ...lines.value.filter(l => l.type === 'v').map(l => l.position).sort((a, b) => a - b), 100]

  // Create offscreen canvas to extract pieces
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const offCtx = offscreen.getContext('2d')!
  offCtx.drawImage(image, 0, 0, width, height)

  // Extract all pieces with viewport start positions
  const pieces: AnimatedPiece[] = []
  let pieceIndex = 0

  for (let row = 0; row < hPositions.length - 1; row++) {
    for (let col = 0; col < vPositions.length - 1; col++) {
      const x = Math.round((vPositions[col] / 100) * width)
      const y = Math.round((hPositions[row] / 100) * height)
      const w = Math.round((vPositions[col + 1] / 100) * width) - x
      const h = Math.round((hPositions[row + 1] / 100) * height) - y

      if (w > 0 && h > 0) {
        const imgData = offCtx.getImageData(x, y, w, h)
        // Convert to viewport coordinates
        pieces.push({
          img: imgData,
          startX: canvasRect.left + x,
          startY: canvasRect.top + y,
          width: w,
          height: h,
          progress: 0,
          delay: pieceIndex * 25, // Stagger animation
        })
        pieceIndex++
      }
    }
  }

  // Create fullscreen animation layer
  const animLayer = document.createElement('canvas')
  animLayer.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;'
  animLayer.width = window.innerWidth
  animLayer.height = window.innerHeight
  document.body.appendChild(animLayer)

  const animCtx = animLayer.getContext('2d')!
  const animWidth = animLayer.width
  const animHeight = animLayer.height

  const duration = 800 // ms
  const startTime = performance.now()

  return new Promise((resolve) => {
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime

      animCtx.clearRect(0, 0, animWidth, animHeight)

      let allDone = true

      for (const piece of pieces) {
        const pieceElapsed = elapsed - piece.delay
        if (pieceElapsed < 0) {
          allDone = false
          // Draw piece at original position
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = piece.width
          tempCanvas.height = piece.height
          const tempCtx = tempCanvas.getContext('2d')!
          tempCtx.putImageData(piece.img, 0, 0)
          animCtx.drawImage(tempCanvas, piece.startX, piece.startY)
          continue
        }

        const t = Math.min(pieceElapsed / duration, 1)
        piece.progress = t

        if (t < 1)
          allDone = false

        // Easing function (ease-in-out cubic)
        const easeT = t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2

        // Linear interpolation for X
        const currentX = piece.startX + (targetX - piece.startX - piece.width / 2) * easeT

        // Linear interpolation for Y with parabolic arc
        const baseY = piece.startY + (targetY - piece.startY - piece.height / 2) * easeT

        // Parabolic arc: peaks at t=0.5, arc goes upward
        const arcHeight = -200 * Math.sin(t * Math.PI)
        const finalY = baseY + arcHeight

        // Scale down as it approaches target
        const scale = 1 - easeT * 0.85

        // Fade out in the last 20%
        const opacity = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1

        // Draw piece
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = piece.width
        tempCanvas.height = piece.height
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(piece.img, 0, 0)

        animCtx.save()
        animCtx.globalAlpha = opacity
        animCtx.translate(currentX + (piece.width * scale) / 2, finalY + (piece.height * scale) / 2)
        animCtx.scale(scale, scale)
        animCtx.drawImage(tempCanvas, -piece.width / 2, -piece.height / 2)
        animCtx.restore()
      }

      if (!allDone) {
        requestAnimationFrame(animate)
      }
      else {
        // Remove animation layer
        document.body.removeChild(animLayer)
        isAnimating.value = false
        resolve()
      }
    }

    // Hide main canvas content during animation
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, width, height)

    requestAnimationFrame(animate)
  })
}
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

    <!-- Canvas wrapper for proper overlay positioning -->
    <div class="bg-checkered rounded-sm relative overflow-hidden">
      <canvas
        ref="canvasRef"
        :style="{ cursor: cursorStyle }"
        rounded-sm border="1 zinc-200 dark:zinc-800"
        shadow="[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)]" transition-all
        tabindex="0"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @dblclick="handleDoubleClick"
      />
    </div>

    <div
      v-if="displaySize.width > 0 && !selectedLineId && !creatingLine && !isAnimating"
      border="1 zinc-200 dark:zinc-800" bg="white/80 dark:zinc-950/80"

      text="[10px] zinc-500" fade-in slide-in-from-bottom-2 animate-in tracking-wider font-bold px-3 py-1 rounded-full flex gap-2 uppercase shadow="xl dark:2xl" transition-all items-center bottom-4 absolute backdrop-blur-md
    >
      <span i-carbon-touch-interaction text-emerald-500 dark:text-emerald-400 />
      从边缘拖拽开始切片
    </div>
  </div>
</template>
