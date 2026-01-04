<script setup lang="ts">
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
    target.value = ''
  }
}
</script>

<template>
  <div
    border="1 dashed zinc-800"
    bg="zinc-900/50" hover:border="emerald-500/50" group rounded-xl flex flex-col gap-3 h-40 w-full cursor-pointer transition-all items-center justify-center relative overflow-hidden hover:bg-zinc-900
    :class="{ '!border-emerald-500 !bg-emerald-500/5': isDragging }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleClick"
  >
    <div
      border="1 zinc-700"
      rounded-xl bg-zinc-800 flex h-12 w-12 transition-transform items-center justify-center group-hover="scale-110 bg-zinc-700"
    >
      <span i-carbon-cloud-upload text-2xl text-zinc-400 group-hover:text-emerald-400 />
    </div>

    <div text-center>
      <p text="[11px] zinc-300" tracking-widest font-bold uppercase>
        导入素材
      </p>
      <p mt-1 text="[10px] zinc-500">
        拖拽图片至此或点击浏览
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
