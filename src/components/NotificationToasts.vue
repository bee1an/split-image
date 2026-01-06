<script setup lang="ts">
import type { NotificationType } from '../utils/errorHandler'
import { useNotifications } from '../utils/errorHandler'

const { notifications } = useNotifications()

const typeClasses: Record<NotificationType, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  error: 'bg-red-500/10 text-red-600 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  info: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
}

const typeIcons: Record<NotificationType, string> = {
  success: 'i-carbon-checkmark',
  error: 'i-carbon-warning-alt',
  warning: 'i-carbon-warning',
  info: 'i-carbon-information',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="flex flex-col gap-2 w-80 right-4 top-4 fixed z-2000"
      aria-live="polite"
      aria-atomic="true"
    >
      <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2">
        <div
          v-for="(notification, index) in notifications"
          :key="index"
          class="px-3 py-2 border rounded-lg flex gap-2 shadow-lg items-start backdrop-blur"
          :class="typeClasses[notification.type]"
          role="status"
        >
          <span class="text-base" :class="typeIcons[notification.type]" />
          <p class="text-sm leading-snug font-medium">
            {{ notification.message }}
          </p>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
