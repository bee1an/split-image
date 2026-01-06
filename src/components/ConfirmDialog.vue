<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
}>(), {
  confirmText: '确认',
  cancelText: '取消',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="bg-black/40 flex items-center inset-0 justify-center fixed z-2000"
      role="dialog"
      aria-modal="true"
      @click.self="handleCancel"
    >
      <div
        class="p-5 border border-zinc-200 rounded-xl bg-white max-w-[90vw] w-96 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h3 class="text-base text-zinc-900 font-bold dark:text-zinc-100">
          {{ props.title }}
        </h3>
        <p class="text-sm text-zinc-500 mt-2 dark:text-zinc-400">
          {{ props.description }}
        </p>
        <div class="mt-4 flex gap-2 justify-end">
          <button
            class="text-xs text-zinc-600 font-bold px-3 py-1.5 border border-zinc-200 rounded-md transition-colors dark:text-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            @click="handleCancel"
          >
            {{ props.cancelText }}
          </button>
          <button
            class="text-xs text-white font-bold px-3 py-1.5 rounded-md bg-red-500 transition-colors hover:bg-red-400"
            @click="handleConfirm"
          >
            {{ props.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
