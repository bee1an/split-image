<script setup lang="ts">
import { useTempFolder } from '../composables/tempFolder'

const props = withDefaults(defineProps<{
  multiple?: boolean
}>(), {
  multiple: true,
})

const emit = defineEmits<{
  upload: [files: File[]]
}>()

const { isDragging: isTempFileDragging } = useTempFolder()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false

  // Check if it's a temp folder drop (all files)
  const tempFolderData = e.dataTransfer?.getData('application/x-temp-folder')
  if (tempFolderData) {
    try {
      const allFiles = JSON.parse(tempFolderData) as { name: string, src: string }[]
      const files = await Promise.all(
        allFiles.map(async ({ name, src }) => {
          const res = await fetch(src)
          const blob = await res.blob()
          return new File([blob], `${name}.png`, { type: blob.type })
        }),
      )
      if (props.multiple) {
        emit('upload', files)
      }
      else if (files.length > 0) {
        emit('upload', [files[0]])
      }
      return
    }
    catch (err) {
      console.error('Failed to process temp folder:', err)
    }
  }

  // Check if it's a single temp file drop
  const tempFileData = e.dataTransfer?.getData('application/x-temp-file')
  if (tempFileData) {
    try {
      const { name, src } = JSON.parse(tempFileData)
      const res = await fetch(src)
      const blob = await res.blob()
      const file = new File([blob], `${name}.png`, { type: blob.type })
      emit('upload', [file])
      return
    }
    catch (err) {
      console.error('Failed to process temp file:', err)
    }
  }

  // Normal file drop
  let files = Array.from(e.dataTransfer?.files || []).filter(file => file.type.startsWith('image/'))
  if (!props.multiple && files.length > 0) {
    files = [files[0]]
  }
  if (files.length > 0) {
    emit('upload', files)
  }
}

function handleClick() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  let files = Array.from(target.files || [])
  if (!props.multiple && files.length > 0) {
    files = [files[0]]
  }
  if (files.length > 0) {
    emit('upload', files)
    target.value = ''
  }
}

// Handle temp folder drop (custom event from TempFolderPanel)
const uploadZoneRef = ref<HTMLDivElement>()

async function handleTempFolderDrop(e: Event) {
  const customEvent = e as CustomEvent<{ files: { name: string, src: string }[] }>
  const tempFiles = customEvent.detail.files

  const files = await Promise.all(
    tempFiles.map(async ({ name, src }) => {
      const res = await fetch(src)
      const blob = await res.blob()
      return new File([blob], `${name}.png`, { type: blob.type })
    }),
  )

  if (props.multiple) {
    emit('upload', files)
  }
  else if (files.length > 0) {
    emit('upload', [files[0]])
  }
}

onMounted(() => {
  uploadZoneRef.value?.addEventListener('temp-folder-drop', handleTempFolderDrop)
})

onUnmounted(() => {
  uploadZoneRef.value?.removeEventListener('temp-folder-drop', handleTempFolderDrop)
})
</script>

<template>
  <div
    ref="uploadZoneRef"
    data-upload-zone
    border="1 dashed zinc-300 dark:zinc-800 hover:emerald-500/50"
    bg="zinc-50 dark:zinc-900/50" group rounded-xl flex flex-col gap-3 h-40 w-full cursor-pointer transition-all items-center justify-center relative overflow-hidden hover:bg-zinc-100 dark:hover:bg-zinc-900
    :class="{
      '!border-emerald-500 !bg-emerald-500/5': isDragging,
      '!border-amber-500 !bg-amber-500/5 animate-pulse': isTempFileDragging,
    }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleClick"
  >
    <div
      border="1 zinc-200 dark:zinc-700"
      rounded-xl bg-white flex h-12 w-12 transition-transform items-center justify-center dark:bg-zinc-800 group-hover="scale-110 bg-zinc-50 dark:bg-zinc-700"
    >
      <span i-carbon-cloud-upload text-2xl text-zinc-400 dark:text-zinc-400 group-hover:text-emerald-400 />
    </div>

    <div text-center>
      <p text="[11px] zinc-900 dark:zinc-300" tracking-widest font-bold uppercase>
        导入素材
      </p>
      <p mt-1 text="[10px] zinc-500">
        {{ multiple ? '拖拽图片至此或点击浏览' : '拖拽或点击选择一张图片' }}
      </p>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      :multiple="multiple"
      hidden
      @change="handleFileChange"
    >
  </div>
</template>
