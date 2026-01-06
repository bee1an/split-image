<script setup lang="ts">
import NotificationToasts from './components/NotificationToasts.vue'
import TempFolderPanel from './components/TempFolderPanel.vue'
import { toggleDark } from './composables/dark'
</script>

<template>
  <div
    bg="white dark:slate-950"
    text="zinc-900 dark:zinc-100"
    flex h-screen overflow-hidden
    selection="bg-emerald-500/30"
  >
    <!-- Main Content -->
    <main flex-1 min-w-0>
      <RouterView />
    </main>

    <!-- Navigation Rail -->
    <nav border-l="zinc-200 dark:zinc-800" py-4 bg-white flex flex-col gap-4 w-16 shadow-lg shadow-zinc-200 items-center dark:bg-zinc-900 dark:shadow-none>
      <RouterLink
        v-slot="{ isActive }"
        to="/"
        title="切片工具"
      >
        <div
          p-3 rounded-xl transition-all
          :bg="isActive ? 'emerald-500/10' : undefined"
          :text="isActive ? 'emerald-500' : 'zinc-400'"
          :hover="isActive ? undefined : 'bg-zinc-200 dark:bg-zinc-800'"
        >
          <div i-carbon-cut text-xl />
        </div>
      </RouterLink>

      <RouterLink
        v-slot="{ isActive }"
        to="/process"
        title="后期处理"
      >
        <div
          p-3 rounded-xl transition-all
          :bg="isActive ? 'emerald-500/10' : undefined"
          :text="isActive ? 'emerald-500' : 'zinc-400'"
          :hover="isActive ? undefined : 'bg-zinc-200 dark:bg-zinc-800'"
        >
          <div i-carbon-image-search text-xl />
        </div>
      </RouterLink>

      <div mt-auto flex flex-col gap-4 items-center>
        <button
          text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200
          title="切换主题"
          @click="toggleDark()"
        >
          <div i-carbon-sun dark:i-carbon-moon text-xl />
        </button>
        <a
          href="https://github.com/bee1an/split-image"
          target="_blank"
          text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200
        >
          <div i-carbon-logo-github text-xl />
        </a>
      </div>
    </nav>
  </div>

  <!-- Temp Folder Panel -->
  <TempFolderPanel />

  <!-- Notifications -->
  <NotificationToasts />
</template>
