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
      bg="black/40"
      flex
      items-center
      inset-0
      justify-center
      fixed
      z="2000"
      role="dialog"
      aria-modal="true"
      @click.self="handleCancel"
    >
      <div
        p="5"
        border="1 zinc-200 dark:zinc-800"
        rounded="xl"
        bg="white dark:zinc-900"
        max-w="[90vw]"
        w="96"
        shadow="2xl"
      >
        <h3 text="base zinc-900 dark:zinc-100" font-bold>
          {{ props.title }}
        </h3>
        <p text="sm zinc-500 dark:zinc-400" mt="2">
          {{ props.description }}
        </p>
        <div mt="4" flex gap="2" justify-end>
          <button
            text="xs zinc-600 dark:zinc-300"
            font-bold
            px="3"
            py="1.5"
            border="1 zinc-200 dark:zinc-700"
            rounded="md"
            transition-colors
            hover="bg-zinc-100 dark:bg-zinc-800"
            @click="handleCancel"
          >
            {{ props.cancelText }}
          </button>
          <button
            text="xs white"
            font-bold
            px="3"
            py="1.5"
            rounded="md"
            transition-colors
            bg="red-500"
            hover="bg-red-400"
            @click="handleConfirm"
          >
            {{ props.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
