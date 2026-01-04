<script setup lang="ts">
import type { SplitLine } from '../utils/splitImage'
import ImageCanvas from '../components/ImageCanvas.vue'
import { generateId } from '../utils/common'
import { downloadAsZip } from '../utils/downloadZip'
import { splitImage } from '../utils/splitImage'

const imageSrc = ref<string>('')
const splitLines = ref<SplitLine[]>([])
const isExporting = ref(false)
const canvasRef = ref<InstanceType<typeof ImageCanvas>>()

const quickHLines = ref(0)
const quickVLines = ref(0)

function handleUpload(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    imageSrc.value = e.target?.result as string
    splitLines.value = []
    quickHLines.value = 0
    quickVLines.value = 0
  }
  reader.readAsDataURL(file)
}

async function handleExport() {
  const image = canvasRef.value?.getImage()
  if (!image || !imageSrc.value)
    return

  isExporting.value = true
  try {
    const blobs = await splitImage(image, splitLines.value)
    await downloadAsZip(blobs, 'image', splitLines.value)
  }
  catch (error) {
    console.error('导出失败:', error)
  }
  finally {
    isExporting.value = false
  }
}

function handleClear() {
  imageSrc.value = ''
  splitLines.value = []
  quickHLines.value = 0
  quickVLines.value = 0
}

function applyQuickSplit() {
  const newLines: SplitLine[] = []
  const hCount = Math.max(0, Math.min(20, quickHLines.value))
  for (let i = 1; i <= hCount; i++) {
    const position = (i / (hCount + 1)) * 100
    newLines.push({ id: generateId(), type: 'h', position })
  }
  const vCount = Math.max(0, Math.min(20, quickVLines.value))
  for (let i = 1; i <= vCount; i++) {
    const position = (i / (vCount + 1)) * 100
    newLines.push({ id: generateId(), type: 'v', position })
  }
  splitLines.value = newLines
}

const hLineCount = computed(() => splitLines.value.filter(l => l.type === 'h').length)
const vLineCount = computed(() => splitLines.value.filter(l => l.type === 'v').length)
const pieceCount = computed(() => (hLineCount.value + 1) * (vLineCount.value + 1))

function removeLine(id: string) {
  splitLines.value = splitLines.value.filter(l => l.id !== id)
}
</script>

<template>
  <div bg="[#09090b]" flex flex-col h-screen overflow-hidden>
    <div flex flex-1 overflow-hidden>
      <main flex flex-1 flex-col relative bg="[#0c0c0e]">
        <!-- <div inset-0 absolute z-0 opacity="[0.03]" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 24px 24px;" /> -->

        <div v-if="!imageSrc" p-12 flex h-full items-center justify-center relative z-10>
          <div text-center flex flex-col max-w-sm items-center>
            <div rounded="[2.5rem]" mb-6 bg-zinc-900 flex h-24 w-24 shadow-2xl items-center justify-center border="1 zinc-800/50">
              <span i-carbon-image text-5xl text-zinc-700 />
            </div>
            <h2 text-xl text-zinc-100 font-bold mb-2>
              工作区为空
            </h2>
            <p text-sm text-zinc-500>
              从左侧侧边栏导入素材。然后你可以从图片边缘向内拖拽，精准创建切片分界线。
            </p>
          </div>
        </div>

        <div v-else p-8 flex flex-col h-full relative z-10 overflow-hidden>
          <div mb-4 flex items-center>
            <div flex gap-3 items-center>
              <div text="[9px]" text-zinc-400 font-bold px-2 py-1 rounded bg-zinc-900 flex gap-1.5 items-center border="1 zinc-800">
                <span px-1 rounded bg-zinc-800 border="1 zinc-700">←↑→↓</span> 移动
              </div>
              <div text="[9px]" text-zinc-400 font-bold px-2 py-1 rounded bg-zinc-900 flex gap-1.5 items-center border="1 zinc-800">
                <span border="1 zinc-700" tracking-tighter px-1 rounded bg-zinc-800>Del</span> 删除
              </div>
            </div>
          </div>

          <div bg="zinc-950/50" border="1 zinc-800" rounded-2xl flex-1 min-h-0 shadow-inner overflow-hidden>
            <ImageCanvas
              ref="canvasRef"
              v-model:lines="splitLines"
              :image-src="imageSrc"
            />
          </div>
        </div>
      </main>

      <aside border-r="zinc-800" bg-zinc-950 flex flex-col w-64>
        <div custom-scrollbar p-4 flex flex-1 flex-col gap-6 overflow-y-auto>
          <section>
            <h3 text="[10px]" text-zinc-500 tracking-wider font-bold mb-3 uppercase>
              原始图片
            </h3>
            <UploadZone v-if="!imageSrc" @upload="handleUpload" />
            <div v-else border="1 zinc-800" group rounded-lg bg-zinc-900 aspect-video relative overflow-hidden>
              <img :src="imageSrc" opacity-50 h-full w-full transition-opacity object-cover group-hover="opacity-30">
              <div opacity-0 flex transition-opacity items-center inset-0 justify-center absolute group-hover="opacity-100">
                <button
                  text-xs text-zinc-900 font-semibold px-3 py-1.5 rounded-md bg-zinc-100 shadow-xl transition-transform active:scale-95
                  @click="handleClear"
                >
                  更换图片
                </button>
              </div>
            </div>
          </section>

          <template v-if="imageSrc">
            <section border="1 zinc-800" bg="zinc-900/50" p-4 rounded-xl>
              <h3 text="[10px]" text-zinc-500 tracking-wider font-bold mb-4 uppercase>
                自动网格
              </h3>
              <div space-y-4>
                <div gap-3 grid grid-cols-2>
                  <div space-y-1.5>
                    <label text="[10px] zinc-400">横向数量</label>
                    <input
                      v-model.number="quickHLines"
                      type="number"
                      border="1 zinc-700" text-xs text-zinc-100 px-2 py-1.5 outline-none rounded-md bg-zinc-800 w-full transition-colors focus:border-emerald-500
                    >
                  </div>
                  <div space-y-1.5>
                    <label text="[10px] zinc-400">纵向数量</label>
                    <input
                      v-model.number="quickVLines"
                      type="number"
                      border="1 zinc-700" text-xs text-zinc-100 px-2 py-1.5 outline-none rounded-md bg-zinc-800 w-full transition-colors focus:border-emerald-500
                    >
                  </div>
                </div>
                <button
                  text-xs text-zinc-950 font-bold py-2 rounded-md bg-zinc-100 w-full cursor-pointer shadow-lg transition-all hover:bg-white active:scale-95
                  @click="applyQuickSplit"
                >
                  生成网格
                </button>
              </div>
            </section>

            <section flex flex-1 flex-col min-h-0>
              <h3 text="[10px]" text-zinc-500 tracking-wider font-bold mb-3 uppercase>
                切片点 ({{ splitLines.length }})
              </h3>
              <div v-if="splitLines.length === 0" border="1 dashed zinc-800" py-8 rounded-lg flex flex-1 items-center justify-center>
                <p text-xs text-zinc-600>
                  尚未添加分界线
                </p>
              </div>
              <div v-else custom-scrollbar pr-2 flex-1 overflow-y-auto space-y-1>
                <div
                  v-for="line in [...splitLines].sort((a, b) => a.position - b.position)"
                  :key="line.id"
                  border="1 transparent" bg="zinc-900/50" group px-2 py-1.5 rounded-md flex transition-colors items-center justify-between hover:border-zinc-700 hover:bg-zinc-800
                >
                  <div flex gap-2 items-center>
                    <span
                      rounded-full h-1.5 w-1.5
                      :class="line.type === 'h' ? 'bg-amber-500' : 'bg-emerald-500'"
                    />
                    <span text="[11px] zinc-300" font-medium>
                      {{ line.type === 'h' ? '横向' : '纵向' }} @ {{ Math.round(line.position) }}%
                    </span>
                  </div>
                  <button
                    group-hover="opacity-100" text-zinc-500 opacity-0 transition-opacity hover:text-red-400
                    @click="removeLine(line.id)"
                  >
                    <span i-carbon-close text-sm />
                  </button>
                </div>
              </div>
            </section>
          </template>
        </div>

        <div v-if="imageSrc" border-t="zinc-800" p-4 bg-zinc-950 shadow-2xl>
          <div mb-4 p-3 rounded-lg bg-zinc-900 flex items-center justify-between>
            <div flex flex-col>
              <span text="[10px] zinc-500" font-bold uppercase>输出预览</span>
              <span text-sm text-zinc-100 font-bold>{{ pieceCount }} 张切片</span>
            </div>
            <div text-emerald-400 p-1.5 rounded-full bg-zinc-800 h-8 w-8>
              <span i-carbon-grid text-xl />
            </div>
          </div>
          <button
            shadow="xl emerald-500/10" hover:shadow="indigo-500/20" active:scale="[0.98]"
            group py-4 rounded-xl bg-emerald-600 flex gap-2 w-full cursor-pointer transition-all items-center justify-center relative overflow-hidden hover:bg-emerald-500 disabled:opacity-50
            :disabled="isExporting || splitLines.length === 0"
            @click="handleExport"
          >
            <span v-if="isExporting" i-carbon-rotate-360 text-xl animate-spin />
            <span v-else i-carbon-zip text-xl />
            <span text-white tracking-tight font-bold>打包下载 ZIP</span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
</style>
