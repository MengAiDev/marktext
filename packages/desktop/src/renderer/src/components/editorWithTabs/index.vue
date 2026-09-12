<template>
  <div
    class="editor-with-tabs"
    :style="{ 'max-width': `calc(100vw - ${effectiveSideBarWidth}px)` }"
  >
    <tabs v-show="showTabBar" />
    <div class="container">
      <editor
        :markdown="markdown"
        :cursor="cursor"
        :text-direction="textDirection"
        :platform="platform"
      />
      <div
        v-if="preview"
        ref="splitRef"
        class="preview-split"
      >
        <div
          class="source-pane"
          :style="{ flexBasis: leftPercent + '%' }"
        >
          <source-code
            :markdown="markdown"
            :muya-index-cursor="muyaIndexCursor"
            :text-direction="textDirection"
          />
        </div>
        <div
          class="preview-splitter"
          title="Drag to resize"
          @mousedown.prevent="onSplitterMouseDown"
        />
        <preview-pane :markdown="markdown" />
      </div>
      <source-code
        v-else-if="sourceCode"
        :markdown="markdown"
        :muya-index-cursor="muyaIndexCursor"
        :text-direction="textDirection"
      />
    </div>
    <tab-notifications />
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useLayoutStore } from '@/store/layout'
import { storeToRefs } from 'pinia'
import Tabs from './tabs.vue'
import Editor from './editor.vue'
import SourceCode from './sourceCode.vue'
import PreviewPane from './previewPane.vue'
import TabNotifications from './notifications.vue'

defineProps<{
  markdown: string
  // `cursor` originates as `IFileState.cursor` which is `unknown`
  // (see src/shared/types/files.ts); align here instead of forcing every
  // caller to widen.
  cursor: unknown
  muyaIndexCursor?: unknown
  sourceCode: boolean
  preview: boolean
  showTabBar: boolean
  textDirection: string
  platform: string
}>()

const { effectiveSideBarWidth } = storeToRefs(useLayoutStore())

// Draggable splitter between the source editor and the live preview. The left
// (source) pane width is expressed as a percentage of the split container and
// clamped so neither pane collapses to unusable.
const splitRef = ref<HTMLElement | null>(null)
const leftPercent = ref(50)
const MIN_PCT = 20
const MAX_PCT = 80

let dragging = false

const onDrag = (event: MouseEvent): void => {
  if (!dragging || !splitRef.value) return
  const rect = splitRef.value.getBoundingClientRect()
  const pct = ((event.clientX - rect.left) / rect.width) * 100
  leftPercent.value = Math.min(MAX_PCT, Math.max(MIN_PCT, pct))
}

const stopDrag = (): void => {
  if (!dragging) return
  dragging = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  document.body.classList.remove('preview-dragging')
}

const onSplitterMouseDown = (event: MouseEvent): void => {
  event.preventDefault()
  dragging = true
  document.body.classList.add('preview-dragging')
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  document.body.classList.remove('preview-dragging')
})
</script>

<style scoped>
.editor-with-tabs {
  position: relative;
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;

  overflow: hidden;
  background: var(--editorBgColor);
  & > .container {
    flex: 1;
    overflow: hidden;
  }
  & > .container > .preview-split {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    overflow: hidden;
    /* The source pane sizes to `leftPercent` (inline flex-basis); the preview
       pane flexes to fill the remainder. */
    & > .source-pane {
      flex: 0 0 auto;
      min-width: 0;
      height: 100%;
    }
    & > :deep(.source-code) {
      height: 100%;
    }
    & > .preview-splitter {
      flex: 0 0 5px;
      cursor: col-resize;
      background: var(--editorColor50, #e6e6e6);
      &:hover,
      &:active {
        background: var(--editorColor, #c8c8c8);
      }
    }
  }
}
</style>

<style>
/* While dragging the splitter, suppress text selection / I-beam over the
   panes. Body-level (not scoped) so it also covers CodeMirror. */
body.preview-dragging,
body.preview-dragging * {
  cursor: col-resize !important;
  user-select: none !important;
}
</style>
