<script setup lang="ts">
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
      <div mb-4 rounded-xl bg-emerald-600 flex h-10 w-10 shadow="lg emerald-500/20" items-center justify-center>
        <div i-carbon-grid text-xl text-white />
      </div>

      <RouterLink
        v-slot="{ isActive }"
        to="/"
        class="nav-item"
        title="切片工具"
      >
        <div
          :class="isActive ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'"
          p-3 rounded-xl transition-all
        >
          <div i-carbon-cut text-xl />
        </div>
      </RouterLink>

      <RouterLink
        v-slot="{ isActive }"
        to="/prepare"
        class="nav-item"
        title="后期处理"
      >
        <div
          :class="isActive ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'"
          p-3 rounded-xl transition-all
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
</template>

<style>
:root {
  color-scheme: light dark;
}

body {
  margin: 0;
  overflow: hidden;
  background: white;
}

html.dark body {
  background: #09090b;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Custom scrollbar for pro look */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
</style>
