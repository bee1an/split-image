<template>
  <header
    bg="slate-800/50"
    border-b="1 slate-700/50"
    px-8 py-5 flex w-full items-center justify-between backdrop-blur-md
  >
    <div flex gap-4 items-center>
      <div
        bg="gradient-to-br from-violet-500 to-fuchsia-500"
        text-2xl rounded-xl flex h-12 w-12 items-center justify-center
        shadow="lg violet-500/20"
      >
        ✂️
      </div>
      <div>
        <h1 text-2xl text-white tracking-wide font-bold>
          Image Splitter
        </h1>
        <p text-sm text-slate-400>
          Drag from edges to split
        </p>
      </div>
    </div>

    <a
      href="https://github.com"
      target="_blank"
      i-carbon-logo-github text-xl text-slate-400 transition-colors hover:text-white
    />
  </header>
</template>
