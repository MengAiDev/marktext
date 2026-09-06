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
        :source-code="editorHidden"
      />
      <div
        v-if="previewMode"
        class="preview-split"
      >
        <div
          class="split-pane split-source"
          :style="{ width: splitRatio + '%' }"
        >
          <source-code
            :markdown="markdown"
            :muya-index-cursor="muyaIndexCursor"
            :text-direction="textDirection"
          />
        </div>
        <div
          class="split-divider"
          @mousedown="startDrag"
        />
        <div class="split-pane split-preview">
          <preview-pane :markdown="markdown" />
        </div>
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
import { ref, computed, onBeforeUnmount } from 'vue'
import { useLayoutStore } from '@/store/layout'
import { storeToRefs } from 'pinia'
import Tabs from './tabs.vue'
import Editor from './editor.vue'
import SourceCode from './sourceCode.vue'
import PreviewPane from './previewPane.vue'
import TabNotifications from './notifications.vue'

const props = defineProps<{
  markdown: string
  // `cursor` originates as `IFileState.cursor` which is `unknown`
  // (see src/shared/types/files.ts); align here instead of forcing every
  // caller to widen.
  cursor: unknown
  muyaIndexCursor?: unknown
  sourceCode: boolean
  previewMode: boolean
  showTabBar: boolean
  textDirection: string
  platform: string
}>()

const { effectiveSideBarWidth } = storeToRefs(useLayoutStore())

// The WYSIWYG editor is hidden whenever either Source Code or Preview mode
// is active — both replace the editing surface with CodeMirror.
const editorHidden = computed(() => props.sourceCode || props.previewMode)

// Percentage of width allocated to the source-code pane in preview mode.
const splitRatio = ref(50)
const dragging = ref(false)

const startDrag = (e: MouseEvent): void => {
  e.preventDefault()
  dragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent): void => {
  if (!dragging.value) return
  const container = (e.currentTarget as HTMLElement)?.closest('.preview-split')
  if (!container) return
  const rect = container.getBoundingClientRect()
  const ratio = ((e.clientX - rect.left) / rect.width) * 100
  splitRatio.value = Math.min(85, Math.max(15, ratio))
}

const stopDrag = (): void => {
  dragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
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
    position: relative;
    /* The WYSIWYG editor uses z-index: -1 in source/preview mode to hide
       itself; without a background here it bleeds through the transparent
       CodeMirror pane once .container becomes the positioning ancestor. */
    background: var(--editorBgColor);
  }
}

.preview-split {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: row;
  z-index: 1;
}

.split-pane {
  height: 100%;
  overflow: hidden;
}

.split-source {
  flex-shrink: 0;
}

.split-preview {
  flex: 1;
  min-width: 0;
}

.split-divider {
  width: 5px;
  cursor: col-resize;
  flex-shrink: 0;
  background: transparent;
  transition: background 0.15s ease;
  &:hover {
    background: var(--floatHoverColor);
  }
}
</style>
