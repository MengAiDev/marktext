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
// coalesce rapid keystrokes. `renderToken` drops stale async results as soon as
// the source changes, before the debounced re-render even starts.
const RENDER_DEBOUNCE_MS = 250
let renderTimer: ReturnType<typeof setTimeout> | null = null
let renderToken = 0
let disposed = false
// Load handler installed by the last `srcdoc` swap. It must be detached before
// the next swap, otherwise scroll restores from older documents fire against
// newer content.
let srcdocLoadHandler: (() => void) | null = null

const EMPTY_DOC =
  '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;color:#9a9a9a;"></body></html>'

// Cancel the queued render and invalidate any async render still in flight.
// The token is bumped synchronously so a previous document can never paint
// over the content that is being displayed now.
const invalidateRender = (): void => {
  if (renderTimer) {
    clearTimeout(renderTimer)
    renderTimer = null
  }
  ++renderToken
}

const render = async (md: string): Promise<void> => {
  const token = ++renderToken
  try {
    const doc = await new MarkdownToHtml(md).generate({
      dir: preferencesStore.textDirection
    })
    if (disposed || token !== renderToken) return
    const frame = frameRef.value
    if (frame) applySrcdoc(frame, doc)
  } catch (err) {
    if (disposed || token !== renderToken) return
    console.error('Preview render failed:', err)
    const frame = frameRef.value
    if (frame) applySrcdoc(frame, EMPTY_DOC)
  }
}

// Rewriting `srcdoc` replaces the iframe document, which always resets the
// scroll position to the top. To keep the reader anchored where they were,
// snapshot the current scrollY right before the swap, then restore it once the
// new document has finished loading. The iframe is `allow-same-origin`, so
// `contentWindow` is reachable without `allow-scripts`.
const applySrcdoc = (frame: HTMLIFrameElement, doc: string): void => {
  if (srcdocLoadHandler) {
    frame.removeEventListener('load', srcdocLoadHandler)
    srcdocLoadHandler = null
  }

  const win = frame.contentWindow
  const scrollTop = win ? win.scrollY : 0

  const onLoad = (): void => {
    frame.removeEventListener('load', onLoad)
    if (srcdocLoadHandler === onLoad) srcdocLoadHandler = null
    const restored = frame.contentWindow
    if (restored) restored.scrollTo(0, scrollTop)
  }
  srcdocLoadHandler = onLoad
  frame.addEventListener('load', onLoad)

  frame.srcdoc = doc
}

const scheduleRender = (md: string): void => {
  invalidateRender()
  renderTimer = setTimeout(() => {
    renderTimer = null
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
  invalidateRender()
  const frame = frameRef.value
  if (frame && srcdocLoadHandler) {
    frame.removeEventListener('load', srcdocLoadHandler)
    srcdocLoadHandler = null
  }
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
