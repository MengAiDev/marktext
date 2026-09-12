<template>
  <div class="markdown-preview-pane">
    <iframe
      ref="frameRef"
      class="preview-frame"
      title="Markdown preview"
      sandbox="allow-same-origin"
    />
  </div>
</template>

<script setup lang="ts">
// Live-rendered HTML preview pane used by the split "preview mode".
//
// The pane renders the current markdown through the @muyajs/core
// `MarkdownToHtml` engine (the same path the styled-HTML / PDF export uses),
// which produces a self-contained document with github-markdown-css, KaTeX
// and Prism styles inlined. Dropping that document into an <iframe> srcdoc
// keeps the preview styling isolated from the app chrome — mirroring how the
// VSCode markdown extension renders its preview.
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { MarkdownToHtml } from '@muyajs/core'
import { usePreferencesStore } from '@/store/preferences'

const props = defineProps<{
  markdown: string
}>()

const preferencesStore = usePreferencesStore()
const frameRef = ref<HTMLIFrameElement | null>(null)

// Debounce re-renders while typing: `MarkdownToHtml.generate` re-runs the full
// marked + diagram pipeline and re-inline the stylesheet every call, so we
// coalesce rapid keystrokes. `renderToken` drops stale async results after a
// newer render has been scheduled.
const RENDER_DEBOUNCE_MS = 250
let renderTimer: ReturnType<typeof setTimeout> | null = null
let renderToken = 0
let disposed = false

const EMPTY_DOC =
  '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;color:#9a9a9a;"></body></html>'

const render = async (md: string): Promise<void> => {
  const token = ++renderToken
  try {
    const doc = await new MarkdownToHtml(md).generate({
      dir: preferencesStore.textDirection
    })
    if (disposed || token !== renderToken) return
    const frame = frameRef.value
    if (frame) frame.srcdoc = doc
  } catch (err) {
    if (disposed || token !== renderToken) return
    console.error('Preview render failed:', err)
    const frame = frameRef.value
    if (frame) frame.srcdoc = EMPTY_DOC
  }
}

const scheduleRender = (md: string): void => {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(() => {
    render(md)
  }, RENDER_DEBOUNCE_MS)
}

onMounted(() => {
  render(props.markdown ?? '')
})

watch(
  () => props.markdown,
  (md) => {
    scheduleRender(md ?? '')
  }
)

onBeforeUnmount(() => {
  disposed = true
  if (renderTimer) clearTimeout(renderTimer)
})
</script>

<style scoped>
.markdown-preview-pane {
  flex: 1;
  min-width: 0;
  height: 100%;
  box-sizing: border-box;
  border-left: 1px solid var(--editorColor50, #e6e6e6);
  background: #fff;
  overflow: hidden;
}
.preview-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}
</style>
