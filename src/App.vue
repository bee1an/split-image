<template>
  <div
    bg="slate-950"
    text="zinc-100"
    flex flex-col min-h-screen
    selection="bg-emerald-500/30"
  >
    <RouterView />
  </div>
</template>

<style>
:root {
  color-scheme: dark;
}

body {
  margin: 0;
  overflow: hidden;
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
