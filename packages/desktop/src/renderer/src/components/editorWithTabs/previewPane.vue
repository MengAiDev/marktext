<template>
  <div
    ref="previewContainer"
    class="preview-pane"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { MarkdownToHtml } from '@muyajs/core'
import { usePreferencesStore } from '@/store/preferences'
import { storeToRefs } from 'pinia'
import { isDarkThemeId } from 'common/theme'
import githubMarkdownLightCss from 'github-markdown-css/github-markdown-light.css?inline'
import githubMarkdownDarkCss from 'github-markdown-css/github-markdown-dark.css?inline'
import katexCss from 'katex/dist/katex.css?inline'
import prismCss from 'prismjs/themes/prism.css?inline'
import prismDarkCss from 'prismjs/themes/prism-tomorrow.css?inline'

const props = defineProps<{
  markdown: string
}>()

const preferencesStore = usePreferencesStore()
const { theme } = storeToRefs(preferencesStore)

const previewContainer = ref<HTMLDivElement | null>(null)
let shadowRoot: ShadowRoot | null = null
let renderTimer: ReturnType<typeof setTimeout> | null = null

const buildStyles = (): string => {
  const dark = isDarkThemeId(theme.value)
  const markdownCss = dark ? githubMarkdownDarkCss : githubMarkdownLightCss
  const codeTheme = dark ? prismDarkCss : prismCss
  const bgColor = dark ? '#0d1117' : '#ffffff'
  return `
    <style>${markdownCss}</style>
    <style>${katexCss}</style>
    <style>${codeTheme}</style>
    <style>
      :host {
        display: block;
        height: 100%;
        overflow: auto;
        background: ${bgColor};
      }
      .markdown-body {
        box-sizing: border-box;
        min-width: 200px;
        max-width: 980px;
        margin: 0 auto;
        padding: 40px 24px 100px;
        background: transparent;
      }
      .markdown-body pre {
        white-space: pre-wrap;
        word-break: break-word;
      }
      .markdown-body img {
        max-width: 100%;
      }
    </style>
  `
}

const renderPreview = async (): Promise<void> => {
  if (!shadowRoot) return
  try {
    const html = await new MarkdownToHtml(props.markdown).renderHtml()
    shadowRoot.innerHTML = buildStyles() + html
  } catch (e) {
    console.error('[preview-pane] render error:', e)
  }
}

const debouncedRender = (): void => {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(renderPreview, 250)
}

watch(() => props.markdown, debouncedRender)
watch(theme, debouncedRender)

onMounted(() => {
  if (previewContainer.value) {
    shadowRoot = previewContainer.value.attachShadow({ mode: 'open' })
    renderPreview()
  }
})

onBeforeUnmount(() => {
  if (renderTimer) clearTimeout(renderTimer)
  shadowRoot = null
})
</script>

<style scoped>
.preview-pane {
  height: 100%;
  overflow: hidden;
  border-left: 1px solid var(--floatHoverColor);
  background: var(--editorBgColor);
}
</style>
