<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  upload: [file: File]
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    emit('upload', file)
  }
}

function handleClick() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    emit('upload', file)
    // Reset input to allow re-uploading the same file
    target.value = ''
  }
}
</script>

<template>
  <div
    border="2 dashed"
    group rounded-2xl flex flex-col gap-3 min-h-48 w-full cursor-pointer transition-all duration-300 items-center justify-center relative overflow-hidden
    :class="isDragging
      ? 'border-violet-400 bg-violet-500/10'
      : 'border-slate-600 bg-slate-800/30 hover:border-violet-500/50 hover:bg-slate-800/50'"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleClick"
  >
    <!-- Glow effect -->
    <div
      bg="gradient-to-br from-violet-500/5 to-fuchsia-500/5"
      opacity-0 transition-opacity duration-500 inset-0 absolute group-hover:opacity-100
    />

    <!-- Icon -->
    <div
      bg="gradient-to-br from-violet-500/20 to-fuchsia-500/20"
      border="1 violet-500/30"
      text-3xl rounded-2xl flex h-16 w-16 transition-transform duration-300 items-center justify-center relative group-hover:scale-110
    >
      📁
    </div>

    <!-- Text -->
    <div text-center relative>
      <p text-lg text-slate-300 transition-colors group-hover:text-white>
        Drop image here
      </p>
      <p text-sm text-slate-500>
        or click to browse
      </p>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      hidden
      @change="handleFileChange"
    >
  </div>
</template>
