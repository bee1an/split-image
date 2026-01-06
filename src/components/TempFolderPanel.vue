<script setup lang="ts">
import type { TempFile } from '../composables/tempFolder'
import type { Position } from '../composables/useDraggable'
import { useTempFolder } from '../composables/tempFolder'
import { useDraggable } from '../composables/useDraggable'
import { DRAG_CONSTANTS, TEMP_FOLDER_CONSTANTS } from '../config/constants'

const emit = defineEmits<{
  select: [file: TempFile]
}>()

const { files, isOpen, isDragging: isTempFileDragging, removeFile, clearAll, close, toggle } = useTempFolder()

// Panel drag state
const panelRef = ref<HTMLDivElement>()
const panelPosition = ref<Position>({
  x: DRAG_CONSTANTS.DEFAULT_PANEL_POSITION.x,
  y: DRAG_CONSTANTS.DEFAULT_PANEL_POSITION.y,
})
const panelDragOffset = ref<Position>({ x: 0, y: 0 })
const isPanelDragging = ref(false)

// 面板拖拽
const { startDrag: _startPanelDrag } = useDraggable({
  threshold: 0,
  offset: panelDragOffset,
  elementRef: panelRef,
  constrainToViewport: true,
  excludeSelector: 'button, img, .no-drag',
  onDragStart: () => {
    isPanelDragging.value = true
  },
  onDragMove: (_e, newPosition) => {
    panelPosition.value = newPosition
  },
  onDragEnd: () => {
    isPanelDragging.value = false
  },
})

function startPanelDrag(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('button, img, .no-drag'))
    return
  const rect = panelRef.value!.getBoundingClientRect()
  panelDragOffset.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
  _startPanelDrag(e)
}

// Button drag state
const buttonRef = ref<HTMLDivElement>()
const buttonPosition = ref<Position>({
  x: DRAG_CONSTANTS.DEFAULT_PANEL_POSITION.x,
  y: DRAG_CONSTANTS.DEFAULT_PANEL_POSITION.y,
})
const isButtonDragging = ref(false)

// 按钮拖拽
const { startDrag: startButtonDrag } = useDraggable({
  threshold: DRAG_CONSTANTS.THRESHOLD,
  elementRef: buttonRef,
  constrainToViewport: true,
  onDragStart: () => {
    isButtonDragging.value = true
    isTempFileDragging.value = true
  },
  onDragMove: (e) => {
    // 计算按钮位置（中心对齐鼠标，但会被边界限制）
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const buttonSize = 48 // w-12 = 48px
    const x = Math.max(0, Math.min(viewportWidth - buttonSize, e.clientX - DRAG_CONSTANTS.BUTTON_CENTER_OFFSET))
    const y = Math.max(0, Math.min(viewportHeight - buttonSize, e.clientY - DRAG_CONSTANTS.BUTTON_CENTER_OFFSET))
    buttonPosition.value = { x, y }
    // 同步面板位置
    panelPosition.value = buttonPosition.value
  },
  onDragEnd: (e, wasDragging) => {
    isTempFileDragging.value = false

    // 如果真的拖拽了且有文件，检查是否在上传区域
    if (wasDragging && files.value.length > 0) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      const uploadZone = elements.find(el => el.hasAttribute('data-upload-zone'))
      if (uploadZone) {
        const event = new CustomEvent('temp-folder-drop', {
          detail: { files: files.value.map(f => ({ name: f.name, src: f.src })) },
          bubbles: true,
        })
        uploadZone.dispatchEvent(event)
      }
    }

    // 延迟重置拖拽状态，确保 click 事件触发时仍能检测到拖拽
    setTimeout(() => {
      isButtonDragging.value = false
    }, 50)
  },
})

function onButtonClick() {
  if (!isButtonDragging.value) {
    toggle()
  }
}

function handleSelect(file: TempFile) {
  emit('select', file)
}

// File drag handlers for UploadZone integration (single file from panel)
function handleFileDragStart(e: DragEvent, file: TempFile) {
  if (!e.dataTransfer)
    return
  e.dataTransfer.setData('application/x-temp-file', JSON.stringify({ id: file.id, name: file.name, src: file.src }))
  e.dataTransfer.effectAllowed = 'copy'
  isTempFileDragging.value = true
}

function handleFileDragEnd() {
  isTempFileDragging.value = false
}
</script>

<template>
  <Teleport to="body">
    <!-- Floating Button (always visible when closed) -->
    <div
      v-if="!isOpen"
      ref="buttonRef"
      select-none fixed z-1000
      :style="{ left: `${buttonPosition.x}px`, top: `${buttonPosition.y}px` }"
      :class="isButtonDragging ? 'cursor-grabbing' : 'cursor-grab'"
      @mousedown="startButtonDrag"
      @click="onButtonClick"
    >
      <button
        bg="emerald-500 hover:emerald-400"
        rounded-full flex h-12 w-12 pointer-events-none shadow-xl transition-all items-center justify-center relative
      >
        <div i-carbon-folder text-xl text-white />
        <span
          v-if="files.length > 0"
          text="[10px] white"
          font-bold rounded-full bg-red-500 flex h-5 w-5 items-center right-0 top-0 justify-center absolute
          border="2 white dark:zinc-900"
        >
          {{ files.length > TEMP_FOLDER_CONSTANTS.MAX_DISPLAY_COUNT ? `${TEMP_FOLDER_CONSTANTS.MAX_DISPLAY_COUNT}` : files.length }}
        </span>
      </button>
    </div>

    <!-- Panel (when open) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 scale-95"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        ref="panelRef"
        rounded-xl w-80 shadow-2xl fixed z-1000 overflow-hidden
        bg="white dark:zinc-900"
        border="1 zinc-200 dark:zinc-800"
        :style="{ left: `${panelPosition.x}px`, top: `${panelPosition.y}px` }"
        :class="{ 'cursor-grabbing': isPanelDragging, 'cursor-grab': !isPanelDragging }"
        @mousedown="startPanelDrag"
      >
        <!-- Header -->
        <div
          px-4 py-3 flex items-center justify-between
          bg="zinc-50 dark:zinc-800/50"
          border-b="1 zinc-200 dark:zinc-800"
        >
          <div flex gap-2 items-center>
            <span i-carbon-folder text-emerald-500 />
            <span text-sm text-zinc-900 font-bold dark:text-zinc-100>临时文件夹</span>
            <span
              v-if="files.length > 0"
              text="[10px]"
              bg="emerald-500/10" text-emerald-500 font-bold px-1.5 py-0.5 rounded-full
            >
              {{ files.length }}
            </span>
          </div>
          <div flex gap-1>
            <button
              v-if="files.length > 0"
              text="[10px] red-500" font-medium px-2 py-1 rounded transition-colors hover:bg="red-500/10"
              @click.stop="clearAll"
            >
              清空
            </button>
            <button
              hover:bg="zinc-200 dark:zinc-700" text-zinc-400 p-1.5 rounded-md transition-colors hover:text-zinc-600
              @click.stop="close"
            >
              <div i-carbon-close />
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="custom-scrollbar no-drag" p-3 max-h-80 overflow-y-auto>
          <div v-if="files.length === 0" py-8 flex flex-col gap-2 items-center justify-center>
            <span i-carbon-folder-off text-3xl text-zinc-300 dark:text-zinc-600 />
            <p text-xs text-zinc-400>
              暂无文件
            </p>
            <p text="[10px] zinc-400">
              处理后的图片会显示在这里
            </p>
          </div>

          <div v-else gap-2 grid grid-cols-3>
            <div
              v-for="file in files"
              :key="file.id"
              draggable="true"
              group rounded-lg cursor-grab transition-all relative overflow-hidden
              border="1 zinc-200 dark:zinc-700 hover:emerald-500"
              @click.stop="handleSelect(file)"
              @dragstart="handleFileDragStart($event, file)"
              @dragend="handleFileDragEnd"
            >
              <img :src="file.src" pointer-events-none class="bg-checkered w-full aspect-square object-cover">

              <!-- Overlay -->
              <div
                opacity-0 flex flex-col transition-opacity inset-0 absolute group-hover:opacity-100
                bg="zinc-900/70"
              >
                <div flex flex-1 items-center justify-center>
                  <span i-carbon-drag-horizontal text-2xl text-white />
                </div>
                <div px-1.5 py-1 bg="black/50">
                  <p text="[8px] white" truncate>
                    {{ file.name }}
                  </p>
                </div>
              </div>

              <!-- Delete button -->
              <button
                p-0.5 rounded-full opacity-0 transition-opacity right-1 top-1 absolute group-hover:opacity-100
                bg="white/90 dark:zinc-800/90"
                @click.stop="removeFile(file.id)"
              >
                <span i-carbon-close text="[10px] zinc-500 hover:red-500" />
              </button>

              <!-- Source badge -->
              <div
                text="[8px] white" font-bold px-1 py-0.5 rounded left-1 top-1 absolute
                :class="file.source === 'split' ? 'bg-amber-500' : 'bg-emerald-500'"
              >
                {{ file.source === 'split' ? '切' : '处' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Footer hint -->
        <div
          px-3 py-2 text="[10px] zinc-400" text-center
          border-t="1 zinc-100 dark:zinc-800"
          bg="zinc-50/50 dark:zinc-800/30"
        >
          点击图片可使用 · 拖动标题栏移动面板
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
